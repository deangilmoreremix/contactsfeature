/**
 * AI lead qualification (BANT-style) for up to 25 leads in ONE model call.
 * Old contract: { leads:{qualified[],unqualified[],needsMoreInfo[]}, summary:{total,qualified,unqualified,needsMoreInfo} }
 * where each lead is `{...lead, qualification:{score,status,reasons,requirements,nextSteps}, qualifiedAt}`.
 */
const { resolveItems, itemsPrompt, byRef, clampInt, asStrings, BATCH_RULES } = require('./_scoringShared');

const STATUSES = ['qualified', 'unqualified', 'needsMoreInfo'];

module.exports = {
  id: 'smart-qualify',
  role: 'default',
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
            contactId: { type: 'string', description: 'the ref of the lead exactly as listed' },
            score: { type: 'integer', description: '0-100 qualification score' },
            status: { type: 'string', enum: STATUSES },
            reasons: { type: 'array', items: { type: 'string' }, description: 'evidence-based reasons for the status' },
            requirements: { type: 'array', items: { type: 'string' }, description: 'information still missing to qualify' },
            nextSteps: { type: 'array', items: { type: 'string' }, description: 'concrete next steps for the seller' },
          },
        },
      },
    },
  },
  async load({ user, params }) {
    return { items: await resolveItems(user, params, 'leads') };
  },
  buildInput(ctx, params) {
    const rules = JSON.stringify(params.qualificationRules || {}).slice(0, 2000);
    return {
      instructions: `You qualify sales leads for a B2B seller on budget, authority, need and timeline. Use ONLY the data given. ${BATCH_RULES} Status: "qualified" = score >= 70 and the user's rules are met; "needsMoreInfo" = not disqualified but key information (budget, timeline, authority, need) is missing; "unqualified" = clear mismatch with the rules. Next steps must be specific and match the status.`,
      input: `Qualify these ${ctx.items.length} leads.\n\nQualification rules from the user: ${rules}\n\nLeads:\n${itemsPrompt(ctx.items)}`,
    };
  },
  finalize(parsed, ctx) {
    const found = byRef(parsed.results);
    const leads = { qualified: [], unqualified: [], needsMoreInfo: [] };
    const now = new Date().toISOString();
    for (const it of ctx.items) {
      const r = found.get(it.ref);
      const status = r && STATUSES.includes(r.status) ? r.status : 'needsMoreInfo';
      const qualification = r
        ? { score: clampInt(r.score) ?? 0, status, reasons: asStrings(r.reasons), requirements: asStrings(r.requirements), nextSteps: asStrings(r.nextSteps) }
        : { score: 0, status, reasons: [], requirements: ['The AI returned no assessment for this lead - run it again'], nextSteps: [] };
      leads[status].push({ ...it.record, qualification, qualifiedAt: now });
    }
    return {
      leads,
      summary: { total: ctx.items.length, qualified: leads.qualified.length, unqualified: leads.unqualified.length, needsMoreInfo: leads.needsMoreInfo.length },
    };
  },
};
