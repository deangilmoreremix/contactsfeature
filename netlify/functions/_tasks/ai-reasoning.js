/**
 * Step-by-step AI reasoning about a contact / situation.
 * Old contract: { input, type, context, steps:[{step,action,input,reasoning,result}], conclusion, confidence,
 * alternatives[], reasoningTime, performedAt }. `step.result` is now { summary, conclusion, confidence } (strict, no free-form object).
 */
const { TaskError, recentEmails, recentTimeline } = require('./_ctx');
const { loadSubject, sanitizeLoose, clampInt, asStrings } = require('./_scoringShared');
const { isValidUUID } = require('../_validation');

const TYPES = {
  contact_priority: 'How high a priority is this contact right now, and why?',
  next_action: 'What is the single best next action for this contact, and when?',
  engagement_strategy: 'What engagement strategy (channel, cadence, angle) fits this contact?',
  risk_assessment: 'What are the risks (churn, stalling, data quality, fit) and how severe?',
  opportunity_analysis: 'What opportunities (upsell, referral, expansion) exist and how strong are they?',
  general: 'Reason through the situation and recommend what to do.',
};

module.exports = {
  id: 'ai-reasoning',
  role: 'thinking',
  effort: 'medium',
  maxOutputTokens: 4000,
  schema: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            step: { type: 'integer', description: '1-based order' },
            action: { type: 'string', description: 'snake_case name of what this step does, e.g. assess_company' },
            reasoning: { type: 'string', description: 'why this step matters, citing the data' },
            result: {
              type: 'object',
              properties: {
                summary: { type: 'string', description: 'what this step found' },
                conclusion: { type: ['string', 'null'], description: 'interim conclusion, if any' },
                confidence: { type: ['integer', 'null'], description: '0-100 confidence in this step, null if not meaningful' },
              },
            },
          },
        },
      },
      conclusion: { type: 'string', description: 'final recommendation grounded in the steps' },
      confidence: { type: 'integer', description: '0-100 overall confidence; lower when data is thin' },
      alternatives: { type: 'array', items: { type: 'string' }, description: 'genuine alternative approaches with their trade-off' },
    },
  },
  async load({ user, params }) {
    const data = params.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new TaskError(400, 'data is required');
    const type = Object.prototype.hasOwnProperty.call(TYPES, params.reasoningType) ? params.reasoningType : 'general';
    const id = params.contactId || data.contactId || data.id;
    let subject; let emails = []; let timeline = [];
    if (isValidUUID(id)) {
      subject = await loadSubject(user, { contactId: id });
      emails = await recentEmails(user, subject.id);
      timeline = await recentTimeline(user, subject.id);
    } else {
      subject = { contact: sanitizeLoose(data), id: null, owned: false };
      if (!Object.keys(subject.contact).length) throw new TaskError(400, 'data is required');
    }
    return { type, subject, emails, timeline, context: sanitizeLoose(params.context && typeof params.context === 'object' ? params.context : {}), startedAt: Date.now() };
  },
  buildInput(ctx) {
    return {
      instructions: 'You are a sales strategist reasoning step by step. Use ONLY the data given; never invent facts, metrics or history. Each step cites the data it used; missing data is stated and lowers confidence. 3-6 steps, then a concrete conclusion and real alternatives (not filler).',
      input: `Question: ${TYPES[ctx.type]}\nReasoning type: ${ctx.type}\n\nSubject:\n${JSON.stringify(ctx.subject.contact)}\n\nRecent emails: ${JSON.stringify(ctx.emails)}\nRecent activity: ${JSON.stringify(ctx.timeline)}\nBusiness context: ${JSON.stringify(ctx.context)}\nToday: ${new Date().toISOString().slice(0, 10)}`,
    };
  },
  finalize(parsed, ctx) {
    const steps = (parsed.steps || []).map((s, i) => ({
      step: Number.isFinite(s.step) ? s.step : i + 1,
      action: s.action || `step_${i + 1}`,
      input: null,
      reasoning: s.reasoning || '',
      result: { summary: (s.result && s.result.summary) || '', conclusion: (s.result && s.result.conclusion) || null, confidence: s.result ? clampInt(s.result.confidence) : null },
    }));
    return {
      input: ctx.subject.contact,
      type: ctx.type,
      context: ctx.context,
      steps,
      conclusion: parsed.conclusion || 'Analysis complete',
      confidence: clampInt(parsed.confidence) ?? 0,
      alternatives: asStrings(parsed.alternatives, 6),
      reasoningTime: Date.now() - ctx.startedAt,
      performedAt: new Date().toISOString(),
    };
  },
};
