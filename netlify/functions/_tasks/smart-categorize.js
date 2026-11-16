/**
 * AI lead temperature (hot/warm/cold/unqualified) for up to 25 contacts in ONE model call.
 * Old contract: { categories:{hot[],warm[],cold[],unqualified[]}, summary:{total,hot,warm,cold,unqualified} };
 * each contact is `{...contact, category, categorizedAt}` (+ additive score, reason). Contacts the model skipped land in
 * the additive `categories.uncategorized` instead of being guessed.
 */
const { resolveItems, itemsPrompt, byRef, clampInt, BATCH_RULES } = require('./_scoringShared');

const CATS = ['hot', 'warm', 'cold', 'unqualified'];

module.exports = {
  id: 'smart-categorize',
  role: 'fast',
  effort: 'low',
  maxOutputTokens: 5000,
  schema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'the ref of the contact exactly as listed' },
            category: { type: 'string', enum: CATS },
            score: { type: 'integer', description: '0-100 buying-readiness score behind the category' },
            reason: { type: 'string', description: 'one sentence citing the data used' },
          },
        },
      },
    },
  },
  async load({ user, params }) {
    return { items: await resolveItems(user, params, 'contacts') };
  },
  buildInput(ctx, params) {
    return {
      instructions: `You sort sales contacts by buying readiness. ${BATCH_RULES} hot = score >= 70 (senior/decision maker at a fitting company with recent engagement), warm = 40-69, cold = 20-39, unqualified = below 20 or clearly not a fit. Weigh engagement and recency, seniority, company size/fit and the user's criteria. Today is ${new Date().toISOString().slice(0, 10)}.`,
      input: `Categorize these ${ctx.items.length} contacts.\n\nCriteria from the user: ${JSON.stringify(params.criteria || {}).slice(0, 2000)}\n\nContacts:\n${itemsPrompt(ctx.items)}`,
    };
  },
  finalize(parsed, ctx) {
    const found = byRef(parsed.results);
    const categories = { hot: [], warm: [], cold: [], unqualified: [], uncategorized: [] };
    const now = new Date().toISOString();
    for (const it of ctx.items) {
      const r = found.get(it.ref);
      if (!r || !CATS.includes(r.category)) {
        categories.uncategorized.push({ ...it.record, category: null, categorizedAt: now, score: null, reason: 'The AI returned no category for this contact' });
        continue;
      }
      categories[r.category].push({ ...it.record, category: r.category, categorizedAt: now, score: clampInt(r.score), reason: r.reason || '' });
    }
    return {
      categories,
      summary: { total: ctx.items.length, hot: categories.hot.length, warm: categories.warm.length, cold: categories.cold.length, unqualified: categories.unqualified.length, uncategorized: categories.uncategorized.length },
    };
  },
};
