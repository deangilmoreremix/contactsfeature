/**
 * Pure helpers for deal-health-analysis (kept free of the Netlify `stream()` wrapper so ai_jobs hooks and tests can
 * require them without the Lambda runtime).
 */
const DAY_MS = 86400000;

const HEALTH_SCHEMA = {
  type: 'object',
  properties: {
    healthScore: { type: 'number', description: '0-100, higher is healthier' },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    indicators: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          score: { type: 'number', description: '0-100' },
          status: { type: 'string', enum: ['good', 'warning', 'critical'] },
          rationale: { type: 'string', description: 'One sentence citing the supplied facts' },
        },
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          factor: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          mitigation: { type: 'string' },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    nextActions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          timeline: { type: 'string' },
        },
      },
    },
    dataGaps: { type: 'array', items: { type: 'string' }, description: 'Important facts that are missing and would change the assessment' },
  },
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(Number(n)) ? Number(n) : lo));

/** Facts handed to the model; computed from DB rows only. */
function buildDealFacts(deal, contact, now = new Date()) {
  const t = (v) => { const x = v ? Date.parse(v) : NaN; return Number.isNaN(x) ? null : x; };
  const created = t(deal.created_at);
  const updated = t(deal.updated_at);
  const expected = t(deal.expected_close_date);
  const days = (ms) => (ms === null ? null : Math.round(ms / DAY_MS));
  return {
    title: deal.title || null,
    stage: deal.stage || null,
    value: Number(deal.value) || 0,
    ageDays: created === null ? null : days(now.getTime() - created),
    daysSinceLastUpdate: updated === null ? null : days(now.getTime() - updated),
    daysUntilExpectedClose: expected === null ? null : days(expected - now.getTime()),
    stageStagnationDays: deal.stage_stagnation ?? null,
    daysSinceContactReplied: deal.days_since_reply ?? null,
    objectionLevel0to10: deal.objection_level ?? null,
    storedRiskScore: deal.risk_score ?? null,
    contact: contact
      ? {
          name: contact.name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null,
          company: contact.company || null,
          title: contact.title || null,
          status: contact.status || null,
          interestLevel: contact.interest_level || contact.interestLevel || null,
        }
      : null,
  };
}

/** Clamp model output into the ranges the UI expects. */
function normalizeHealth(raw) {
  const r = raw || {};
  const score = clamp(r.healthScore, 0, 100);
  return {
    healthScore: Math.round(score),
    riskLevel: ['low', 'medium', 'high', 'critical'].includes(r.riskLevel) ? r.riskLevel : (score >= 75 ? 'low' : score >= 55 ? 'medium' : score >= 35 ? 'high' : 'critical'),
    indicators: (r.indicators || []).slice(0, 8).map((i) => ({
      name: String(i.name || ''), score: Math.round(clamp(i.score, 0, 100)),
      status: ['good', 'warning', 'critical'].includes(i.status) ? i.status : 'warning', rationale: String(i.rationale || ''),
    })),
    risks: (r.risks || []).slice(0, 8),
    recommendations: (r.recommendations || []).slice(0, 8).map(String),
    nextActions: (r.nextActions || []).slice(0, 8),
    dataGaps: (r.dataGaps || []).slice(0, 8).map(String),
  };
}

const INSTRUCTIONS =
  'You are a sales deal-health analyst. Assess ONLY from the JSON facts provided. ' +
  'Never invent stakeholders, competitors, budgets, meetings or emails. If a fact is null or missing, do not guess it: ' +
  'list it under dataGaps and lower your confidence instead. Cite the supplied numbers in each indicator rationale. ' +
  'Give 3-5 indicators, concrete recommendations and next actions the seller can do this week.';

module.exports = { buildDealFacts, normalizeHealth, HEALTH_SCHEMA, INSTRUCTIONS };
