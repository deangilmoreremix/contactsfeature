/**
 * AI contact-card enrichment. Old contract: { originalData, cardType, enhancements:{name,email,phone,company,sales?,support?,marketing?},
 * insights[], recommendations[], riskIndicators[], opportunityFlags[], engagement:{overallScore,emailEngagement,socialEngagement,
 * websiteEngagement,lastInteraction,interactionFrequency,preferredChannel}, lastUpdated }.
 * Only what the contact's own data (and its recent emails / activity) supports is filled; everything else is null / empty.
 */
const { recentEmails, recentTimeline } = require('./_ctx');
const { loadSubject, clampInt, asStrings } = require('./_scoringShared');

const TYPES = ['standard', 'comprehensive', 'sales', 'support', 'marketing'];
const S = (description) => ({ type: ['string', 'null'], description });
const I = (description) => ({ type: ['integer', 'null'], description });
const A = { type: 'array', items: { type: 'string' } };

module.exports = {
  id: 'contact-card-ai',
  role: 'fast',
  effort: 'low',
  maxOutputTokens: 2500,
  schema: {
    type: 'object',
    properties: {
      enhancements: {
        type: 'object',
        properties: {
          name: { type: 'object', properties: { displayName: S('properly formatted full name'), formality: S('formal | casual, from how the name is written') } },
          email: { type: 'object', properties: { isValid: { type: ['boolean', 'null'], description: 'syntactically valid' }, domain: S('email domain'), provider: S('Gmail, Outlook, company domain …') } },
          phone: { type: 'object', properties: { formatted: S('international format only if certain'), type: S('mobile | landline | voip, only if evident'), country: S('only if evident from the number') } },
          company: { type: 'object', properties: { formatted: S('company name cleaned up'), industry: S('industry if given or obvious from the name/domain, else null'), size: S('size band only if given, else null') } },
          sales: {
            type: 'object',
            properties: {
              leadScore: I('0-100'), buyingStage: S('awareness | consideration | decision | unknown'), budget: S('only if stated in the data'),
              timeline: S('only if stated in the data'), decisionMakers: A, competitors: A,
            },
          },
          support: {
            type: 'object',
            properties: { priority: S('low | medium | high'), escalationRisk: S('low | medium | high'), satisfactionRisk: S('low | medium | high'), expectedResolution: S('only if evidenced') },
          },
          marketing: {
            type: 'object',
            properties: { segments: A, interests: A, recommendedCampaigns: A, engagementLevel: S('low | medium | high') },
          },
        },
      },
      insights: { ...A, description: 'observations grounded in the data' },
      recommendations: { ...A, description: 'concrete next steps' },
      riskIndicators: { ...A, description: 'risks visible in the data' },
      opportunityFlags: { ...A, description: 'opportunities visible in the data' },
      engagement: {
        type: 'object',
        properties: {
          overallScore: I('0-100, null if no engagement data'), emailEngagement: I('0-100 from the recent emails, null if none'),
          socialEngagement: I('0-100, null unless evidenced'), websiteEngagement: I('0-100, null unless evidenced'),
          lastInteraction: S('ISO date of the latest interaction in the data'), interactionFrequency: S('daily | weekly | monthly | rare | unknown'),
          preferredChannel: S('email | phone | linkedin … only if evidenced, else unknown'),
        },
      },
      summary: { type: 'string', description: 'two-sentence card summary' },
    },
  },
  async load({ user, params }) {
    const subject = await loadSubject(user, params);
    const cardType = TYPES.includes(params.cardType) ? params.cardType : 'standard';
    return { subject, cardType, emails: subject.id ? await recentEmails(user, subject.id) : [], timeline: subject.id ? await recentTimeline(user, subject.id) : [] };
  },
  buildInput(ctx) {
    return {
      instructions: 'You enrich a CRM contact card for a salesperson. Use ONLY the contact data, recent emails and activity given. Never invent facts: anything you cannot support is null or an empty list. Company industry/size are only filled when given or unmistakable. Fill the sales/support/marketing sections only to the extent the card type asks for them; leave the others null/empty. Insights and recommendations are specific to this person.',
      input: `Card type: ${ctx.cardType}\nToday: ${new Date().toISOString().slice(0, 10)}\n\nContact:\n${JSON.stringify(ctx.subject.contact)}\n\nRecent emails: ${JSON.stringify(ctx.emails)}\nRecent activity: ${JSON.stringify(ctx.timeline)}`,
    };
  },
  finalize(parsed, ctx) {
    const e = parsed.enhancements || {};
    const has = (o) => o && Object.values(o).some((v) => (Array.isArray(v) ? v.length : v !== null && v !== undefined && v !== ''));
    const enhancements = {};
    for (const k of ['name', 'email', 'phone', 'company']) if (has(e[k])) enhancements[k] = e[k];
    const t = ctx.cardType;
    if ((t === 'sales' || t === 'comprehensive') && has(e.sales)) enhancements.sales = { ...e.sales, leadScore: clampInt(e.sales.leadScore) };
    if ((t === 'support' || t === 'comprehensive') && has(e.support)) enhancements.support = e.support;
    if ((t === 'marketing' || t === 'comprehensive') && has(e.marketing)) enhancements.marketing = e.marketing;
    const g = parsed.engagement || {};
    return {
      originalData: ctx.subject.contact,
      cardType: t,
      enhancements,
      insights: asStrings(parsed.insights),
      recommendations: asStrings(parsed.recommendations),
      riskIndicators: asStrings(parsed.riskIndicators),
      opportunityFlags: asStrings(parsed.opportunityFlags),
      engagement: {
        overallScore: clampInt(g.overallScore), emailEngagement: clampInt(g.emailEngagement), socialEngagement: clampInt(g.socialEngagement),
        websiteEngagement: clampInt(g.websiteEngagement), lastInteraction: g.lastInteraction || null, interactionFrequency: g.interactionFrequency || 'unknown',
        preferredChannel: g.preferredChannel || 'unknown',
      },
      summary: parsed.summary || '',
      lastUpdated: new Date().toISOString(),
    };
  },
};
