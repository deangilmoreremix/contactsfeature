// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
import * as TS from '../src/utils/conditionEvaluator';

vi.mock('../src/lib/supabase', () => ({ supabase: {} }));
const require = createRequire(import.meta.url);
const JS = require('../netlify/functions/_automation.js');

const ctx = { score: 72, status: 'Lead', company: 'Acme Inc', email: '', tags: ['vip', 'beta'], payload: { amount: '1500' } };

const cases: Array<[any, boolean]> = [
  [{ field: 'score', operator: 'greater_than', value: 50 }, true],
  [{ field: 'score', operator: 'less_than', value: 50 }, false],
  [{ field: 'status', operator: 'equals', value: 'lead' }, true],
  [{ field: 'status', operator: 'not_equals', value: 'customer' }, true],
  [{ field: 'company', operator: 'contains', value: 'acme' }, true],
  [{ field: 'email', operator: 'is_empty' }, true],
  [{ field: 'company', operator: 'is_not_empty' }, true],
  [{ field: 'missing', operator: 'is_empty' }, true],
  [{ field: 'missing', operator: 'greater_than', value: 1 }, false],
  [{ field: 'tags', operator: 'contains', value: 'vip' }, true],
  [{ field: 'payload.amount', operator: '>=', value: 1500 }, true],
  [{ field: 'status', operator: 'in', value: 'lead, customer' }, true],
  [{ all: [{ field: 'score', operator: '>', value: 10 }, { field: 'status', operator: '==', value: 'x' }] }, false],
  [{ any: [{ field: 'score', operator: '>', value: 100 }, { field: 'status', operator: '==', value: 'lead' }] }, true],
  [{ not: { field: 'score', operator: '>', value: 100 } }, true],
  [[], true],
  ['score > 50', true],
  ['status == "Lead"', true],
  ['company contains acme', true],
  ['score <= 10', false],
  ['false', false],
  ['true', true],
];

describe.each([['browser (TS)', TS], ['server (CJS)', JS]] as const)('condition evaluator - %s', (_n, E: any) => {
  it.each(cases)('%j -> %s', (cond, expected) => {
    expect(E.evaluateCondition(cond, ctx)).toBe(expected);
  });
  it('throws on unparseable or unknown operators instead of guessing', () => {
    expect(() => E.evaluateCondition('what is this', ctx)).toThrow(/parse/);
    expect(() => E.evaluateCondition({ field: 'a', operator: 'wat', value: 1 }, ctx)).toThrow(/operator/);
  });
});

const wf = {
  nodes: [
    { id: 't', type: 'trigger' },
    { id: 'c', type: 'condition', config: { condition: 'score > 50' } },
    { id: 'yes', type: 'action', config: { type: 'create_task' } },
    { id: 'no', type: 'action', config: { type: 'send_email' } },
    { id: 'd', type: 'delay' },
    { id: 'after', type: 'action' },
  ],
  edges: [
    { sourceId: 't', targetId: 'c' },
    { sourceId: 'c', targetId: 'yes', condition: 'true' },
    { sourceId: 'c', targetId: 'no', condition: 'false' },
    { sourceId: 'yes', targetId: 'd' },
    { sourceId: 'd', targetId: 'after' },
  ],
};

describe.each([['browser (TS)', TS], ['server (CJS)', JS]] as const)('workflow walker - %s', (_n, E: any) => {
  it('follows the true branch and pauses at delay nodes', () => {
    const r = E.walkWorkflow(wf, { score: 80 });
    expect(r.actions.map((a: any) => a.id)).toEqual(['yes']);
    expect(r.status).toBe('paused');
    expect(r.pausedAt).toEqual(['d']);
    expect(r.path.find((p: any) => p.nodeId === 'c').result).toBe(true);
  });
  it('follows the false branch', () => {
    const r = E.walkWorkflow(wf, { score: 10 });
    expect(r.actions.map((a: any) => a.id)).toEqual(['no']);
    expect(r.status).toBe('completed');
  });
  it('reports errors and missing triggers, and survives cycles', () => {
    expect(E.walkWorkflow({ nodes: [{ id: 'a', type: 'action' }], edges: [] }, {}).status).toBe('no_trigger');
    const bad = { nodes: [{ id: 't', type: 'trigger' }, { id: 'c', type: 'condition', config: { condition: '???' } }], edges: [{ sourceId: 't', targetId: 'c' }] };
    expect(E.walkWorkflow(bad, {}).status).toBe('error');
    const cyc = { nodes: [{ id: 't', type: 'trigger' }, { id: 'a', type: 'action' }], edges: [{ sourceId: 't', targetId: 'a' }, { sourceId: 'a', targetId: 't' }] };
    expect(E.walkWorkflow(cyc, {}).status).toBe('completed');
  });
});

