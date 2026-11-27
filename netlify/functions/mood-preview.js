/**
 * mood-preview — which tone the agents will use for a contact (lib/mood determineMood, rule based) and, streamed,
 * the model's rationale plus a sample opener written in that tone.
 * POST { contactId } -> { contactId, mood, modifier, reason, contact, deal, rationale, sample_message }
 * The sample message is moderated like any outbound copy.
 */
const { stream } = require('@netlify/functions');
const { withAuth } = require('./_auth');
const { createPanelHandler } = require('./_lib/panelHandler');
const { requireUuid, ownedContact, latestDealForContact, describeContact } = require('./_lib/ctx');
const { determineMood, applyMood, moodReason, moodModifiers } = require('./_lib/mood');

const SCHEMA = {
  type: 'object',
  properties: {
    rationale: { type: 'string', description: '2 sentences: why this tone fits this contact and deal right now' },
    sample_message: { type: 'string', description: 'a 2-4 sentence opener to this contact written in the mood profile' },
  },
};

const pick = (o, keys) => (o ? Object.fromEntries(keys.filter((k) => o[k] !== undefined && o[k] !== null).map((k) => [k, o[k]])) : null);

const createHandler = createPanelHandler({
  endpoint: 'mood-preview',
  parse(body) { return { contactId: requireUuid(body.contactId, 'contactId') }; },
  async load({ user, params }) {
    const contact = await ownedContact(user, params.contactId);
    const deal = await latestDealForContact(user, contact.id);
    return { contact, deal, mood: determineMood(contact, deal) };
  },
  build(ctx) {
    const base = `Contact:\n${describeContact(ctx.contact)}\n\nDeal: ${JSON.stringify(pick(ctx.deal, ['stage', 'value', 'risk_score', 'objection_level', 'days_since_reply', 'stage_stagnation']) || 'none')}\n\nThe rule-based mood engine chose the mood "${ctx.mood}" because: ${moodReason(ctx.contact, ctx.deal)}\n\nExplain in 2 sentences why this tone fits, then write a short opener to ${ctx.contact.name || 'the contact'}. Use only the facts above.`;
    return {
      role: 'fast', effort: 'low', schema: SCHEMA, schemaName: 'mood_preview', maxOutputTokens: 900,
      instructions: 'You are an SDR messaging assistant. Never invent facts about the contact.',
      input: applyMood(base, ctx.mood),
    };
  },
  finalize({ parsed, ctx }) {
    return {
      contactId: ctx.contact.id,
      mood: ctx.mood,
      modifier: moodModifiers[ctx.mood].trim(),
      reason: moodReason(ctx.contact, ctx.deal),
      contact: pick(ctx.contact, ['id', 'name', 'company', 'title', 'status']),
      deal: pick(ctx.deal, ['id', 'stage', 'value', 'risk_score', 'objection_level']),
      rationale: String(parsed.rationale || ''),
      sample_message: String(parsed.sample_message || ''),
    };
  },
  outboundText: (p) => [p.sample_message],
});

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
