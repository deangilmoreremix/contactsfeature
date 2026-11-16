/**
 * Relationship insights for one contact. Old contract: { contactId, insightType, networkAnalysis, influenceMapping, interactionPatterns,
 * relationshipStrength, recommendations[], opportunities[], risks[], generatedAt }. Grounded in the caller's own contact, emails, timeline,
 * deals and same-company contacts; unknowns stay null/empty. Connection ids the model returns are validated against the loaded set.
 */
const { loadContact, recentEmails, recentTimeline, dealsFor, describeContact } = require('./_ctx');
const { colleaguesAt, capJson } = require('./_ctxAnalysis');

const TYPES = ['network', 'influence', 'interactions', 'strength', 'comprehensive'];
const SCORE = { type: 'integer', description: '0-100' };
const comp = { type: 'object', properties: { score: SCORE, evidence: { type: 'string' } } };

module.exports = {
  id: 'relationship-insights',
  role: 'default',
  effort: 'medium',
  maxOutputTokens: 4000,
  schema: {
    type: 'object',
    properties: {
      network: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          clusters: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, contactIds: { type: 'array', items: { type: 'string' } } } } },
          bridgeContactIds: { type: 'array', items: { type: 'string' } },
        },
      },
      influence: {
        type: 'object',
        properties: {
          score: SCORE,
          factors: { type: 'array', items: { type: 'object', properties: { factor: { type: 'string' }, score: SCORE, description: { type: 'string' } } } },
          decisionMakingPower: { type: 'string', enum: ['decision_maker', 'influencer', 'evaluator', 'end_user', 'unknown'] },
          reach: { type: ['integer', 'null'], description: '0-100, null if unknowable' },
          amplification: { type: ['integer', 'null'], description: '0-100, null if unknowable' },
        },
      },
      interactions: {
        type: 'object',
        properties: {
          frequency: { type: 'object', properties: { averageDaysBetween: { type: ['number', 'null'] }, summary: { type: 'string' } } },
          timing: { type: 'object', properties: { summary: { type: 'string' } } },
          channels: { type: 'object', properties: { primary: { type: ['string', 'null'] }, summary: { type: 'string' } } },
          topics: { type: 'object', properties: { list: { type: 'array', items: { type: 'string' } } } },
          sentiment: { type: 'object', properties: { label: { type: 'string', enum: ['positive', 'neutral', 'negative', 'unknown'] }, summary: { type: 'string' } } },
          reciprocity: { type: 'object', properties: { label: { type: 'string', enum: ['balanced', 'we_initiate', 'they_initiate', 'unknown'] }, summary: { type: 'string' } } },
        },
      },
      strength: {
        type: 'object',
        properties: {
          overallScore: SCORE,
          components: { type: 'object', properties: { interaction: comp, network: comp, engagement: comp, temporal: comp } },
          trajectory: { type: 'string', enum: ['strengthening', 'stable', 'declining', 'unknown'] },
          health: { type: 'string', enum: ['strong', 'moderate', 'weak', 'unknown'] },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
      recommendations: { type: 'array', items: { type: 'string' } },
      opportunities: { type: 'array', items: { type: 'string' } },
      risks: { type: 'array', items: { type: 'string' } },
    },
  },
  async load({ user, params }) {
    const contact = await loadContact(user, params);
    return {
      contact,
      emails: await recentEmails(user, contact.id, 30),
      timeline: await recentTimeline(user, contact.id, 20),
      deals: await dealsFor(user, contact.id, 5),
      colleagues: await colleaguesAt(user, contact, 15),
    };
  },
  buildInput(ctx, params) {
    const type = TYPES.includes(params.insightType) ? params.insightType : 'comprehensive';
    return {
      instructions: 'You analyse a seller\'s relationship with ONE contact using only the data given. Never invent interactions, connections, sentiment or job history. '
        + 'With little data, give low scores, "unknown" labels and say so. Cluster/bridge contact ids must come from the colleagues list. Recommendations, opportunities and risks must each follow from a stated data point.',
      input: `Insight focus: ${type}\n\n${describeContact(ctx.contact)}\nLast connected: ${ctx.contact.lastconnected || ctx.contact.lastConnected || 'unknown'}\n\n`
        + `Emails (newest first; is_inbound=true means they wrote): ${capJson(ctx.emails, 3500)}\nActivity: ${capJson(ctx.timeline, 2000)}\nDeals: ${capJson(ctx.deals, 1500)}\n`
        + `Other contacts at the same company: ${capJson(ctx.colleagues, 2500)}\nExtra data from the user: ${capJson(params.data, 2500)}`,
    };
  },
  finalize(parsed, ctx, params) {
    const type = TYPES.includes(params.insightType) ? params.insightType : 'comprehensive';
    const wants = (k) => type === 'comprehensive' || type === k;
    const known = new Set(ctx.colleagues.map((c) => c.id));
    const n = parsed.network || {};
    const net = wants('network') ? {
      directConnections: ctx.colleagues, indirectConnections: [], networkSize: ctx.colleagues.length, networkDensity: null,
      clusters: (n.clusters || []).map((c) => ({ name: c.name, contactIds: (c.contactIds || []).filter((id) => known.has(id)) })),
      bridges: (n.bridgeContactIds || []).filter((id) => known.has(id)).map((id) => ctx.colleagues.find((c) => c.id === id)),
      isolates: [], summary: n.summary || '',
    } : {};
    const inf = parsed.influence || {};
    const i = parsed.interactions || {};
    const s = parsed.strength || {};
    return {
      contactId: ctx.contact.id || null, insightType: type,
      networkAnalysis: net,
      influenceMapping: wants('influence') ? { influenceScore: inf.score, influenceFactors: inf.factors || [], influenceNetwork: [], decisionMakingPower: inf.decisionMakingPower, reach: inf.reach, amplification: inf.amplification } : {},
      interactionPatterns: wants('interactions') ? { frequency: i.frequency || {}, timing: i.timing || {}, channels: i.channels || {}, topics: i.topics || {}, sentiment: i.sentiment || {}, reciprocity: i.reciprocity || {} } : {},
      relationshipStrength: wants('strength') ? { overallScore: s.overallScore, components: s.components || {}, trajectory: s.trajectory, health: s.health, recommendations: s.recommendations || [] } : {},
      recommendations: parsed.recommendations || [], opportunities: parsed.opportunities || [], risks: parsed.risks || [],
      generatedAt: new Date().toISOString(),
    };
  },
};
