/**
 * skills-api — the six agent skills (lib/skills): negotiation, budget objection, follow-up, risk analysis, research,
 * competitor intel.
 *   POST { action: 'list' }                          -> { skills: [{ id, description }] }
 *   POST { skillId, contactId, dealId?, lastMessage?, extra?: { subject?, market? } }
 *        -> { skillId, contactId, dealId, result }   result = reply text, or { risk_score, reason, next_move }
 * Streamed live (Accept: text/event-stream). Research / competitor_intel use web search and append their sources.
 * Reply-style skills are moderated before they leave.
 */
const { stream } = require('@netlify/functions');
const { withAuth } = require('./_auth');
const { createPanelHandler } = require('./_lib/panelHandler');
const { requireUuid, ownedContact, ownedDeal, latestDealForContact, TaskError } = require('./_lib/ctx');
const { listSkills, getSkill, withSources } = require('./_lib/skills');

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

const createHandler = createPanelHandler({
  endpoint: 'skills-api',
  parse(body) {
    if (body.action === 'list') return { action: 'list' };
    const skill = getSkill(body.skillId);
    if (!skill) throw new TaskError(400, 'Unknown skill');
    const extra = {};
    const src = body.extra && typeof body.extra === 'object' ? body.extra : {};
    if (clip(src.subject, 200)) extra.subject = clip(src.subject, 200);
    if (clip(src.market, 200)) extra.market = clip(src.market, 200);
    return {
      skill,
      contactId: requireUuid(body.contactId, 'contactId'),
      dealId: body.dealId ? requireUuid(body.dealId, 'dealId') : null,
      lastMessage: clip(body.lastMessage, 4000) || null,
      extra: Object.keys(extra).length ? extra : undefined,
    };
  },
  action(params) {
    return params.action === 'list' ? { skills: listSkills() } : null;
  },
  async load({ user, params }) {
    const contact = await ownedContact(user, params.contactId);
    const deal = params.dealId ? await ownedDeal(user, params.dealId) : await latestDealForContact(user, contact.id);
    return { contact, deal };
  },
  build(ctx, params) {
    const s = params.skill;
    const input = s.prompt({ contact: ctx.contact, deal: ctx.deal, lastMessage: params.lastMessage, extra: params.extra });
    return {
      role: s.role, effort: s.effort || 'low', input, tools: s.tools, schema: s.schema, schemaName: s.schemaName || s.id,
      maxOutputTokens: s.mode === 'json' ? 1500 : 2500,
      instructions: 'You work inside a CRM for the user\'s own pipeline. Use only the facts given; never invent facts about the contact. Follow the task format exactly.',
    };
  },
  finalize({ parsed, text, citations, ctx, params }) {
    const s = params.skill;
    let result;
    if (s.mode === 'json') {
      result = {
        risk_score: Math.max(0, Math.min(100, Math.round(Number(parsed.risk_score) || 0))),
        reason: String(parsed.reason || ''),
        next_move: String(parsed.next_move || ''),
      };
    } else {
      result = s.sources ? withSources(text, citations) : text;
    }
    return { skillId: s.id, contactId: ctx.contact.id, dealId: ctx.deal ? ctx.deal.id : null, result, citations: s.sources ? citations : [] };
  },
  outboundText(payload) {
    // reply-style skills only (the 'outbound' ones); research / risk analysis never leave the app
    const s = getSkill(payload.skillId);
    return s && s.outbound && typeof payload.result === 'string' ? [payload.result] : [];
  },
});

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
