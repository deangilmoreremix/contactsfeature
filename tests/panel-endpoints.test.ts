// @vitest-environment node
/**
 * The panel endpoints that used to be missing: memory-get, skills-api, mood-preview, playbooks-ai, deal-heatmap,
 * video-agent, voice-agent, agent-runner. JSON + stream mode, ownership 404, strict schemas, moderation of outbound copy.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

(globalThis as any).awslambda ||= { streamifyResponse: (f: unknown) => f, HttpResponseStream: { from: (s: unknown) => s } };
const require = createRequire(import.meta.url);

const C1 = '11111111-1111-4111-8111-111111111111';
const C_OTHER = '22222222-2222-4222-8222-222222222222';
const D1 = '33333333-3333-4333-8333-333333333331';
const D2 = '33333333-3333-4333-8333-333333333332';
const D_WON = '33333333-3333-4333-8333-333333333333';
const D_OTHER = '33333333-3333-4333-8333-333333333334';
const NOW = Date.parse('2026-04-01T00:00:00Z');

const rows: Record<string, any[]> = {};
function resetRows() {
  rows.contacts = [
    { id: C1, user_id: 'u1', name: 'Ada Lovelace', email: 'ada@acme.io', company: 'Acme', title: 'CTO', status: 'lead' },
    { id: C_OTHER, user_id: 'u2', name: 'Secret Person', email: 'secret@x.io', company: 'SecretCo', status: 'lead' },
  ];
  rows.deals = [
    { id: D1, user_id: 'u1', contact_id: C1, title: 'Acme expansion', stage: 'proposal', value: 12000, risk_score: 20, days_since_reply: 12, objection_level: 4, stage_stagnation: 20, updated_at: '2026-03-20T00:00:00Z', created_at: '2026-03-01T00:00:00Z', closed_at: null },
    { id: D2, user_id: 'u1', contact_id: null, title: 'Beta pilot', stage: 'discovery', value: 3000, risk_score: 0, days_since_reply: 1, objection_level: 0, stage_stagnation: 2, updated_at: '2026-03-31T00:00:00Z', created_at: '2026-03-10T00:00:00Z', closed_at: null },
    { id: D_WON, user_id: 'u1', contact_id: null, title: 'Old win', stage: 'won', value: 9000, updated_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', closed_at: '2026-02-01T00:00:00Z' },
    { id: D_OTHER, user_id: 'u2', contact_id: C_OTHER, title: 'SECRET DEAL', stage: 'proposal', value: 999999, updated_at: '2026-03-30T00:00:00Z', created_at: '2026-03-01T00:00:00Z', closed_at: null },
  ];
  rows.agent_memory = [
    { id: 'm1', contact_id: C1, memory_type: 'short', data: { last_message: 'Sent pricing', last_agent: 'sdr' }, updated_at: '2026-03-30T00:00:00Z' },
    { id: 'm2', contact_id: C1, memory_type: 'mid', data: { tone_preferences: ['brief'] }, updated_at: '2026-03-29T00:00:00Z' },
    { id: 'm3', contact_id: C_OTHER, memory_type: 'long', data: { history_summary: 'SECRET MEMORY' }, updated_at: '2026-03-29T00:00:00Z' },
  ];
  rows.emails = [];
  rows.contact_timeline = [];
  rows.adaptive_playbooks = [{ user_id: 'u1', name: 'Enterprise land', active: true }, { user_id: 'u2', name: 'SECRET PLAYBOOK', active: true }];
}

function fakeSupabase() {
  const from = (table: string) => {
    let data = [...(rows[table] || [])];
    const q: any = {
      select: () => q, limit: (n: number) => { data = data.slice(0, n); return q; },
      order: (col: string, o?: { ascending?: boolean }) => { const dir = o && o.ascending === true ? 1 : -1; data = [...data].sort((a, b) => (a[col] > b[col] ? dir : a[col] < b[col] ? -dir : 0)); return q; },
      is: (k: string, v: any) => { data = data.filter((r) => (r[k] ?? null) === v); return q; },
      eq: (k: string, v: any) => { data = data.filter((r) => r[k] === v); return q; },
      in: (k: string, v: any[]) => { data = data.filter((r) => v.includes(r[k])); return q; },
      maybeSingle: async () => ({ data: data[0] || null, error: null }),
      then: (res: any) => res({ data, error: null }),
    };
    return q;
  };
  return { from };
}

beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
  const sc = path.resolve('netlify/functions/_supabaseClient.js');
  require.cache[sc] = { id: sc, filename: sc, loaded: true, exports: { supabase: fakeSupabase(), getUserClient: () => fakeSupabase() } } as any;
});
beforeEach(resetRows);

function fakeResponses(text: string, citations: Array<{ url: string; title: string }> = []) {
  return {
    createResponse: vi.fn().mockResolvedValue({ text, citations, usage: { input_tokens: 10, output_tokens: 5 } }),
    streamResponse: vi.fn(async function* () {
      yield { type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_1' };
      yield { type: 'delta', text: text.slice(0, 15) };
      yield { type: 'partial', json: { x: 1 } };
      yield { type: 'delta', text: text.slice(15) };
      yield { type: 'done', id: 'resp_1', text, usage: { input_tokens: 10, output_tokens: 5 }, citations };
    }),
  };
}
const deps = (responses: any, extra: Record<string, unknown> = {}) => ({
  responses, underRateLimit: async () => true, withinTokenBudget: async () => ({ ok: true }),
  logUsage: vi.fn().mockResolvedValue(undefined), checkOutbound: vi.fn().mockResolvedValue({ ok: true }), now: NOW, ...extra,
});
const ev = (body: any, accept = '') => ({ httpMethod: 'POST', body: JSON.stringify(body), headers: accept ? { accept } : {} });
const user = { id: 'u1' };
const handler = (file: string, d: any) => require(`../netlify/functions/${file}.js`).createHandler(d);

async function wire(res: any) {
  let out = '';
  for await (const c of res.body) out += c.toString();
  return out;
}
const types = (w: string) => [...w.matchAll(/"type":"(\w+)"/g)].map((m) => m[1]);
const resultOf = (w: string) => JSON.parse(w.split('\n').find((l) => l.includes('"type":"result"'))!.replace(/^data: /, '')).data;

describe('memory-get', () => {
  const brief = JSON.stringify({ summary: 'Prefers short emails.', key_facts: ['Got pricing'], preferences: ['brief'], avoid: [] });

  it('JSON: returns the three layers of the caller\'s contact + an AI brief built from the memory block', async () => {
    const r = fakeResponses(brief);
    const res = await handler('memory-get', deps(r))(ev({ contactId: C1 }), user);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.memory.short).toHaveLength(1);
    expect(body.memory.mid).toHaveLength(1);
    expect(body.memory.long).toHaveLength(0);
    expect(body.brief.summary).toBe('Prefers short emails.');
    const sent = r.createResponse.mock.calls[0][0];
    expect(sent.schema).toBeTruthy();
    expect(sent.input).toContain('Sent pricing');
    expect(sent.input).toContain('==== MEMORY CONTEXT ====');
  });

  it('stream: status/delta/partial -> result == JSON payload -> done', async () => {
    const res = await handler('memory-get', deps(fakeResponses(brief)))(ev({ contactId: C1, stream: true }, 'text/event-stream'), user);
    expect(res.headers['Content-Type']).toContain('text/event-stream');
    const w = await wire(res);
    expect(types(w).slice(0, 6)).toEqual(['status', 'delta', 'partial', 'delta', 'result', 'done']);
    expect(resultOf(w).brief.preferences).toEqual(['brief']);
  });

  it('no memory yet: no model call, honest empty payload (JSON and stream)', async () => {
    rows.agent_memory = [];
    const r = fakeResponses(brief);
    const j = await handler('memory-get', deps(r))(ev({ contactId: C1 }), user);
    expect(JSON.parse(j.body)).toMatchObject({ total: 0, brief: null });
    const s = await handler('memory-get', deps(r))(ev({ contactId: C1, stream: true }, 'text/event-stream'), user);
    expect(types(await wire(s))).toEqual(['result', 'done']);
    expect(r.createResponse).not.toHaveBeenCalled();
    expect(r.streamResponse).not.toHaveBeenCalled();
  });

  it("another user's contact is a 404 and its memory never reaches the prompt; bad ids are 400", async () => {
    const r = fakeResponses(brief);
    const h = handler('memory-get', deps(r));
    expect((await h(ev({ contactId: C_OTHER }), user)).statusCode).toBe(404);
    expect((await h(ev({ contactId: 'nope' }), user)).statusCode).toBe(400);
    expect((await h({ httpMethod: 'POST', body: '{', headers: {} }, user)).statusCode).toBe(400);
    expect(JSON.stringify(r.createResponse.mock.calls)).not.toContain('SECRET');
  });
});

describe('skills-api', () => {
  it('lists the six skills without calling the model', async () => {
    const r = fakeResponses('x');
    const res = await handler('skills-api', deps(r))(ev({ action: 'list' }), user);
    const { skills } = JSON.parse(res.body);
    expect(skills.map((s: any) => s.id)).toEqual(['negotiation', 'budget_objection', 'competitor_intel', 'research', 'follow_up', 'risk_analysis']);
    expect(r.createResponse).not.toHaveBeenCalled();
  });

  it('text skill: plain text in JSON mode; deltas then result in stream mode', async () => {
    const reply = 'Thanks for flagging budget. Let us start with a small pilot.';
    const d = deps(fakeResponses(reply));
    const j = await handler('skills-api', d)(ev({ skillId: 'budget_objection', contactId: C1, lastMessage: 'No budget' }), user);
    expect(JSON.parse(j.body)).toMatchObject({ skillId: 'budget_objection', contactId: C1, dealId: D1, result: reply });
    const sent = d.responses.createResponse.mock.calls[0][0];
    expect(sent.schema).toBeUndefined();
    expect(sent.input).toContain('No budget');
    expect(d.checkOutbound).toHaveBeenCalledWith(expect.objectContaining({ texts: [reply], endpoint: 'skills-api' }));
    const s = await handler('skills-api', deps(fakeResponses(reply)))(ev({ skillId: 'budget_objection', contactId: C1, stream: true }, 'text/event-stream'), user);
    const w = await wire(s);
    expect(types(w)).toContain('delta');
    expect(resultOf(w).result).toBe(reply);
  });

  it('moderation: a flagged reply is blocked (422 in JSON mode, error event while streaming)', async () => {
    const reply = 'something awful';
    const d = deps(fakeResponses(reply), { checkOutbound: vi.fn().mockResolvedValue({ ok: false, categories: ['harassment'] }) });
    const j = await handler('skills-api', d)(ev({ skillId: 'follow_up', contactId: C1 }), user);
    expect(j.statusCode).toBe(422);
    expect(JSON.parse(j.body)).toMatchObject({ code: 'CONTENT_FLAGGED', categories: ['harassment'] });
    const s = await handler('skills-api', d)(ev({ skillId: 'follow_up', contactId: C1, stream: true }, 'text/event-stream'), user);
    const w = await wire(s);
    expect(types(w)).toContain('error');
    expect(types(w)).not.toContain('result');
  });

  it('research uses web search and appends the sources; it is not moderated (never leaves the app)', async () => {
    const d = deps(fakeResponses('Acme builds rockets.', [{ url: 'https://acme.io', title: 'Acme' }]));
    const j = await handler('skills-api', d)(ev({ skillId: 'research', contactId: C1, extra: { subject: 'Acme Inc', junk: 'x' } }), user);
    const body = JSON.parse(j.body);
    expect(body.result).toBe('Acme builds rockets.\n\nSources:\n- Acme: https://acme.io');
    const sent = d.responses.createResponse.mock.calls[0][0];
    expect(sent.tools).toEqual([{ type: 'web_search' }]);
    expect(sent.input).toContain('Acme Inc');
    expect(sent.input).not.toContain('junk');
    expect(d.checkOutbound).toHaveBeenCalledWith(expect.objectContaining({ texts: [] }));
  });

  it('risk_analysis: strict schema is sent and the result is clamped', async () => {
    const d = deps(fakeResponses(JSON.stringify({ risk_score: 140, reason: 'Silent for 12 days.', next_move: 'Call.' })));
    const j = await handler('skills-api', d)(ev({ skillId: 'risk_analysis', contactId: C1, dealId: D1 }), user);
    expect(JSON.parse(j.body).result).toEqual({ risk_score: 100, reason: 'Silent for 12 days.', next_move: 'Call.' });
    expect(d.responses.createResponse.mock.calls[0][0].schema.properties).toHaveProperty('risk_score');
  });

  it('input validation + ownership: unknown skill 400, foreign contact/deal 404, garbage output errors', async () => {
    const r = fakeResponses('{}');
    const h = handler('skills-api', deps(r));
    expect((await h(ev({ skillId: 'nope', contactId: C1 }), user)).statusCode).toBe(400);
    expect((await h(ev({ skillId: 'follow_up', contactId: 'x' }), user)).statusCode).toBe(400);
    expect((await h(ev({ skillId: 'follow_up', contactId: C_OTHER }), user)).statusCode).toBe(404);
    expect((await h(ev({ skillId: 'risk_analysis', contactId: C1, dealId: D_OTHER }), user)).statusCode).toBe(404);
    expect(JSON.stringify(r.createResponse.mock.calls)).not.toContain('SECRET');
    const bad = await handler('skills-api', deps(fakeResponses('not json')))(ev({ skillId: 'risk_analysis', contactId: C1 }), user);
    expect(bad.statusCode).toBe(502);
  });

  it('rate limit and token budget short-circuit before any model call', async () => {
    const r = fakeResponses('x');
    expect((await handler('skills-api', deps(r, { underRateLimit: async () => false }))(ev({ skillId: 'follow_up', contactId: C1 }), user)).statusCode).toBe(429);
    expect((await handler('skills-api', deps(r, { withinTokenBudget: async () => ({ ok: false, tokens: 9e6 }) }))(ev({ skillId: 'follow_up', contactId: C1 }), user)).statusCode).toBe(413);
    expect(r.createResponse).not.toHaveBeenCalled();
  });

  it('logs usage with the endpoint name', async () => {
    const d = deps(fakeResponses('Hello there friend, this is a reply.'));
    await handler('skills-api', d)(ev({ skillId: 'follow_up', contactId: C1 }), user);
    expect(d.logUsage).toHaveBeenCalledWith('u1', 'skills-api', expect.anything(), { input_tokens: 10, output_tokens: 5 }, 'ok');
  });
});

describe('mood-preview', () => {
  const out = JSON.stringify({ rationale: 'Proposal stage wants precision.', sample_message: 'Hi Ada, here are the numbers.' });

  it('rule-based mood + streamed rationale and moderated sample', async () => {
    const d = deps(fakeResponses(out));
    const j = await handler('mood-preview', d)(ev({ contactId: C1 }), user);
    const body = JSON.parse(j.body);
    expect(body).toMatchObject({ contactId: C1, mood: 'precision', rationale: 'Proposal stage wants precision.', sample_message: 'Hi Ada, here are the numbers.' });
    expect(body.contact.name).toBe('Ada Lovelace');
    expect(body.deal.stage).toBe('proposal');
    expect(d.responses.createResponse.mock.calls[0][0].input).toContain('MOOD PROFILE: PRECISION');
    expect(d.checkOutbound).toHaveBeenCalledWith(expect.objectContaining({ texts: ['Hi Ada, here are the numbers.'] }));
    const w = await wire(await handler('mood-preview', deps(fakeResponses(out)))(ev({ contactId: C1, stream: true }, 'text/event-stream'), user));
    expect(resultOf(w).mood).toBe('precision');
  });

  it('404 for a foreign contact; flagged sample is blocked', async () => {
    expect((await handler('mood-preview', deps(fakeResponses(out)))(ev({ contactId: C_OTHER }), user)).statusCode).toBe(404);
    const flagged = deps(fakeResponses(out), { checkOutbound: vi.fn().mockResolvedValue({ ok: false, categories: ['hate'] }) });
    expect((await handler('mood-preview', flagged)(ev({ contactId: C1 }), user)).statusCode).toBe(422);
  });
});

describe('playbooks-ai', () => {
  const pb = JSON.stringify({
    summary: 'Lead with ROI.', data_basis: 'Generic best practice (1 closed deal).',
    top_scripts: [{ name: 'ROI opener', script: 'Hi Ada, ...', when_to_use: 'First call' }],
    objections: [{ objection: 'Too pricey', response: 'Let us pilot.' }],
    followups: [{ timing: 'Day 2', channel: 'email', message: 'Quick recap.' }], win_factors: ['Multi-threading'],
  });

  it('builds from the caller\'s own deal, history and playbooks only; moderates scripts', async () => {
    const d = deps(fakeResponses(pb));
    const j = await handler('playbooks-ai', d)(ev({ dealId: D1 }), user);
    const body = JSON.parse(j.body);
    expect(body).toMatchObject({ dealId: D1, contactId: C1, summary: 'Lead with ROI.', history: { won: 1, lost: 0, open: 2 } });
    expect(body.top_scripts[0].name).toBe('ROI opener');
    const sent = d.responses.createResponse.mock.calls[0][0];
    expect(sent.input).toContain('Enterprise land');
    expect(sent.input).not.toContain('SECRET');
    expect(d.checkOutbound.mock.calls[0][0].texts).toEqual(['Hi Ada, ...', 'Let us pilot.', 'Quick recap.']);
  });

  it('needs an id (400); foreign ids are 404; stream mode delivers the same result', async () => {
    const h = handler('playbooks-ai', deps(fakeResponses(pb)));
    expect((await h(ev({}), user)).statusCode).toBe(400);
    expect((await h(ev({ dealId: D_OTHER }), user)).statusCode).toBe(404);
    expect((await h(ev({ contactId: C_OTHER }), user)).statusCode).toBe(404);
    const w = await wire(await h(ev({ contactId: C1, stream: true }, 'text/event-stream'), user));
    expect(resultOf(w).followups[0].channel).toBe('email');
  });

  it('flagged copy -> 422', async () => {
    const d = deps(fakeResponses(pb), { checkOutbound: vi.fn().mockResolvedValue({ ok: false, categories: ['harassment'] }) });
    expect((await handler('playbooks-ai', d)(ev({ dealId: D1 }), user)).statusCode).toBe(422);
  });
});

describe('deal-heatmap', () => {
  const portfolio = JSON.stringify({
    summary: 'Acme is the risk.',
    deals: [
      { deal_id: D2, risk_score: 15, reason: 'Fresh.', next_action: 'Book demo' },
      { deal_id: D1, risk_score: 180, reason: 'Silent 12 days.', next_action: 'Call Ada' },
      { deal_id: D_OTHER, risk_score: 99, reason: 'invented', next_action: 'x' },
    ],
  });

  it('portfolio: only the caller\'s OPEN deals reach the model; unknown ids dropped; scores clamped and sorted', async () => {
    const d = deps(fakeResponses(portfolio));
    const j = await handler('deal-heatmap', d)(ev({}), user);
    const body = JSON.parse(j.body);
    expect(body.mode).toBe('portfolio');
    expect(body.deals.map((x: any) => x.deal_id)).toEqual([D1, D2]);
    expect(body.deals[0]).toMatchObject({ risk_score: 100, contact_name: 'Ada Lovelace', assessed: true });
    expect(body.deals[0].factors).toMatchObject({ days_since_reply: 12, objection_level: 4, days_since_update: 12 });
    expect(typeof body.deals[0].baseline_score).toBe('number');
    const sent = d.responses.createResponse.mock.calls[0][0];
    expect(sent.schema.properties.deals).toBeTruthy();
    expect(sent.input).not.toContain('SECRET');
    expect(sent.input).not.toContain(D_WON);
  });

  it('portfolio streams; an unassessed deal falls back to the baseline and says so', async () => {
    const only = JSON.stringify({ summary: 's', deals: [{ deal_id: D1, risk_score: 70, reason: 'r', next_action: 'n' }] });
    const w = await wire(await handler('deal-heatmap', deps(fakeResponses(only)))(ev({ stream: true }, 'text/event-stream'), user));
    const data = resultOf(w);
    const missing = data.deals.find((x: any) => x.deal_id === D2);
    expect(missing).toMatchObject({ assessed: false, risk_score: missing.baseline_score });
    expect(types(w)).toContain('partial');
  });

  it('single deal: lib-style result; foreign deal 404; no deals -> no model call', async () => {
    const one = JSON.stringify({ risk_score: 64, reason: 'Slow replies.', next_action: 'Call' });
    const d = deps(fakeResponses(one));
    const j = await handler('deal-heatmap', d)(ev({ dealId: D1 }), user);
    expect(JSON.parse(j.body)).toMatchObject({ mode: 'single', dealId: D1, risk_score: 64, reason: 'Slow replies.', next_action: 'Call', contact: { name: 'Ada Lovelace' } });
    expect((await handler('deal-heatmap', d)(ev({ dealId: D_OTHER }), user)).statusCode).toBe(404);
    rows.deals = rows.deals.filter((x) => x.user_id !== 'u1');
    const r2 = fakeResponses(one);
    const empty = await handler('deal-heatmap', deps(r2))(ev({}), user);
    expect(JSON.parse(empty.body)).toMatchObject({ deals: [], summary: null });
    expect(r2.createResponse).not.toHaveBeenCalled();
  });
});

describe('video-agent', () => {
  const vid = JSON.stringify({ title: 'Acme demo', script: 'Hi Ada, I am excited to show you...', storyboard: [{ scene: 1, seconds: 10, visual: 'Logo', narration: 'Hi Ada' }], call_to_action: 'Book a call' });

  it('script + storyboard, never a video; uses web search for the page; moderated', async () => {
    const d = deps(fakeResponses(vid));
    const j = await handler('video-agent', d)(ev({ contactId: C1, productUrl: 'https://acme.io/offer', goal: 'followup' }), user);
    const body = JSON.parse(j.body);
    expect(body).toMatchObject({ contactId: C1, goal: 'followup', mood: 'precision', title: 'Acme demo', videoUrl: null, rendering: { available: false } });
    expect(body.storyboard).toHaveLength(1);
    const sent = d.responses.createResponse.mock.calls[0][0];
    expect(sent.tools).toEqual([{ type: 'web_search' }]);
    expect(sent.input).toContain('https://acme.io/offer');
    expect(sent.input).toContain('Video template type: followup');
    expect(sent.input).toContain('Sent pricing'); // memory block
    expect(d.checkOutbound.mock.calls[0][0].texts).toContain('Hi Ada, I am excited to show you...');
  });

  it('validates the URL, 404 for a foreign contact, 422 when flagged, streams', async () => {
    const h = handler('video-agent', deps(fakeResponses(vid)));
    expect((await h(ev({ contactId: C1, productUrl: 'javascript:alert(1)' }), user)).statusCode).toBe(400);
    expect((await h(ev({ contactId: C1, productUrl: 'not a url' }), user)).statusCode).toBe(400);
    expect((await h(ev({ contactId: C_OTHER, productUrl: 'https://a.io' }), user)).statusCode).toBe(404);
    const flagged = deps(fakeResponses(vid), { checkOutbound: vi.fn().mockResolvedValue({ ok: false, categories: ['violence'] }) });
    expect((await handler('video-agent', flagged)(ev({ contactId: C1, productUrl: 'https://a.io' }), user)).statusCode).toBe(422);
    const w = await wire(await h(ev({ contactId: C1, productUrl: 'https://a.io', stream: true }, 'text/event-stream'), user));
    expect(resultOf(w).script).toContain('Hi Ada');
  });
});

describe('voice-agent', () => {
  const voice = JSON.stringify({ script: 'Hi Ada, quick note about the pilot.' });

  it('text only by default (no TTS call); talking points are required', async () => {
    const tts = vi.fn();
    const d = deps(fakeResponses(voice), { synthesizeSpeech: tts });
    const j = await handler('voice-agent', d)(ev({ contactId: C1, script: 'mention the pilot' }), user);
    const body = JSON.parse(j.body);
    expect(body).toMatchObject({ contactId: C1, mode: 'sdr', script: 'Hi Ada, quick note about the pilot.' });
    expect(body.audioBase64).toBeUndefined();
    expect(tts).not.toHaveBeenCalled();
    expect(d.responses.createResponse.mock.calls[0][0].input).toContain('mention the pilot');
    expect((await handler('voice-agent', d)(ev({ contactId: C1, script: '  ' }), user)).statusCode).toBe(400);
  });

  it('tts:true returns mp3 base64 after moderation; TTS failure keeps the script; flagged script never reaches TTS', async () => {
    const tts = vi.fn().mockResolvedValue({ base64: 'QUJD', mime: 'audio/mpeg' });
    const ok = await handler('voice-agent', deps(fakeResponses(voice), { synthesizeSpeech: tts }))(ev({ contactId: C1, script: 'x', tts: true, mode: 'ae' }), user);
    expect(JSON.parse(ok.body)).toMatchObject({ mode: 'ae', audioBase64: 'QUJD', audioMime: 'audio/mpeg' });
    expect(tts).toHaveBeenCalledWith('Hi Ada, quick note about the pilot.', 'alloy');

    const broken = await handler('voice-agent', deps(fakeResponses(voice), { synthesizeSpeech: vi.fn().mockRejectedValue(new Error('down')) }))(ev({ contactId: C1, script: 'x', tts: true }), user);
    const b = JSON.parse(broken.body);
    expect(b.script).toContain('Hi Ada');
    expect(b.audioError).toBeTruthy();

    const tts2 = vi.fn();
    const flagged = deps(fakeResponses(voice), { synthesizeSpeech: tts2, checkOutbound: vi.fn().mockResolvedValue({ ok: false, categories: ['harassment'] }) });
    expect((await handler('voice-agent', flagged)(ev({ contactId: C1, script: 'x', tts: true }), user)).statusCode).toBe(422);
    expect(tts2).not.toHaveBeenCalled();
  });

  it('streams and 404s for foreign contacts', async () => {
    const h = handler('voice-agent', deps(fakeResponses(voice)));
    expect((await h(ev({ contactId: C_OTHER, script: 'x' }), user)).statusCode).toBe(404);
    const w = await wire(await h(ev({ contactId: C1, script: 'x', stream: true }, 'text/event-stream'), user));
    expect(types(w)).toContain('delta');
    expect(resultOf(w).script).toContain('pilot');
  });
});

describe('agent-runner', () => {
  const okInvoke = () => vi.fn().mockResolvedValue({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{"ok":true}' });
  const mk = (extra: Record<string, unknown> = {}) => {
    const invoke = okInvoke();
    const h = require('../netlify/functions/agent-runner.js').createHandler({
      authenticateRequest: async () => ({ user, error: null }), underRateLimit: async () => true, loadTarget: (n: string) => ({ n }), invoke, ...extra,
    });
    return { h, invoke };
  };

  it('dispatches allow-listed functions and agent ids, forwarding auth headers, input and the stream flag', async () => {
    const { h, invoke } = mk();
    const res = await h({ httpMethod: 'POST', headers: { authorization: 'Bearer t', accept: 'text/event-stream' }, body: JSON.stringify({ functionName: 'cold-email-sdr', contactId: C1, input: { goal: 'meeting', contactId: C_OTHER } }) }, {});
    expect(res.statusCode).toBe(200);
    const [mod, e] = invoke.mock.calls[0];
    expect(mod).toEqual({ n: 'cold-email-sdr' });
    expect(e.headers.authorization).toBe('Bearer t');
    expect(JSON.parse(e.body)).toEqual({ goal: 'meeting', contactId: C1, stream: true });

    await h({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ agentId: 'ai-ae-agent', dealId: D1 }) }, {});
    expect(invoke.mock.calls[1][0]).toEqual({ n: 'run-ae-agent' });
    expect(JSON.parse(invoke.mock.calls[1][1].body)).toEqual({ dealId: D1, contactId: C1 }); // contact resolved from the caller's deal
  });

  it('rejects anything outside the allow-list (400), unsupported agents (501), bad auth and methods', async () => {
    const { h, invoke } = mk();
    const post = (b: any) => h({ httpMethod: 'POST', headers: {}, body: JSON.stringify(b) }, {});
    expect((await post({ functionName: 'send-email', contactId: C1 })).statusCode).toBe(400);
    expect((await post({ functionName: '../_auth', contactId: C1 })).statusCode).toBe(400);
    expect((await post({ agentId: 'constructor', contactId: C1 })).statusCode).toBe(400);
    expect((await post({ agentId: 'crm-ops-agent', contactId: C1 })).statusCode).toBe(501);
    expect((await post({ agentId: 'ai-sdr-agent' })).statusCode).toBe(400); // no contact/deal
    expect((await h({ httpMethod: 'GET', headers: {} }, {})).statusCode).toBe(405);
    const denied = require('../netlify/functions/agent-runner.js').createHandler({ authenticateRequest: async () => ({ user: null, error: { statusCode: 401, headers: {}, body: '{}' } }) });
    expect((await denied({ httpMethod: 'POST', headers: {}, body: '{}' }, {})).statusCode).toBe(401);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("checks ownership BEFORE delegating (some targets do not): foreign contact/deal -> 404", async () => {
    const { h, invoke } = mk();
    const post = (b: any) => h({ httpMethod: 'POST', headers: {}, body: JSON.stringify(b) }, {});
    expect((await post({ agentId: 'ai-ae-agent', contactId: C_OTHER })).statusCode).toBe(404);
    expect((await post({ agentId: 'ai-ae-agent', dealId: D_OTHER })).statusCode).toBe(404);
    expect((await post({ agentId: 'ai-ae-agent', contactId: 'bad' })).statusCode).toBe(400);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('rate limit applies; a failing target is a 502, not a crash', async () => {
    expect((await mk({ underRateLimit: async () => false }).h({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ agentId: 'ai-sdr-agent', contactId: C1 }) }, {})).statusCode).toBe(429);
    const { h } = mk({ invoke: vi.fn().mockRejectedValue(new Error('boom')) });
    expect((await h({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ agentId: 'ai-sdr-agent', contactId: C1 }) }, {})).statusCode).toBe(502);
  });

  it('every allow-listed target really loads under the shim and exposes a streamable handler', () => {
    const { FUNCTIONS } = require('../netlify/functions/_lib/agentTargets.js');
    const { loadShimmed } = require('../netlify/functions/_lib/invoke.js');
    const names = Object.keys(FUNCTIONS);
    expect(names.length).toBeGreaterThanOrEqual(25);
    for (const n of names) {
      const mod = loadShimmed(n, FUNCTIONS[n]);
      expect(typeof mod.handler, n).toBe('function');
      expect(mod.handler.__directStream, n).toBe(true);
    }
  });

  it('in-process invoke of a real stream(withAuth()) module streams SSE bytes + status/headers through', async () => {
    const { loadShimmed, invokeStreamed } = require('../netlify/functions/_lib/invoke.js');
    const fixture = path.resolve('tests/fixtures/stream-agent-stub.cjs');
    const mod = loadShimmed('stream-agent-stub', () => require(fixture));
    const res = await invokeStreamed(mod, { httpMethod: 'POST', headers: { accept: 'text/event-stream' }, body: '{"contactId":"c"}' }, {});
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toContain('text/event-stream');
    const w = await wire(res);
    expect(types(w)).toEqual(['delta', 'result']);
    expect((globalThis as any).awslambda.streamifyResponse).toBeTypeOf('function'); // shim removed again
    const bad = await invokeStreamed(loadShimmed('stream-agent-stub', () => require(fixture)), { httpMethod: 'GET', headers: {} }, {});
    expect(bad.statusCode).toBe(405);
    await wire(bad);
  });
});
