/**
 * AI bulk scoring / categorising / qualifying for up to 25 contacts in ONE streamed model call, so the partial JSON
 * fills `results` live. Old contract: { successful:[{contact,score,processedAt}], failed:[{contact,error,failedAt}],
 * summary:{total,successful,failed} } (+ additive `results`, `operation`). Operations: score (default) | categorize | qualify.
 * enrich/email use their own tasks; tag/delete are data operations and never go through the AI.
 */
const { TaskError } = require('./_ctx');
const { resolveItems, itemsPrompt, byRef, clampInt, BATCH_RULES } = require('./_scoringShared');

const OPS = ['score', 'categorize', 'qualify'];
const CATS = ['hot', 'warm', 'cold', 'unqualified'];
const gradeOf = (s) => (s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F');

module.exports = {
  id: 'smart-bulk',
  role: 'fast',
  effort: 'low',
  maxOutputTokens: 6000,
  schema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'the ref of the contact exactly as listed' },
            score: { type: 'integer', description: '0-100 lead quality score' },
            category: { type: 'string', enum: CATS },
            qualified: { type: 'boolean', description: 'true only if the data supports qualification' },
            reason: { type: 'string', description: 'one sentence citing the data used' },
          },
        },
      },
    },
  },
  async load({ user, params }) {
    const operation = String(params.operation || 'score');
    if (!OPS.includes(operation)) throw new TaskError(400, `Unsupported bulk operation "${operation}" (use ${OPS.join(', ')})`);
    return { operation, items: await resolveItems(user, params, 'contacts') };
  },
  buildInput(ctx, params) {
    return {
      instructions: `You evaluate sales contacts in bulk for a B2B seller. ${BATCH_RULES} For every contact give a 0-100 score (contact quality, company fit, engagement, recency), a category (hot >= 70, warm 40-69, cold 20-39, unqualified < 20), whether it is qualified, and a one-sentence reason. Today is ${new Date().toISOString().slice(0, 10)}. Focus: ${ctx.operation}.`,
      input: `Evaluate these ${ctx.items.length} contacts.\n\nOptions from the user: ${JSON.stringify((params.options && params.options.criteria) || params.options || {}).slice(0, 2000)}\n\nContacts:\n${itemsPrompt(ctx.items)}`,
    };
  },
  finalize(parsed, ctx) {
    const found = byRef(parsed.results);
    const successful = [];
    const failed = [];
    const results = [];
    const now = new Date().toISOString();
    for (const it of ctx.items) {
      const r = found.get(it.ref);
      const score = r ? clampInt(r.score) : null;
      if (!r || score === null) {
        failed.push({ contact: it.record, error: 'The AI returned no result for this contact', failedAt: now });
        continue;
      }
      const category = CATS.includes(r.category) ? r.category : null;
      const row = { contactId: it.ref, score, category, qualified: !!r.qualified, reason: r.reason || '' };
      results.push(row);
      successful.push({ contact: it.record, score: { totalScore: score, grade: gradeOf(score), factors: [], calculatedAt: now }, category, qualified: row.qualified, reason: row.reason, processedAt: now });
    }
    return { operation: ctx.operation, successful, failed, summary: { total: ctx.items.length, successful: successful.length, failed: failed.length }, results };
  },
};
