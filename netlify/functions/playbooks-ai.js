/**
 * playbooks-ai — sales playbook for a contact and/or deal, grounded in the caller's own pipeline.
 * POST { contactId?, dealId? } (at least one) ->
 *   { contactId, dealId, summary, data_basis, top_scripts[{name,script,when_to_use}], objections[{objection,response}],
 *     followups[{timing,channel,message}], win_factors[], history:{won,lost,open} }
 * Context read for the CALLER only: the deal/contact, their closed-deal tally, their saved adaptive playbooks and
 * recent emails with the contact. With fewer than 3 closed deals the playbook says it is best practice, not learned.
 * Scripts, responses and follow-ups are moderated.
 */
const { stream } = require('@netlify/functions');
const { withAuth } = require('./_auth');
const { supabase } = require('./_supabaseClient');
const { createPanelHandler } = require('./_lib/panelHandler');
const { requireUuid, ownedContact, ownedDeal, latestDealForContact, describeContact, TaskError } = require('./_lib/ctx');
const { recentEmails } = require('./_tasks/_ctx');
const { isOpenDeal } = require('./_lib/heatmap');

const str = { type: 'string' };
const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2-3 sentences: the angle that should win this deal' },
    data_basis: { type: 'string', description: 'what the playbook is grounded in; say plainly when it is generic best practice' },
    top_scripts: { type: 'array', items: { type: 'object', properties: { name: str, script: str, when_to_use: str } } },
    objections: { type: 'array', items: { type: 'object', properties: { objection: str, response: str } } },
    followups: { type: 'array', items: { type: 'object', properties: { timing: str, channel: str, message: str } } },
    win_factors: { type: 'array', items: str, description: 'why deals like this are won, from the history when there is any' },
  },
};

const CLOSED = /^(closed[\s_-]*)?(won|lost)$/i;

const createHandler = createPanelHandler({
  endpoint: 'playbooks-ai',
  parse(body) {
    const contactId = body.contactId ? requireUuid(body.contactId, 'contactId') : null;
    const dealId = body.dealId ? requireUuid(body.dealId, 'dealId') : null;
    if (!contactId && !dealId) throw new TaskError(400, 'Enter at least a contact ID or deal ID.');
    return { contactId, dealId };
  },
  async load({ user, params }) {
    const deal = params.dealId ? await ownedDeal(user, params.dealId) : null;
    const contactId = params.contactId || (deal && deal.contact_id) || null;
    const contact = contactId ? await ownedContact(user, contactId) : null;
    const focusDeal = deal || (contact ? await latestDealForContact(user, contact.id) : null);

    const { data: dealRows } = await supabase.from('deals').select('id,stage,value,closed_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
    const all = dealRows || [];
    const won = all.filter((d) => /won/i.test(String(d.stage || '')) && CLOSED.test(String(d.stage).trim()));
    const lost = all.filter((d) => /lost/i.test(String(d.stage || '')) && CLOSED.test(String(d.stage).trim()));
    const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, d) => s + (Number(d.value) || 0), 0) / xs.length) : null);
    const history = { won: won.length, lost: lost.length, open: all.filter(isOpenDeal).length, avg_won_value: avg(won) };

    const { data: pbs } = await supabase.from('adaptive_playbooks').select('name,description,deal_type,industry,phases,effectiveness_score,times_used').eq('user_id', user.id).eq('active', true).limit(5);
    const emails = contact ? await recentEmails(user, contact.id, 6) : [];
    return { contact, deal: focusDeal, history, playbooks: pbs || [], emails };
  },
  build(ctx) {
    const lines = [
      ctx.contact && `Contact:\n${describeContact(ctx.contact)}`,
      ctx.deal && `Deal: ${JSON.stringify({ stage: ctx.deal.stage, value: ctx.deal.value, objection_level: ctx.deal.objection_level, days_since_reply: ctx.deal.days_since_reply, risk_score: ctx.deal.risk_score })}`,
      `Your closed-deal history: ${JSON.stringify(ctx.history)}`,
      ctx.playbooks.length ? `Saved playbooks of the user: ${JSON.stringify(ctx.playbooks).slice(0, 4000)}` : null,
      ctx.emails.length ? `Recent emails with the contact (subject/status only): ${JSON.stringify(ctx.emails)}` : null,
    ].filter(Boolean).join('\n\n');
    return {
      role: 'default', effort: 'low', schema: SCHEMA, schemaName: 'playbook', maxOutputTokens: 3500,
      instructions: 'You build practical B2B sales playbooks for a solo seller. Ground everything in the data given and never invent facts about the contact. If the user has fewer than 3 closed deals, say in data_basis that the playbook is best practice, not learned from their results. Scripts must be ready to paste.',
      input: `${lines}\n\nBuild the playbook: the best scripts (2-3), the likely objections with responses (3-4), a follow-up cadence (3-4 steps) and why deals like this are won.`,
    };
  },
  finalize({ parsed, ctx }) {
    const arr = (v) => (Array.isArray(v) ? v : []);
    return {
      contactId: ctx.contact ? ctx.contact.id : null,
      dealId: ctx.deal ? ctx.deal.id : null,
      summary: String(parsed.summary || ''),
      data_basis: String(parsed.data_basis || ''),
      top_scripts: arr(parsed.top_scripts),
      objections: arr(parsed.objections),
      followups: arr(parsed.followups),
      win_factors: arr(parsed.win_factors).map(String),
      history: ctx.history,
    };
  },
  outboundText: (p) => [
    ...p.top_scripts.map((s) => s.script),
    ...p.objections.map((o) => o.response),
    ...p.followups.map((f) => f.message),
  ],
});

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
