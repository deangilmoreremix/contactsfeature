// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

(globalThis as any).awslambda ||= { streamifyResponse: (f: unknown) => f, HttpResponseStream: { from: (s: unknown) => s } };
const require = createRequire(import.meta.url);

const A = '11111111-1111-4111-8111-111111111111';
const B = '33333333-3333-4333-8333-333333333333';
const OTHER = '22222222-2222-4222-8222-222222222222';
const rows: Record<string, any[]> = {
  contacts: [
    { id: A, user_id: 'u1', name: 'Ada Lovelace', email: 'ada@acme.io', company: 'Acme', title: 'CTO', status: 'lead' },
    { id: B, user_id: 'u1', name: 'Bob Stone', email: 'bob@gmail.com', company: 'Stone LLC', title: 'Intern', status: 'lead' },
    { id: OTHER, user_id: 'someone-else', name: 'Secret Person', email: 'secret@other.io' },
  ],
  emails: [{ subject: 'Hi', contact_id: A, user_id: 'u1' }],
  contact_timeline: [],
  deals: [],
};

function fakeSupabase() {
  const from = (table: string) => {
    let data = [...(rows[table] || [])];
    const q: any = {
      select: () => q, order: () => q, limit: () => q, is: () => q,
      eq: (k: string, v: any) => { data = data.filter((r) => r[k] === v); return q; },
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

const S = (o: any) => JSON.stringify(o);
const reasonStep = { step: 1, action: 'assess', reasoning: 'r', result: { summary: 's', conclusion: null, confidence: 70 } };
const msgs = [
  { content: 'Hi, what does the pro plan cost?', timestamp: '2026-01-01T10:00:00Z', sender: 'lead' },
  { content: 'It is $49 per month.', timestamp: '2026-01-01T10:30:00Z', sender: 'rep' },
];
const emptyEnt = { people: [], organizations: [], products: [], dates: [], locations: [], monetary: [] };

interface Case {
  id: string;
  params: any;
  foreign?: any; // params that must 404
  canned: any; // what the model "returns"
  keys: string[]; // legacy contract keys
  outbound?: boolean;
  check?: (data: any) => void;
}

const cases: Case[] = [
  {
    id: 'smart-qualify', params: { contactIds: [A, B] }, foreign: { contactIds: [A, OTHER] },
    canned: { results: [{ contactId: A, score: 85, status: 'qualified', reasons: ['CTO'], requirements: [], nextSteps: ['demo'] }, { contactId: 'zzz', score: 5, status: 'unqualified', reasons: [], requirements: [], nextSteps: [] }] },
    keys: ['leads', 'summary'],
    check: (d) => {
      expect(d.summary).toEqual({ total: 2, qualified: 1, unqualified: 0, needsMoreInfo: 1 });
      expect(d.leads.qualified[0]).toMatchObject({ id: A, qualification: { score: 85, status: 'qualified' } });
      expect(d.leads.needsMoreInfo[0].id).toBe(B); // model skipped it -> not guessed
    },
  },
  {
    id: 'smart-categorize', params: { contactIds: [A, B] }, foreign: { contactIds: [OTHER] },
    canned: { results: [{ contactId: A, category: 'hot', score: 90, reason: 'CTO' }] },
    keys: ['categories', 'summary'],
    check: (d) => {
      expect(Object.keys(d.categories)).toEqual(expect.arrayContaining(['hot', 'warm', 'cold', 'unqualified']));
      expect(d.categories.hot[0]).toMatchObject({ id: A, category: 'hot' });
      expect(d.categories.uncategorized).toHaveLength(1);
      expect(d.summary).toMatchObject({ total: 2, hot: 1, uncategorized: 1 });
    },
  },
  {
    id: 'smart-bulk', params: { contacts: [{ id: A }, { name: 'Inline Joe', company: 'X' }], operation: 'score' }, foreign: { contactIds: [OTHER], operation: 'score' },
    canned: { results: [{ contactId: A, score: 81, category: 'hot', qualified: true, reason: 'fit' }, { contactId: 'item-2', score: 30, category: 'cold', qualified: false, reason: 'thin' }] },
    keys: ['successful', 'failed', 'summary'],
    check: (d) => {
      expect(d.summary).toEqual({ total: 2, successful: 2, failed: 0 });
      expect(d.successful[0].score).toMatchObject({ totalScore: 81, grade: 'B' });
      expect(d.results).toHaveLength(2);
    },
  },
  {
    id: 'ai-reasoning', params: { data: { id: A, name: 'x' }, reasoningType: 'next_action' }, foreign: { data: { id: OTHER } },
    canned: { steps: [reasonStep], conclusion: 'Call Ada', confidence: 72, alternatives: ['email'] },
    keys: ['input', 'type', 'context', 'steps', 'conclusion', 'confidence', 'alternatives', 'reasoningTime', 'performedAt'],
    check: (d) => { expect(d.type).toBe('next_action'); expect(d.steps[0]).toMatchObject({ step: 1, action: 'assess' }); },
  },
  {
    id: 'instant-response', params: { message: 'What does it cost?', contactId: A }, foreign: { message: 'hi', contactId: OTHER }, outbound: true,
    canned: { text: 'Happy to help.', suggestions: ['Schedule a call'], actions: ['schedule_call'], followUp: null, intent: 'question', sentiment: 'neutral', urgency: 'normal', topics: ['pricing'], confidence: 80 },
    keys: ['text', 'suggestions', 'actions', 'followUp', 'metadata'],
    check: (d) => { expect(d.metadata).toMatchObject({ confidence: 80 }); expect(d.followUp).toBeNull(); },
  },
  {
    id: 'contact-card-ai', params: { contactId: A, cardType: 'sales' }, foreign: { contactId: OTHER },
    canned: {
      enhancements: { name: { displayName: 'Ada Lovelace', formality: 'formal' }, email: { isValid: true, domain: 'acme.io', provider: null }, phone: { formatted: null, type: null, country: null }, company: { formatted: 'Acme', industry: null, size: null }, sales: { leadScore: 80, buyingStage: 'consideration', budget: null, timeline: null, decisionMakers: [], competitors: [] }, support: { priority: null, escalationRisk: null, satisfactionRisk: null, expectedResolution: null }, marketing: { segments: [], interests: [], recommendedCampaigns: [], engagementLevel: null } },
      insights: ['CTO'], recommendations: ['Call'], riskIndicators: [], opportunityFlags: [],
      engagement: { overallScore: null, emailEngagement: 40, socialEngagement: null, websiteEngagement: null, lastInteraction: null, interactionFrequency: null, preferredChannel: null }, summary: 's',
    },
    keys: ['originalData', 'cardType', 'enhancements', 'insights', 'recommendations', 'riskIndicators', 'opportunityFlags', 'engagement', 'lastUpdated'],
    check: (d) => {
      expect(d.enhancements.sales.leadScore).toBe(80);
      expect(d.enhancements.support).toBeUndefined(); // not part of a sales card
      expect(d.enhancements.phone).toBeUndefined(); // all-null section pruned, nothing fabricated
      expect(d.engagement.preferredChannel).toBe('unknown');
    },
  },
  {
    id: 'contact-detail-ai', params: { contactId: A, detailType: 'professional' }, foreign: { contactId: OTHER },
    canned: {
      enhancedFields: { communication: { email: { validated: true, domain: null, provider: null, riskNote: null }, phone: { formatted: null, type: null, country: null }, address: { standardized: null, timezone: null }, social: [] }, professional: { jobTitle: { standardized: 'CTO', seniority: 'c-level', function: 'engineering' }, company: { standardized: 'Acme', domain: null, industry: null, size: null }, yearsOfExperience: null, expertise: [] }, personal: { firstName: 'Ada', lastName: 'Lovelace', location: null, interests: [] }, engagement: { emailEngagement: null, preferredChannel: null, responseRate: null, lastInteraction: null } },
      aiInsights: { communication: { bestTime: null, preferredChannel: null, responseRate: null, communicationStyle: null }, professional: { influence: 90, decisionMaking: 'decision maker', network: null, opportunities: [] }, personal: { interests: [], motivations: [] }, engagement: { engagementLevel: 'medium', churnRisk: null, growthPotential: null, advocacyPotential: null } },
      recommendations: ['Demo'], predictiveMetrics: { nextInteraction: null, conversionProbability: 60, lifetimeValue: null, churnProbability: null }, dataGaps: ['phone'],
    },
    keys: ['originalData', 'detailType', 'enhancedFields', 'aiInsights', 'recommendations', 'predictiveMetrics', 'lastEnhanced'],
    check: (d) => {
      expect(d.enhancedFields.jobTitle.seniority).toBe('c-level'); // specific type => that section directly
      expect(d.aiInsights.decisionMaking).toBe('decision maker');
      expect(d.predictiveMetrics.conversionProbability).toBe(60);
    },
  },
  {
    id: 'conversation-analysis', params: { conversationData: { messages: msgs, participants: ['lead', 'rep'] }, analysisType: 'comprehensive' },
    canned: {
      sentiment: { positive: 60, negative: 0, neutral: 40, dominant: 'positive', score: 0.6, trend: 'stable', overTime: [{ messageIndex: 0, positive: 50, negative: 0, neutral: 50 }, { messageIndex: 9, positive: 1, negative: 1, neutral: 98 }] },
      topics: [{ topic: 'pricing', relevance: 90, mentions: 2 }], entities: { ...emptyEnt, monetary: ['$49'] },
      metrics: { engagementLevel: 70, resolution: true, satisfaction: 80, clarity: 90, completeness: 85 }, insights: ['asked price'], recommendations: ['send quote'], summary: 'Pricing chat.',
    },
    keys: ['conversation', 'analysisType', 'metrics', 'sentiment', 'topics', 'entities', 'insights', 'recommendations', 'summary', 'analyzedAt'],
    check: (d) => {
      expect(d.metrics).toMatchObject({ totalMessages: 2, responseTimes: [1800000] }); // computed, not model-made
      expect(d.sentiment.overTime).toHaveLength(1); // out-of-range index dropped
      expect(d.sentiment.overall.dominant).toBe('positive');
      expect(d.entities.monetary).toEqual(['$49']);
    },
  },
];

const deps = (text: string) => ({
  responses: {
    createResponse: vi.fn().mockResolvedValue({ text, usage: { input_tokens: 10, output_tokens: 5 } }),
    streamResponse: async function* () {
      yield { type: 'status', phase: 'started', label: 'Thinking…' };
      yield { type: 'delta', text: text.slice(0, 10) };
      yield { type: 'partial', json: {} };
      yield { type: 'done', id: 'resp_1', text, usage: { input_tokens: 10, output_tokens: 5 } };
    },
  },
  underRateLimit: async () => true, withinTokenBudget: async () => ({ ok: true }),
  logUsage: vi.fn().mockResolvedValue(undefined), checkOutbound: vi.fn().mockResolvedValue({ ok: true }),
});
const ev = (body: any, accept = '') => ({ body: JSON.stringify(body), headers: accept ? { accept } : {} });
async function wire(res: any) {
  let out = '';
  for await (const c of res.body) out += c.toString();
  return out;
}
const user = { id: 'u1' };

describe.each(cases)('ai-task: $id', (c) => {
  const handler = (d: any) => require('../netlify/functions/ai-task.js').createHandler(d);

  it('JSON mode keeps the legacy contract keys', async () => {
    const d = deps(S(c.canned));
    const res = await handler(d)(ev({ task: c.id, params: c.params }), user);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ success: true, task: c.id });
    expect(Object.keys(body.data)).toEqual(expect.arrayContaining(c.keys));
    c.check?.(body.data);
    const sent = d.responses.createResponse.mock.calls[0][0];
    expect(sent.schema).toBeTruthy();
    expect(d.logUsage).toHaveBeenCalledWith('u1', `ai-task:${c.id}`, expect.anything(), expect.anything(), 'ok');
    if (c.outbound) expect(d.checkOutbound).toHaveBeenCalled();
  });

  it('stream mode ends with result (same payload shape) then done', async () => {
    const res = await handler(deps(S(c.canned)))(ev({ task: c.id, params: c.params, stream: true }, 'text/event-stream'), user);
    expect(res.headers['Content-Type']).toContain('text/event-stream');
    const w = await wire(res);
    const types = [...w.matchAll(/"type":"(\w+)"/g)].map((m) => m[1]);
    expect(types.indexOf('result')).toBeGreaterThan(-1);
    expect(types.indexOf('result')).toBeLessThan(types.indexOf('done'));
    const result = JSON.parse(w.split('\n').find((l) => l.startsWith('data:') && l.includes('"type":"result"'))!.slice(5));
    expect(Object.keys(result.data.data)).toEqual(expect.arrayContaining(c.keys));
  });

  if (c.foreign) {
    it("never reads another user's contact (404) and never calls the model", async () => {
      const d = deps(S(c.canned));
      const res = await handler(d)(ev({ task: c.id, params: c.foreign }), user);
      expect(res.statusCode).toBe(404);
      expect(d.responses.createResponse).not.toHaveBeenCalled();
    });
  }

  it('schema is strict-able: every object lists its properties, no free-form objects, no nullable objects', () => {
    const { tasks } = require('../netlify/functions/_tasks');
    const { strictify } = require('../netlify/functions/_responses');
    const raw = tasks[c.id].schema;
    const strict = strictify(raw);
    const walk = (n: any, p: string) => {
      if (!n || typeof n !== 'object') return;
      const types = Array.isArray(n.type) ? n.type : [n.type];
      if (types.includes('object')) {
        expect(n.type, `${p} nullable object`).toBe('object');
        expect(n.properties, `${p} free-form object`).toBeTruthy();
        expect(n.additionalProperties, p).toBe(false);
        expect([...n.required].sort(), p).toEqual(Object.keys(n.properties).sort());
      }
      if (n.properties) for (const [k, v] of Object.entries(n.properties)) walk(v, `${p}.${k}`);
      if (n.items) walk(n.items, `${p}[]`);
    };
    walk(strict, c.id);
    expect(tasks[c.id].moderate === true).toBe(!!c.outbound);
    expect(typeof tasks[c.id].outboundText === 'function').toBe(!!c.outbound);
  });
});

describe('moderation of outbound scoring-area tasks', () => {
  it('instant-response: flagged reply -> 422 CONTENT_FLAGGED', async () => {
    const c = cases.find((x) => x.id === 'instant-response')!;
    const d = deps(S(c.canned));
    d.checkOutbound = vi.fn().mockResolvedValue({ ok: false, categories: ['harassment'] });
    const res = await require('../netlify/functions/ai-task.js').createHandler(d)(ev({ task: c.id, params: c.params }), user);
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body)).toMatchObject({ code: 'CONTENT_FLAGGED' });
  });
});

