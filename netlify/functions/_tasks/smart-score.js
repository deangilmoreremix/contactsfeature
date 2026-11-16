/** Exemplar task: AI lead score. Result keeps the old edge-function contract: { score, grade, factors[] } + reasoning. */
const { loadContact, recentEmails, recentTimeline, describeContact } = require('./_ctx');

const gradeOf = (s) => (s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F');

module.exports = {
  id: 'smart-score',
  role: 'fast',
  effort: 'low',
  schema: {
    type: 'object',
    properties: {
      score: { type: 'integer', description: '0-100 lead quality score' },
      factors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            factor: { type: 'string', description: 'short snake_case name, e.g. email_quality' },
            score: { type: 'integer', description: '0-100 for this factor' },
            weight: { type: 'number', description: '0-1 weight; weights sum to about 1' },
            evidence: { type: 'string', description: 'the data that justifies the score' },
          },
        },
      },
      reasoning: { type: 'string', description: 'two-sentence explanation' },
    },
  },
  async load({ user, params }) {
    const contact = await loadContact(user, params);
    return { contact, emails: await recentEmails(user, contact.id), timeline: await recentTimeline(user, contact.id) };
  },
  buildInput(ctx, params) {
    return {
      instructions: 'You score CRM leads for a B2B seller. Use ONLY the data given; never invent facts. Missing data lowers the score and is named in the evidence. Be consistent: factors cover contact quality, company fit, engagement and recency.',
      input: `Score this lead.\n\n${describeContact(ctx.contact)}\n\nRecent emails: ${JSON.stringify(ctx.emails)}\nRecent activity: ${JSON.stringify(ctx.timeline)}\nCriteria from the user: ${JSON.stringify(params.scoringCriteria || {})}`,
    };
  },
  finalize(parsed) {
    const score = Math.max(0, Math.min(100, Math.round(parsed.score || 0)));
    return { score, totalScore: score, grade: gradeOf(score), factors: parsed.factors || [], reasoning: parsed.reasoning || '', calculatedAt: new Date().toISOString() };
  },
};
