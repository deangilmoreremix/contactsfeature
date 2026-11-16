/**
 * Deal risk helpers. `buildRiskPrompt` is the prompt of lib/heatmap/computeDealRisk.ts (a test compares it);
 * `baselineRisk` is a transparent rule-of-thumb computed from the deal's own numbers, shown next to the AI's
 * assessment and used to rank the portfolio. It is NOT the AI score.
 */
const j = (v) => JSON.stringify(v, null, 2);

const SINGLE_SCHEMA = {
  type: 'object',
  properties: { risk_score: { type: 'number' }, reason: { type: 'string' }, next_action: { type: 'string' } },
};

const PORTFOLIO_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2-3 sentence portfolio read: where the risk concentrates' },
    deals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          deal_id: { type: 'string', description: 'exactly the id given in the input' },
          risk_score: { type: 'number', description: '0-100, 0 = no risk' },
          reason: { type: 'string', description: '1-2 sentences naming the evidence' },
          next_action: { type: 'string', description: 'ONE best next action' },
        },
      },
    },
  },
};

function buildRiskPrompt(contact, deal) {
  return `
You are a deal risk analyst for an AI-powered CRM.

Contact:
${j(contact)}

Deal:
${j(deal)}

Task:
1) Assign a RISK_SCORE from 0–100 (0 = no risk, 100 = very high risk).
2) Provide a 1–2 sentence reason.
3) Suggest ONE best next action.

Return JSON in this exact format:
{
  "risk_score": 0,
  "reason": "...",
  "next_action": "..."
}
  `;
}

function buildPortfolioPrompt(facts) {
  return `You are a deal risk analyst for an AI-powered CRM. Assess EVERY open deal below using only the facts given.

Open deals (JSON):
${j(facts)}

Task:
- For each deal assign risk_score 0-100 (0 = no risk, 100 = very high risk), a 1-2 sentence reason that cites the deal's own numbers, and ONE best next action.
- Missing numbers (null) mean "not tracked"; say so instead of guessing.
- Use each deal_id exactly as given. Do not add deals.
- Finish with a 2-3 sentence portfolio summary.`;
}

const CLOSED_STAGE = /^(closed[\s_-]*)?(won|lost)$/i;

/** A deal is open when it has no closed_at and is not in a won/lost stage. */
function isOpenDeal(deal) {
  if (!deal) return false;
  if (deal.closed_at) return false;
  return !CLOSED_STAGE.test(String(deal.stage || '').trim());
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : (v == null || v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null)));
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Real numbers behind a deal (what the model is shown and the panel lists as factors). */
function dealFactors(deal, now = Date.now()) {
  const updated = deal.updated_at ? Date.parse(deal.updated_at) : NaN;
  return {
    stage: deal.stage || null,
    value: num(deal.value),
    days_since_reply: num(deal.days_since_reply),
    objection_level: num(deal.objection_level),
    stage_stagnation: num(deal.stage_stagnation),
    days_since_update: Number.isFinite(updated) ? Math.max(0, Math.floor((now - updated) / 86400000)) : null,
    expected_close_date: deal.expected_close_date || null,
  };
}

/** 0-100: silence (35) + objections (25) + stage stagnation (25) + untouched record (15). Missing signals add nothing. */
function baselineRisk(factors) {
  const silence = factors.days_since_reply == null ? 0 : clamp(factors.days_since_reply, 0, 30) / 30 * 35;
  const objections = factors.objection_level == null ? 0 : clamp(factors.objection_level, 0, 10) / 10 * 25;
  const stagnation = factors.stage_stagnation == null ? 0 : clamp(factors.stage_stagnation, 0, 60) / 60 * 25;
  const untouched = factors.days_since_update == null ? 0 : clamp(factors.days_since_update, 0, 60) / 60 * 15;
  return Math.round(silence + objections + stagnation + untouched);
}

const clampScore = (v, fallback = 0) => Math.round(clamp(Number.isFinite(Number(v)) ? Number(v) : fallback, 0, 100));

module.exports = {
  SINGLE_SCHEMA, PORTFOLIO_SCHEMA, buildRiskPrompt, buildPortfolioPrompt, isOpenDeal, dealFactors, baselineRisk, clampScore, MAX_PORTFOLIO: 25,
};