describe('input validation and prompt hygiene', () => {
  const h = (d: any) => require('../netlify/functions/ai-task.js').createHandler(d);
  it('rejects empty / oversized batches, unsupported bulk operations and missing messages (400)', async () => {
    const d = deps('{}');
    expect((await h(d)(ev({ task: 'smart-qualify', params: {} }), user)).statusCode).toBe(400);
    expect((await h(d)(ev({ task: 'smart-categorize', params: { contactIds: Array(26).fill(A) } }), user)).statusCode).toBe(400);
    expect((await h(d)(ev({ task: 'smart-bulk', params: { contactIds: [A], operation: 'delete' } }), user)).statusCode).toBe(400);
    expect((await h(d)(ev({ task: 'instant-response', params: {} }), user)).statusCode).toBe(400);
    expect((await h(d)(ev({ task: 'conversation-analysis', params: { conversationData: { messages: [] } } }), user)).statusCode).toBe(400);
    expect(d.responses.createResponse).not.toHaveBeenCalled();
  });

  it('smart-bulk is ONE model call for the whole list and never leaks foreign data into the prompt', async () => {
    const c = cases.find((x) => x.id === 'smart-bulk')!;
    const d = deps(S(c.canned));
    await h(d)(ev({ task: 'smart-bulk', params: { contactIds: [A, B] } }), user);
    expect(d.responses.createResponse).toHaveBeenCalledTimes(1);
    const prompt = JSON.stringify(d.responses.createResponse.mock.calls[0][0]);
    expect(prompt).toContain('Ada Lovelace');
    expect(prompt).toContain('Bob Stone');
    expect(prompt).not.toContain('Secret Person');
    expect(prompt).not.toContain('user_id');
  });

  it('smart-bulk reports contacts the model skipped as failed, not guessed', async () => {
    const d = deps(S({ results: [] }));
    const res = await h(d)(ev({ task: 'smart-bulk', params: { contactIds: [A] } }), user);
    const data = JSON.parse(res.body).data;
    expect(data.summary).toEqual({ total: 1, successful: 0, failed: 1 });
  });

  it('conversation-analysis honours analysisType (only the requested part is returned)', async () => {
    const c = cases.find((x) => x.id === 'conversation-analysis')!;
    const res = await h(deps(S(c.canned)))(ev({ task: 'conversation-analysis', params: { ...c.params, analysisType: 'topics' } }), user);
    const data = JSON.parse(res.body).data;
    expect(data.topics).toHaveLength(1);
    expect(data.sentiment).toEqual({});
    expect(data.summary).toBe('');
  });
});
