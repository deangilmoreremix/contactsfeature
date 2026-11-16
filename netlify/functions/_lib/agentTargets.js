/**
 * Server-side allow-list of the dual-mode agent functions agent-runner may dispatch to.
 * Literal require() calls on purpose: the Netlify packager only ships what it can see.
 */
const FUNCTIONS = {
  'cold-email-sdr': () => require('./cold-email-sdr'),
  'follow-up-sdr': () => require('./follow-up-sdr'),
  'objection-handler-sdr': () => require('./objection-handler-sdr'),
  'discovery-sdr': () => require('./discovery-sdr'),
  'win-back-sdr': () => require('./win-back-sdr'),
  'reactivation-sdr': () => require('./reactivation-sdr'),
  'cold-call-sdr': () => require('./cold-call-sdr'),
  'linkedin-sdr': () => require('./linkedin-sdr'),
  'whatsapp-sdr': () => require('./whatsapp-sdr'),
  'event-based-sdr': () => require('./event-based-sdr'),
  'referral-sdr': () => require('./referral-sdr'),
  'newsletter-sdr': () => require('./newsletter-sdr'),
  'high-intent-sdr': () => require('./high-intent-sdr'),
  'data-enrichment-sdr': () => require('./data-enrichment-sdr'),
  'competitor-aware-sdr': () => require('./competitor-aware-sdr'),
  'run-agent': () => require('./run-agent'),
  'run-ae-agent': () => require('./run-ae-agent'),
  'competitive-intelligence-agent': () => require('./competitive-intelligence-agent'),
  'content-creation-agent': () => require('./content-creation-agent'),
  'email-personalization-agent': () => require('./email-personalization-agent'),
  'negotiation-coach-agent': () => require('./negotiation-coach-agent'),
  'revenue-intelligence-agent': () => require('./revenue-intelligence-agent'),
  'social-selling-agent': () => require('./social-selling-agent'),
  'deal-analysis-agent': () => require('./deal-analysis-agent'),
  'deal-health-analysis': () => require('./deal-health-analysis'),
};

/** UI agent ids (agent_metadata) -> function. null = known agent without a runnable server function yet. */
const AGENT_IDS = {
  'ai-sdr-agent': 'run-agent',
  'ai-ae-agent': 'run-ae-agent',
  'ai-dialer-agent': 'cold-call-sdr',
  'ai-journeys-agent': null,
  'crm-ops-agent': null,
  'agent-builder': null,
};

/** -> { name } | { unsupported: true } | null (unknown) */
function resolveTarget({ agentId, functionName }) {
  const has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  if (functionName !== undefined && functionName !== null && functionName !== '') {
    return has(FUNCTIONS, functionName) ? { name: functionName } : null;
  }
  if (has(AGENT_IDS, agentId)) return AGENT_IDS[agentId] ? { name: AGENT_IDS[agentId] } : { unsupported: true };
  if (has(FUNCTIONS, agentId)) return { name: agentId };
  return null;
}

module.exports = { FUNCTIONS, AGENT_IDS, resolveTarget };