describe('webhook security helpers', () => {
  it('compares secrets by hash in constant time', () => {
    const hash = JS.sha256Hex('s3cret');
    expect(JS.secretMatches('s3cret', hash)).toBe(true);
    expect(JS.secretMatches('s3cret2', hash)).toBe(false);
    expect(JS.secretMatches('', hash)).toBe(false);
    expect(JS.secretMatches('s3cret', 'zz')).toBe(false);
  });
  it('only allows https public webhook urls', () => {
    expect(JS.isSafeWebhookUrl('https://hooks.example.com/x')).toBe(true);
    for (const u of ['http://example.com', 'https://localhost/x', 'https://127.0.0.1/', 'https://10.0.0.5/', 'https://169.254.169.254/latest', 'https://192.168.1.1/', 'https://172.20.0.1/', 'https://[::1]/', 'https://user:pw@example.com/', 'ftp://x.com', 'nonsense'])
      expect(JS.isSafeWebhookUrl(u)).toBe(false);
  });
  it('signs payloads deterministically', () => {
    expect(JS.signPayload('k', '{"a":1}', '100')).toBe(JS.signPayload('k', '{"a":1}', '100'));
    expect(JS.signPayload('k', '{"a":1}', '100')).not.toBe(JS.signPayload('k2', '{"a":1}', '100'));
  });
});

describe('webhook-trigger handler', () => {
  function load(endpoint: any) {
    const tables: Record<string, any> = { webhook_endpoints: endpoint, automation_rules: [], workflows: [] };
    const q = (name: string): any => {
      const c: any = { select: () => c, eq: () => c, update: () => c, insert: () => Promise.resolve({}), limit: () => c,
        maybeSingle: () => Promise.resolve({ data: Array.isArray(tables[name]) ? null : tables[name] }),
        then: (r: any) => Promise.resolve({ data: tables[name] }).then(r) };
      return c;
    };
    require.cache[require.resolve('../netlify/functions/_supabaseClient.js')] = { exports: { supabase: { from: q } } } as any;
    delete require.cache[require.resolve('../netlify/functions/webhook-trigger.js')];
    return require('../netlify/functions/webhook-trigger.js').handler;
  }
  const id = '123e4567-e89b-12d3-a456-426614174000';
  const ep = { id, user_id: 'u1', is_active: true, secret_hash: JS.sha256Hex('right') };

  it('rejects wrong / missing secrets and unknown endpoints identically', async () => {
    const h = load(ep);
    const call = (secret: string | undefined, qid = id) => h({ httpMethod: 'POST', queryStringParameters: { id: qid }, headers: secret ? { 'x-webhook-secret': secret } : {}, body: '{}' });
    expect((await call('wrong')).statusCode).toBe(401);
    expect((await call(undefined)).statusCode).toBe(401);
    expect((await call('right', 'nope')).statusCode).toBe(401);
    expect((await load(null)({ httpMethod: 'POST', queryStringParameters: { id }, headers: { 'x-webhook-secret': 'right' }, body: '{}' })).statusCode).toBe(401);
    expect((await h({ httpMethod: 'GET', queryStringParameters: { id }, headers: {} })).statusCode).toBe(405);
  });
  it('accepts the right secret', async () => {
    const h = load(ep);
    const r = await h({ httpMethod: 'POST', queryStringParameters: { id }, headers: { 'x-webhook-secret': 'right' }, body: '{"hello":1}' });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).toEqual({ success: true, runs: [] });
  });
});

describe('AI rule normalisation', () => {
  it('maps schema output to the rule shape and rejects bad output', async () => {
    const { normalizeGeneratedRule, RULE_SCHEMA } = await import('../src/services/automationRuleGenerator');
    const rule = normalizeGeneratedRule({
      name: 'Hot lead task', description: 'd', trigger: { type: 'field_changed', field: 'status' },
      conditions: [{ field: 'score', operator: 'greater_than', value: '70' }, { field: '', operator: 'equals', value: 'x' }],
      actions: [{ type: 'create_task', field: null, value: null, subject: null, body: null, title: 'Call', due_in_days: 1 }],
    });
    expect(rule.trigger).toEqual({ type: 'field_changed', field: 'status' });
    expect(rule.conditions).toHaveLength(1);
    expect(rule.actions[0]).toEqual({ type: 'create_task', config: { title: 'Call', due_in_days: 1 } });
    expect(() => normalizeGeneratedRule({ name: 'x', trigger: { type: 'nope' }, actions: [] })).toThrow();
    expect(() => normalizeGeneratedRule({ name: 'x', trigger: { type: 'manual' }, actions: [{ type: 'send_email', subject: 's', body: null }] })).toThrow(/subject or body/);
    expect((RULE_SCHEMA as any).additionalProperties).toBe(false);
  });
});
