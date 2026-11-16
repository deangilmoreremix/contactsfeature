/**
 * Automation core (CommonJS). Pure parts: condition evaluator, workflow walker, webhook url safety
 * and secret hashing. DB-backed parts: executeAction / dispatchWebhook (service client, owner-scoped).
 * The browser has a mirror of the evaluator in src/utils/conditionEvaluator.ts (same test cases).
 */
const crypto = require('crypto');
const { merge, textToHtml } = require('./_sequences');

// ---------- condition evaluator ----------
const OPS = {
  equals: 'equals', eq: 'equals', '==': 'equals', '=': 'equals',
  not_equals: 'not_equals', ne: 'not_equals', '!=': 'not_equals',
  contains: 'contains', not_contains: 'not_contains', starts_with: 'starts_with',
  greater_than: 'gt', gt: 'gt', '>': 'gt', less_than: 'lt', lt: 'lt', '<': 'lt',
  gte: 'gte', '>=': 'gte', lte: 'lte', '<=': 'lte',
  is_empty: 'is_empty', is_not_empty: 'is_not_empty', in: 'in',
};

function getPath(obj, path) {
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const isNum = (v) => v !== '' && v !== null && v !== undefined && typeof v !== 'boolean' && Number.isFinite(Number(v));
function looseEq(a, b) {
  if (isNum(a) && isNum(b)) return Number(a) === Number(b);
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function parseExpression(expr) {
  const s = String(expr).trim();
  if (/^true$/i.test(s)) return { literal: true };
  if (/^false$/i.test(s)) return { literal: false };
  const m = s.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<|=|\bcontains\b|\bnot_contains\b|\bstarts_with\b|\bis_empty\b|\bis_not_empty\b)\s*(.*)$/i);
  if (!m) throw new Error(`Cannot parse condition: "${s}"`);
  let value = m[3].trim();
  if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
  return { field: m[1], operator: m[2].toLowerCase(), value };
}

function evaluateCondition(cond, data = {}) {
  if (cond == null || cond === '') return true;
  if (typeof cond === 'boolean') return cond;
  if (typeof cond === 'string') {
    const p = parseExpression(cond);
    return 'literal' in p ? p.literal : evaluateCondition(p, data);
  }
  if (Array.isArray(cond)) return cond.every((c) => evaluateCondition(c, data));
  if (cond.all) return cond.all.every((c) => evaluateCondition(c, data));
  if (cond.any) return cond.any.some((c) => evaluateCondition(c, data));
  if (cond.not) return !evaluateCondition(cond.not, data);
  const op = OPS[String(cond.operator || '').toLowerCase()];
  if (!op || !cond.field) throw new Error(`Unknown condition operator: ${cond.operator}`);
  const v = getPath(data, cond.field);
  const t = cond.value;
  switch (op) {
    case 'equals': return !isEmpty(v) && looseEq(v, t);
    case 'not_equals': return isEmpty(v) || !looseEq(v, t);
    case 'contains': return Array.isArray(v) ? v.some((x) => looseEq(x, t)) : String(v ?? '').toLowerCase().includes(String(t).toLowerCase());
    case 'not_contains': return !evaluateCondition({ field: cond.field, operator: 'contains', value: t }, data);
    case 'starts_with': return String(v ?? '').toLowerCase().startsWith(String(t).toLowerCase());
    case 'gt': return isNum(v) && isNum(t) && Number(v) > Number(t);
    case 'lt': return isNum(v) && isNum(t) && Number(v) < Number(t);
    case 'gte': return isNum(v) && isNum(t) && Number(v) >= Number(t);
    case 'lte': return isNum(v) && isNum(t) && Number(v) <= Number(t);
    case 'is_empty': return isEmpty(v);
    case 'is_not_empty': return !isEmpty(v);
    case 'in': return (Array.isArray(t) ? t : String(t).split(',')).some((x) => looseEq(v, x));
    default: return false;
  }
}

// ---------- workflow walker ----------
/**
 * Walk a workflow graph from its trigger node(s). Condition nodes pick the edges whose `condition`
 * equals 'true'/'false' (edges without a condition are always followed). Delay nodes stop that branch
 * (a delay cannot be executed synchronously) and are reported in `pausedAt`.
 * Returns { status, path, actions, pausedAt, error }.
 */
