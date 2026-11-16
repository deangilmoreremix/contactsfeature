/**
 * AI contact-detail enhancement. Old contract: { originalData, detailType, enhancedFields, aiInsights, recommendations[],
 * predictiveMetrics:{nextInteraction,conversionProbability,lifetimeValue,churnProbability}, lastEnhanced }.
 * For a specific detailType (communication|professional|personal|engagement) enhancedFields/aiInsights are that section
 * directly; for comprehensive (default) they hold all four sections - exactly as before.
 * Deliberately NOT inferred (sensitive attributes the old stub guessed): gender, cultural background, age, income, personality.
 */
const { recentEmails, recentTimeline, dealsFor } = require('./_ctx');
const { loadSubject, clampInt, asStrings } = require('./_scoringShared');

const TYPES = ['communication', 'professional', 'personal', 'engagement', 'comprehensive'];
const S = (description) => ({ type: ['string', 'null'], description });
const I = (description) => ({ type: ['integer', 'null'], description });
const A = { type: 'array', items: { type: 'string' } };

module.exports = {
  id: 'contact-detail-ai',
  role: 'default',
  effort: 'low',
  maxOutputTokens: 3500,
  schema: {
    type: 'object',
    properties: {
      enhancedFields: {
        type: 'object',
        properties: {
          communication: {
            type: 'object',
            properties: {
              email: { type: 'object', properties: { validated: { type: ['boolean', 'null'], description: 'syntactically valid' }, domain: S('domain'), provider: S('mail provider'), riskNote: S('e.g. free webmail for a B2B lead, role address') } },
              phone: { type: 'object', properties: { formatted: S('only if certain'), type: S('only if evident'), country: S('only if evident') } },
              address: { type: 'object', properties: { standardized: S('only restating what the data contains'), timezone: S('only if evident from the data') } },
              social: { ...A, description: 'platforms with a profile in the data' },
            },
          },
          professional: {
            type: 'object',
            properties: {
              jobTitle: { type: 'object', properties: { standardized: S('normalised title'), seniority: S('c-level | vp | director | manager | individual | unknown'), function: S('sales | engineering | marketing … or null') } },
              company: { type: 'object', properties: { standardized: S('company name'), domain: S('only if in the data'), industry: S('only if given or unmistakable'), size: S('only if given') } },
              yearsOfExperience: I('only if the data states it'),
              expertise: { ...A, description: 'only from the title / notes' },
            },
          },
          personal: {
            type: 'object',
            properties: { firstName: S('from the name'), lastName: S('from the name'), location: S('only if in the data'), interests: { ...A, description: 'only if stated in notes/tags' } },
          },
          engagement: {
            type: 'object',
            properties: { emailEngagement: S('summary of the recent emails'), preferredChannel: S('only if evidenced'), responseRate: I('0-100 from the emails, null if unknown'), lastInteraction: S('ISO date of the latest interaction') },
          },
        },
      },
      aiInsights: {
        type: 'object',
        properties: {
          communication: { type: 'object', properties: { bestTime: S('only if the data supports it'), preferredChannel: S('only if evidenced'), responseRate: I('0-100'), communicationStyle: S('only if the emails show it') } },
          professional: { type: 'object', properties: { influence: I('0-100 estimate from seniority, null if unknown'), decisionMaking: S('decision maker | influencer | user | unknown'), network: S('only if evidenced'), opportunities: A } },
          personal: { type: 'object', properties: { interests: A, motivations: { ...A, description: 'only from stated needs/notes' } } },
          engagement: { type: 'object', properties: { engagementLevel: S('low | medium | high'), churnRisk: I('0-100'), growthPotential: S('low | medium | high'), advocacyPotential: I('0-100') } },
        },
      },
      recommendations: { ...A, description: 'concrete next steps for this contact' },
      predictiveMetrics: {
        type: 'object',
        properties: {
          nextInteraction: S('suggested timing + channel'),
          conversionProbability: I('0-100, null if there is not enough data'),
          lifetimeValue: { type: ['number', 'null'], description: 'only from the deals in the data, else null' },
          churnProbability: I('0-100, null if not enough data'),
        },
      },
      dataGaps: { ...A, description: 'important fields missing that limit this analysis' },
    },
  },
  async load({ user, params }) {
    const subject = await loadSubject(user, params);
    const detailType = TYPES.includes(params.detailType) ? params.detailType : 'comprehensive';
    const id = subject.id;
    return {
      subject, detailType,
      emails: id ? await recentEmails(user, id) : [], timeline: id ? await recentTimeline(user, id) : [],
      deals: id ? (await dealsFor(user, id)).map((d) => ({ title: d.title || d.name, stage: d.stage || d.status, value: d.value ?? d.amount ?? null })) : [],
    };
  },
  buildInput(ctx, params) {
    return {
      instructions: 'You build a detailed profile of a CRM contact for a salesperson. Use ONLY the contact data, emails, activity and deals given. Never invent facts: unknown => null or empty, and list the important gaps in dataGaps. Do NOT infer or output sensitive personal attributes (gender, ethnicity, cultural background, age, income, religion, health, personality). Probabilities are honest estimates and null when data is too thin.',
      input: `Detail focus: ${ctx.detailType}\nToday: ${new Date().toISOString().slice(0, 10)}\n\nContact:\n${JSON.stringify(ctx.subject.contact)}\n\nRecent emails: ${JSON.stringify(ctx.emails)}\nRecent activity: ${JSON.stringify(ctx.timeline)}\nDeals: ${JSON.stringify(ctx.deals)}\nExtra context from the user: ${JSON.stringify(params.context || {}).slice(0, 1500)}`,
    };
  },
  finalize(parsed, ctx) {
    const f = parsed.enhancedFields || {};
    const i = parsed.aiInsights || {};
    const t = ctx.detailType;
    const pm = parsed.predictiveMetrics || {};
    return {
      originalData: ctx.subject.contact,
      detailType: t,
      enhancedFields: t === 'comprehensive' ? f : f[t] || {},
      aiInsights: t === 'comprehensive' ? i : i[t] || {},
      recommendations: asStrings(parsed.recommendations),
      predictiveMetrics: {
        nextInteraction: pm.nextInteraction || null, conversionProbability: clampInt(pm.conversionProbability),
        lifetimeValue: typeof pm.lifetimeValue === 'number' ? pm.lifetimeValue : null, churnProbability: clampInt(pm.churnProbability),
      },
      dataGaps: asStrings(parsed.dataGaps),
      lastEnhanced: new Date().toISOString(),
    };
  },
};
