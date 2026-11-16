/**
 * deal-heatmap — deal risk from the caller's REAL deals, with the AI's reasoning streamed.
 *   POST { dealId }  -> { mode:'single', dealId, deal, contact, risk_score, reason, next_action, factors, baseline_score }
 *   POST {}          -> { mode:'portfolio', summary, deals:[{ deal_id, title, stage, value, contact_name, risk_score, reason,
 *                         next_action, factors, baseline_score }] }  (open deals, riskiest first, at most 25)
 * `factors` are the deal's own numbers (days since reply, objection level, stagnation …); `baseline_score` is a simple
 * transparent rule of thumb on those numbers; `risk_score` is the model's assessment (as lib/heatmap/computeDealRisk).
 * Nothing is written back to the deals table.
 */
const { stream } = require('@netlify/functions');
const { withAuth } = require('./_auth');
const { supabase } = require('./_supabaseClient');
const { createPanelHandler } = require('./_lib/panelHandler');
const { requireUuid, ownedDeal, ownedContact, TaskError } = require('./_lib/ctx');
const H = require('./_lib/heatmap');

const createHandler = createPanelHandler({
  endpoint: 'deal-heatmap',
  parse(body) { return { dealId: body.dealId ? requireUuid(body.dealId, 'dealId') : null }; },
  async load({ user, params, deps }) {
    const now = (deps && deps.now) || Date.now();
    if (params.dealId) {
      const deal = await ownedDeal(user, params.dealId);
      let contact = null;
      if (deal.contact_id) {
        try { contact = await ownedContact(user, deal.contact_id); } catch (e) { if (!(e instanceof TaskError) || e.status !== 404) throw e; }
      }
      const factors = H.dealFactors(deal, now);
      return { mode: 'single', deal, contact, factors, baseline: H.baselineRisk(factors) };
    }

    const { data, error } = await supabase.from('deals').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(200);
    if (error) throw new TaskError(500, 'Could not load your deals');
    const open = (data || []).filter(H.isOpenDeal).map((d) => {
      const factors = H.dealFactors(d, now);
      return { deal: d, factors, baseline: H.baselineRisk(factors) };
    }).sort((a, b) => b.baseline - a.baseline || (Number(b.deal.value) || 0) - (Number(a.deal.value) || 0)).slice(0, H.MAX_PORTFOLIO);
    if (!open.length) {
      return { shortCircuit: { mode: 'portfolio', summary: null, deals: [], message: 'You have no open deals to assess yet.' } };
    }
    const ids = [...new Set(open.map((o) => o.deal.contact_id).filter(Boolean))];
    const names = {};
    if (ids.length) {
      const { data: cs } = await supabase.from('contacts').select('id,name,company').in('id', ids).eq('user_id', user.id);
      for (const c of cs || []) names[c.id] = c.name || c.company || null;
    }
    return { mode: 'portfolio', open, names };
  },
  build(ctx) {
    if (ctx.mode === 'single') {
      return {
        role: 'thinking', effort: 'low', schema: H.SINGLE_SCHEMA, schemaName: 'deal_risk', maxOutputTokens: 1200,
        instructions: 'You assess risk on the user\'s own deals. Use only the data given; missing values mean "not tracked".',
        input: H.buildRiskPrompt(ctx.contact, ctx.deal),
      };
    }
    const facts = ctx.open.map((o) => ({ deal_id: o.deal.id, title: o.deal.title || null, contact: ctx.names[o.deal.contact_id] || null, ...o.factors, baseline_score: o.baseline }));
    return {
      role: 'thinking', effort: 'low', schema: H.PORTFOLIO_SCHEMA, schemaName: 'deal_heatmap', maxOutputTokens: 4000,
      instructions: 'You assess risk on the user\'s own deals. Use only the data given; missing values mean "not tracked".',
      input: H.buildPortfolioPrompt(facts),
    };
  },
  finalize({ parsed, ctx }) {
    if (ctx.mode === 'single') {
      return {
        mode: 'single', dealId: ctx.deal.id, deal: ctx.deal,
        contact: ctx.contact ? { id: ctx.contact.id, name: ctx.contact.name || null, email: ctx.contact.email || null, status: ctx.contact.status || null } : null,
        risk_score: H.clampScore(parsed.risk_score, ctx.deal.risk_score || 0),
        reason: String(parsed.reason || ''), next_action: String(parsed.next_action || ''),
        factors: ctx.factors, baseline_score: ctx.baseline,
      };
    }
    const byId = new Map((Array.isArray(parsed.deals) ? parsed.deals : []).map((d) => [d && d.deal_id, d]));
    const deals = ctx.open.map((o) => {
      const a = byId.get(o.deal.id);
      return {
        deal_id: o.deal.id, title: o.deal.title || null, stage: o.deal.stage || null, value: o.factors.value,
        contact_name: ctx.names[o.deal.contact_id] || null,
        risk_score: a ? H.clampScore(a.risk_score, o.baseline) : o.baseline,
        reason: a ? String(a.reason || '') : 'The model did not assess this deal; the score is the rule-of-thumb baseline.',
        next_action: a ? String(a.next_action || '') : '',
        assessed: !!a, factors: o.factors, baseline_score: o.baseline,
      };
    }).sort((a, b) => b.risk_score - a.risk_score);
    return { mode: 'portfolio', summary: String(parsed.summary || ''), deals };
  },
});

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
