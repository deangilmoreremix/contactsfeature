/**
 * Deal analysis. Old contract: { dealData, metrics{dealScore,engagementScore,valueScore,timelineScore,stakeholderScore,competitivePosition},
 * risks[{type,severity,description,mitigation}], opportunities[{type,description,value,actions[]}], recommendations[{priority,action,reason}],
 * score, probability, timeline{…,confidence}, competitors, stakeholderAnalysis, analyzedAt }.
 * Reads ONLY the caller's deal (dealId owner-checked, or inline dealData for unsaved deals) + its contact's emails/activity.
 */
const { loadDeal, capJson } = require('./_ctxAnalysis');
const { loadContact, recentEmails, recentTimeline, describeContact } = require('./_ctx');
const { isValidUUID } = require('../_validation');

const TYPES = ['comprehensive', 'risk', 'opportunity', 'timeline', 'metrics'];
const SCORE = { type: 'integer', description: '0-100' };
const SEV = { type: 'string', enum: ['high', 'medium', 'low'] };

module.exports = {
  id: 'deal-analysis',
  role: 'thinking',
  effort: 'medium',
  maxOutputTokens: 4500,
  schema: {
    type: 'object',
    properties: {
      metrics: {
        type: 'object',
        properties: {
          dealScore: SCORE, engagementScore: SCORE, valueScore: SCORE, timelineScore: SCORE, stakeholderScore: SCORE,
          competitivePosition: { type: 'string', enum: ['strong', 'neutral', 'weak', 'unknown'] },
        },
      },
      risks: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, severity: SEV, description: { type: 'string' }, mitigation: { type: 'string' } } } },
      opportunities: {
        type: 'array',
        items: { type: 'object', properties: { type: { type: 'string' }, description: { type: 'string' }, value: { type: ['number', 'null'], description: 'estimated extra value in the deal currency, null if unknown' }, actions: { type: 'array', items: { type: 'string' } } } },
      },
      recommendations: { type: 'array', items: { type: 'object', properties: { priority: SEV, action: { type: 'string' }, reason: { type: 'string' } } } },
      probability: { type: 'integer', description: '0-100 chance to close-won' },
      timeline: {
        type: 'object',
        properties: {
          estimatedCloseDate: { type: ['string', 'null'], description: 'ISO date or null' },
          daysToClose: { type: ['integer', 'null'] },
          confidence: SCORE,
          milestones: { type: 'array', items: { type: 'string' } },
          blockers: { type: 'array', items: { type: 'string' } },
        },
      },
      competitors: { type: 'object', properties: { named: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } } },
      stakeholderAnalysis: {
        type: 'object',
        properties: { championIdentified: { type: ['boolean', 'null'] }, decisionMakers: { type: 'array', items: { type: 'string' } }, gaps: { type: 'array', items: { type: 'string' } } },
      },
    },
  },
  async load({ user, params }) {
    const deal = await loadDeal(user, params);
    let contact = null;
    let emails = [];
    let timeline = [];
    if (isValidUUID(deal.contact_id)) {
      contact = await loadContact(user, { contactId: deal.contact_id }, { allowInline: false });
      emails = await recentEmails(user, contact.id, 15);
      timeline = await recentTimeline(user, contact.id, 15);
    }
    return { deal, contact, emails, timeline };
  },
  buildInput(ctx, params) {
    const type = TYPES.includes(params.analysisType) ? params.analysisType : 'comprehensive';
    return {
      instructions: 'You are a senior sales-deal reviewer. Analyse ONLY the deal and contact data given; never invent competitors, stakeholders, dates or numbers. '
        + 'If something is unknown (no champion info, no close date) say so via null/"unknown"/gaps instead of guessing. Risks and recommendations must cite the data that triggers them. Probability and scores must be consistent with each other.',
      input: `Analysis type: ${type} (still fill every field; keep irrelevant ones brief)\nToday: ${new Date().toISOString().slice(0, 10)}\n\nDeal: ${capJson(ctx.deal, 3000)}\n\n`
        + (ctx.contact ? `Contact:\n${describeContact(ctx.contact)}\nRecent emails: ${capJson(ctx.emails, 2500)}\nActivity: ${capJson(ctx.timeline, 1500)}\n` : 'No linked contact.\n'),
    };
  },
  finalize(parsed, ctx, params) {
    const type = TYPES.includes(params.analysisType) ? params.analysisType : 'comprehensive';
    const full = type === 'comprehensive';
    const m = parsed.metrics || {};
    const t = parsed.timeline || {};
    const score = Math.round((m.dealScore || 0) * 0.4 + (parsed.probability || 0) * 0.3 + (t.confidence || 0) * 0.3);
    return {
      dealData: ctx.deal,
      metrics: full || type === 'metrics' ? m : {},
      risks: full || type === 'risk' ? parsed.risks || [] : [],
      opportunities: full || type === 'opportunity' ? parsed.opportunities || [] : [],
      recommendations: full ? parsed.recommendations || [] : [],
      score: full ? score : 0,
      probability: full ? parsed.probability || 0 : 0,
      timeline: full || type === 'timeline' ? t : {},
      ...(full ? { competitors: parsed.competitors || {}, stakeholderAnalysis: parsed.stakeholderAnalysis || {} } : {}),
      analyzedAt: new Date().toISOString(),
    };
  },
};
