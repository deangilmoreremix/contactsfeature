/**
 * Inbound webhook trigger.
 * POST /.netlify/functions/webhook-trigger?id=<endpointId>   header: X-Webhook-Secret: <secret>
 * JSON body (optional): { contact_id?, email?, ...any fields } -> available to conditions as `payload.*`
 * (and as the contact's own fields). Runs the owner's active automation rules whose trigger is
 * { type: 'webhook', endpoint_id } and active workflows whose trigger node has config.endpoint_id.
 * The secret is stored only as a SHA-256 hash and compared in constant time.
 */
const { supabase } = require('./_supabaseClient');
const { isUuid } = require('./_messaging/tracking');
const { evaluateCondition, walkWorkflow, secretMatches, executeAction } = require('./_automation');

const json = (statusCode, obj) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const id = event.queryStringParameters?.id;
  const secret = event.headers?.['x-webhook-secret'] || event.headers?.['X-Webhook-Secret'];
  if (!isUuid(id) || !secret) return json(401, { error: 'Unauthorized' });

  const { data: ep } = await supabase.from('webhook_endpoints').select('id, user_id, secret_hash, is_active').eq('id', id).eq('direction', 'inbound').maybeSingle();
  // Same response for unknown endpoint and wrong secret.
  if (!ep || !ep.is_active || !secretMatches(secret, ep.secret_hash)) return json(401, { error: 'Unauthorized' });

  let payload = {};
  try { payload = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { error: 'Invalid JSON' }); }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return json(400, { error: 'Body must be a JSON object' });

  const userId = ep.user_id;
  let contact = null;
  if (isUuid(payload.contact_id)) {
    ({ data: contact } = await supabase.from('contacts').select('*').eq('id', payload.contact_id).eq('user_id', userId).maybeSingle());
  } else if (typeof payload.email === 'string') {
    ({ data: contact } = await supabase.from('contacts').select('*').eq('email', payload.email).eq('user_id', userId).limit(1).maybeSingle());
  }
  const ctx = { ...(contact || {}), payload };

  const [{ data: rules }, { data: workflows }] = await Promise.all([
    supabase.from('automation_rules').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('workflows').select('*').eq('user_id', userId).eq('is_active', true),
  ]);

  const runs = [];
  const record = (row) => supabase.from('automation_runs').insert({ user_id: userId, contact_id: contact?.id || null, trigger: `webhook:${id}`, ...row });

  for (const rule of (rules || []).filter((r) => r.trigger?.type === 'webhook' && r.trigger?.endpoint_id === id)) {
    try {
      if (!evaluateCondition(rule.conditions || [], ctx)) { await record({ rule_id: rule.id, status: 'skipped', results: { reason: 'conditions not met' } }); runs.push({ rule: rule.id, status: 'skipped' }); continue; }
      const results = [];
      let failed = null;
      for (const action of rule.actions || []) {
        try { results.push({ type: action.type, ok: true, ...(await executeAction(supabase, userId, action, contact)) }); }
        catch (err) { failed = failed || err.message; results.push({ type: action.type, ok: false, error: err.message }); }
      }
      await record({ rule_id: rule.id, status: failed ? 'failed' : 'completed', results: { actions: results }, error: failed });
      runs.push({ rule: rule.id, status: failed ? 'failed' : 'completed' });
    } catch (err) {
      await record({ rule_id: rule.id, status: 'failed', error: err.message });
      runs.push({ rule: rule.id, status: 'failed' });
    }
  }

  for (const wf of (workflows || []).filter((w) => (w.nodes || []).some((n) => n.type === 'trigger' && n.config?.endpoint_id === id))) {
    const walk = walkWorkflow({ nodes: wf.nodes, edges: wf.edges }, ctx);
    const results = []; let failed = walk.status === 'error' ? walk.error : null;
    if (walk.status !== 'error') {
      for (const node of walk.actions) {
        const action = { type: node.config?.actionType || node.config?.type, config: node.config || {} };
        try { results.push({ node: node.id, ok: true, ...(await executeAction(supabase, userId, action, contact)) }); }
        catch (err) { failed = failed || err.message; results.push({ node: node.id, ok: false, error: err.message }); }
      }
    }
    await record({ workflow_id: wf.id, status: failed ? 'failed' : 'completed', results: { path: walk.path, paused_at: walk.pausedAt, actions: results }, error: failed });
    runs.push({ workflow: wf.id, status: failed ? 'failed' : 'completed' });
  }

  await supabase.from('webhook_endpoints').update({ last_triggered_at: new Date().toISOString(), last_status: runs.length ? 'ok' : 'no_matching_rules' }).eq('id', id);
  return json(200, { success: true, runs });
};