function walkWorkflow({ nodes = [], edges = [] }, ctx = {}, maxSteps = 200) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const starts = nodes.filter((n) => n.type === 'trigger');
  if (!starts.length) return { status: 'no_trigger', path: [], actions: [], pausedAt: [] };
  const path = []; const actions = []; const pausedAt = []; const seen = new Set();
  const queue = starts.map((n) => n.id);
  let steps = 0;
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    if (++steps > maxSteps) return { status: 'error', path, actions, pausedAt, error: 'Workflow exceeded step limit' };
    const node = byId.get(id);
    if (!node) continue;
    const entry = { nodeId: id, type: node.type };
    let out = edges.filter((e) => e.sourceId === id);
    if (node.type === 'condition') {
      try {
        entry.result = evaluateCondition(node.config?.condition, ctx);
      } catch (err) {
        path.push({ ...entry, error: err.message });
        return { status: 'error', path, actions, pausedAt, error: err.message };
      }
      out = out.filter((e) => e.condition == null || e.condition === '' || e.condition === String(entry.result));
    } else if (node.type === 'action') {
      actions.push(node);
    } else if (node.type === 'delay') {
      pausedAt.push(id); path.push(entry); continue;
    } else if (node.type === 'end') {
      path.push(entry); continue;
    }
    path.push(entry);
    out.forEach((e) => queue.push(e.targetId));
  }
  return { status: pausedAt.length ? 'paused' : 'completed', path, actions, pausedAt };
}

// ---------- webhook helpers ----------
const sha256Hex = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

/** Constant-time check of a presented secret against the stored sha256 hex hash. */
function secretMatches(presented, storedHash) {
  if (!presented || !storedHash) return false;
  const a = Buffer.from(sha256Hex(presented), 'hex');
  const b = Buffer.from(String(storedHash), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** https only and no obviously internal hosts (basic SSRF guard; DNS rebinding is not covered). */
function isSafeWebhookUrl(url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return false;
  if (/^\[/.test(h) || h.includes(':')) return false; // no IPv6 literals
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224) return false;
  }
  return true;
}

function signPayload(secret, body, ts) {
  return crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
}

async function dispatchWebhook(endpoint, event, payload) {
  if (!isSafeWebhookUrl(endpoint.url)) throw new Error('Webhook URL is not allowed (https and public hosts only)');
  const body = JSON.stringify({ event, data: payload, sent_at: new Date().toISOString() });
  const ts = String(Math.floor(Date.now() / 1000));
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'SmartCRM-Webhooks/1.0', 'X-SmartCRM-Event': event, 'X-SmartCRM-Timestamp': ts };
  if (endpoint.signing_secret) headers['X-SmartCRM-Signature'] = `sha256=${signPayload(endpoint.signing_secret, body, ts)}`;
  const res = await fetch(endpoint.url, { method: 'POST', headers, body, redirect: 'manual', signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
  return { status: res.status };
}

// ---------- action execution (server) ----------
const PROTECTED_FIELDS = new Set(['id', 'user_id', 'created_at', 'updated_at']);

async function executeAction(supabase, userId, action, contact) {
  const cfg = action.config || {};
  switch (action.type) {
    case 'send_email': {
      if (!contact?.email) throw new Error('Contact has no email address');
      if (!cfg.subject || !(cfg.body || cfg.body_text)) throw new Error('send_email action needs subject and body');
      const body = merge(cfg.body || cfg.body_text, contact);
      const { data, error } = await supabase.from('emails').insert({
        user_id: userId, contact_id: contact.id, to_email: contact.email, subject: merge(cfg.subject, contact),
        body_text: body, body_html: textToHtml(body), status: 'queued', scheduled_for: new Date().toISOString(), is_inbound: false,
      }).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      return { queued_email_id: data?.id };
    }
    case 'create_task': {
      if (!contact?.id) throw new Error('create_task needs a contact');
      const due = cfg.due_in_days != null ? new Date(Date.now() + Number(cfg.due_in_days) * 86400000).toISOString() : null;
      const { data, error } = await supabase.from('contact_tasks').insert({
        user_id: userId, contact_id: contact.id, title: merge(cfg.title || 'Follow up', contact), description: cfg.description || null,
        task_type: ['todo', 'call', 'email', 'meeting', 'note'].includes(cfg.task_type) ? cfg.task_type : 'todo', due_at: due,
      }).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      return { task_id: data?.id };
    }
    case 'update_field': {
      if (!contact?.id || !cfg.field || PROTECTED_FIELDS.has(cfg.field)) throw new Error('update_field: invalid contact or field');
      const { error } = await supabase.from('contacts').update({ [cfg.field]: cfg.value }).eq('id', contact.id).eq('user_id', userId);
      if (error) throw new Error(error.message);
      return { updated: cfg.field };
    }
    case 'webhook': {
      if (!cfg.endpoint_id) throw new Error('webhook action needs endpoint_id');
      const { data: ep } = await supabase.from('webhook_endpoints').select('*').eq('id', cfg.endpoint_id).eq('user_id', userId).eq('direction', 'outbound').eq('is_active', true).maybeSingle();
      if (!ep) throw new Error('Outbound webhook endpoint not found or inactive');
      return dispatchWebhook(ep, 'automation.action', { contact: contact ? { id: contact.id, email: contact.email, name: contact.name } : null });
    }
    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}

module.exports = { getPath, parseExpression, evaluateCondition, walkWorkflow, sha256Hex, secretMatches, isSafeWebhookUrl, signPayload, dispatchWebhook, executeAction };
