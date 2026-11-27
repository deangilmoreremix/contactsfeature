// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

(globalThis as any).awslambda ||= { streamifyResponse: (f: unknown) => f, HttpResponseStream: { from: (s: unknown) => s } };
const require = createRequire(import.meta.url);

const A = '11111111-1111-4111-8111-111111111111'; // u1 contact
const B = '33333333-3333-4333-8333-333333333333'; // u1 colleague at Acme
const C = '44444444-4444-4444-8444-444444444444'; // someone else's contact at Acme
const OTHER = '22222222-2222-4222-8222-222222222222'; // someone else's contact
const DEAL = '55555555-5555-4555-8555-555555555555';
const OTHER_DEAL = '66666666-6666-4666-8666-666666666666';
const HOUR = 3600000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

const rows: Record<string, any[]> = {
  contacts: [
    { id: A, user_id: 'u1', name: 'Ada Lovelace', email: 'ada@acme.io', company: 'Acme', title: 'CTO', status: 'lead' },
    { id: B, user_id: 'u1', name: 'Bob Stone', email: 'bob@acme.io', company: 'Acme', title: 'VP Eng' },
    { id: C, user_id: 'someone-else', name: 'Foreign Colleague', email: 'f@acme.io', company: 'Acme' },
    { id: OTHER, user_id: 'someone-else', name: 'Secret Person', email: 'secret@other.io', company: 'Other' },
  ],
  emails: [
    { id: 'e1', subject: 'Intro', contact_id: A, user_id: 'u1', is_inbound: false, created_at: '2026-01-02T10:00:00Z' },
    { id: 'e2', subject: 'Re: Intro', contact_id: A, user_id: 'u1', is_inbound: true, created_at: '2026-01-03T10:00:00Z' },
  ],
  contact_timeline: [{ id: 't1', contact_id: A, user_id: 'u1', activity_type: 'note', description: 'Met at conference', created_at: '2026-01-01T09:00:00Z' }],
  deals: [
    { id: DEAL, user_id: 'u1', contact_id: A, title: 'Acme rollout', stage: 'proposal', value: 40000, created_at: '2026-01-01T00:00:00Z' },
    { id: OTHER_DEAL, user_id: 'someone-else', contact_id: OTHER, title: 'TOP SECRET DEAL', stage: 'won', value: 1, created_at: '2026-01-01T00:00:00Z' },
  ],
  calendar_events: [
    // blocks the next 3 days completely for u1
    { id: 'ev1', user_id: 'u1', title: 'Offsite', scheduled_for: iso(now), duration_minutes: 3 * 24 * 60, status: 'confirmed', contact_id: A },
    { id: 'ev2', user_id: 'someone-else', title: 'FOREIGN EVENT', scheduled_for: iso(now + 4 * 24 * HOUR), duration_minutes: 60, status: 'confirmed' },
  ],
};

/** Chainable fake of the supabase query builder (eq / gte / lte filters honoured, ISO strings compare lexically). */
function fakeSupabase() {
  const from = (table: string) => {
    let data = [...(rows[table] || [])];
    const q: any = {
      select: () => q, order: () => q, limit: () => q, is: () => q,
      eq: (k: string, v: any) => { data = data.filter((r) => r[k] === v); return q; },
      gte: (k: string, v: any) => { data = data.filter((r) => String(r[k]) >= String(v)); return q; },
      lte: (k: string, v: any) => { data = data.filter((r) => String(r[k]) <= String(v)); return q; },
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

const fakeResponses = (canned: any) => {
  const text = JSON.stringify(canned);
  return {
    createResponse: vi.fn().mockResolvedValue({ text, usage: { input_tokens: 10, output_tokens: 5 } }),
    streamResponse: async function* () {
      yield { type: 'status', phase: 'started', label: 'Thinking…' };
      yield { type: 'delta', text: text.slice(0, 15) };
      yield { type: 'done', id: 'resp_1', text, usage: { input_tokens: 10, output_tokens: 5 } };
    },
  };
};
const deps = (canned: any) => ({
  responses: fakeResponses(canned), underRateLimit: async () => true, withinTokenBudget: async () => ({ ok: true }),
  logUsage: vi.fn().mockResolvedValue(undefined), checkOutbound: vi.fn().mockResolvedValue({ ok: true }),
});
const ev = (body: any, accept = '') => ({ body: JSON.stringify(body), headers: accept ? { accept } : {} });
async function wire(res: any) { let out = ''; for await (const c of res.body) out += c.toString(); return out; }
const resultEvent = (w: string) => JSON.parse([...w.matchAll(/data: (\{"type":"result".*)\n/g)][0][1]).data;

// ---- canned model outputs (shape = the task's strict schema) ---------------------------------------------------------------------
const forecast = { metric: 'revenue', predicted: 120000, unit: 'USD', trend: 'up', change: 0.1, confidence: 70, probability: 0.6, rangeLow: 100000, rangeHigh: 130000, basis: 'deals' };
const comp = { score: 60, evidence: 'e' };
const sev = 'medium';

interface Case {
  id: string; role: string; params: any; foreign?: any; badParams?: any; canned: any; keys: string[]; tools?: string[];
  check?: (data: any, sentInput: string) => void;
}

const cases: Case[] = [
  {
    id: 'predictive-analytics', role: 'default', params: { data: { revenue: [{ value: 1 }, { value: 2 }, { value: 3 }] }, predictionType: 'sales', timeFrame: '30days' },
    canned: { forecasts: [forecast], trends: { overall: 'up', significantChanges: [{ metric: 'revenue', trend: 'up', magnitude: 0.1 }], emergingPatterns: [], seasonalTrends: [] }, recommendations: ['Follow up'], dataQuality: 'thin' },
    keys: ['inputData', 'predictionType', 'timeFrame', 'forecasts', 'probabilities', 'trends', 'recommendations', 'confidence', 'generatedAt'],
    foreign: { contactId: OTHER, predictionType: 'churn' },
    check: (d, input) => {
      expect(d.forecasts.revenue.predicted).toBe(120000);
      expect(d.probabilities.revenue).toMatchObject({ confidence: 70, probability: 0.6, range: { low: 100000, high: 130000 } });
      expect(d.confidence).toBe(70);
      expect(input).not.toContain('TOP SECRET DEAL');
    },
  },
  {
    id: 'meeting-optimizer', role: 'default',
    params: { meetingData: { participants: [{ id: 'p1', name: 'Ada', role: 'decision-maker' }, { id: 'p2', name: 'Bob' }], duration: 30, timeZone: 'UTC', objectives: ['Agree scope'], topic: 'Kickoff' }, optimizationType: 'comprehensive' },
    canned: {
      scheduleChoice: { slotIndex: 0, alternativeIndexes: [1, 2, 99], reasoning: 'free', confidence: 80 },
      agenda: [{ item: 'Intro', minutes: 5, presenter: 'Host', purpose: 'Context' }],
      participants: [{ participantIndex: 0, necessity: 'required', suggestedRole: 'Decision Maker', preparation: ['Read brief'] }, { participantIndex: 1, necessity: 'optional', suggestedRole: 'Observer', preparation: [] }, { participantIndex: 7, necessity: 'required', suggestedRole: 'ghost', preparation: [] }],
      communication: { primaryChannel: 'video', backupChannels: ['phone'], materials: ['Agenda'], reminders: [{ timing: '1h before', message: 'Link' }] },
      recommendations: ['Send agenda'], predictedOutcomes: { successProbability: 70, expectedEngagement: 'High', likelyOutcomes: ['Scope'], potentialChallenges: [], followUpNeeded: false }, riskFactors: [],
    },
    keys: ['originalData', 'optimizationType', 'optimizedSchedule', 'optimizedAgenda', 'participantOptimization', 'recommendations', 'predictedOutcomes', 'riskFactors', 'optimizedAt'],
    check: (d, input) => {
      const s = d.optimizedSchedule;
      // the caller's own 3-day event blocks the start of the window: no slot may collide with it
      expect(new Date(s.recommendedStart).getTime()).toBeGreaterThanOrEqual(now + 3 * 24 * HOUR);
      for (const alt of s.alternatives) expect(new Date(alt.start).getTime()).toBeGreaterThanOrEqual(now + 3 * 24 * HOUR);
      expect(s.recommendedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.participantOptimization.required.map((p: any) => p.id)).toEqual(['p1']);
      expect(d.participantOptimization.roles).toEqual({ p1: 'Decision Maker', p2: 'Observer' });
      expect(d.optimizedAgenda[0]).toMatchObject({ item: 'Intro', duration: 5 });
      expect(input).not.toContain('FOREIGN EVENT');
    },
  },
  {
    id: 'relationship-insights', role: 'default', params: { contactId: A, insightType: 'comprehensive' }, foreign: { contactId: OTHER },
    canned: {
      network: { summary: 'One colleague', clusters: [{ name: 'Eng', contactIds: [B, 'invented-id', C] }], bridgeContactIds: [B, C] },
      influence: { score: 70, factors: [{ factor: 'title', score: 70, description: 'CTO' }], decisionMakingPower: 'decision_maker', reach: null, amplification: null },
      interactions: { frequency: { averageDaysBetween: 1, summary: 's' }, timing: { summary: 's' }, channels: { primary: 'email', summary: 's' }, topics: { list: ['intro'] }, sentiment: { label: 'positive', summary: 's' }, reciprocity: { label: 'balanced', summary: 's' } },
      strength: { overallScore: 65, components: { interaction: comp, network: comp, engagement: comp, temporal: comp }, trajectory: 'strengthening', health: 'moderate', recommendations: ['Call'] },
      recommendations: ['r'], opportunities: ['o'], risks: ['k'],
    },
    keys: ['contactId', 'insightType', 'networkAnalysis', 'influenceMapping', 'interactionPatterns', 'relationshipStrength', 'recommendations', 'opportunities', 'risks', 'generatedAt'],
    check: (d, input) => {
      expect(d.contactId).toBe(A);
      expect(d.networkAnalysis.clusters[0].contactIds).toEqual([B]); // invented + foreign ids dropped
      expect(d.networkAnalysis.directConnections.map((c: any) => c.id)).toEqual([B]);
      expect(d.influenceMapping.influenceScore).toBe(70);
      expect(d.relationshipStrength.health).toBe('moderate');
      expect(input).not.toContain('Foreign Colleague');
    },
  },
  {
    id: 'deal-analysis', role: 'thinking', params: { dealId: DEAL, analysisType: 'comprehensive' }, foreign: { dealId: OTHER_DEAL },
    canned: {
      metrics: { dealScore: 60, engagementScore: 50, valueScore: 70, timelineScore: 50, stakeholderScore: 40, competitivePosition: 'unknown' },
      risks: [{ type: 'stakeholder', severity: sev, description: 'No champion', mitigation: 'Find one' }],
      opportunities: [{ type: 'expansion', description: 'More seats', value: null, actions: ['Ask'] }],
      recommendations: [{ priority: 'high', action: 'Follow up', reason: 'Proposal sent' }],
      probability: 50, timeline: { estimatedCloseDate: null, daysToClose: null, confidence: 40, milestones: [], blockers: [] },
      competitors: { named: [], summary: 'none known' }, stakeholderAnalysis: { championIdentified: null, decisionMakers: [], gaps: ['champion'] },
    },
    keys: ['dealData', 'metrics', 'risks', 'opportunities', 'recommendations', 'score', 'probability', 'timeline', 'competitors', 'stakeholderAnalysis', 'analyzedAt'],
    check: (d, input) => {
      expect(d.dealData.id).toBe(DEAL);
      expect(d.score).toBe(Math.round(60 * 0.4 + 50 * 0.3 + 40 * 0.3));
      expect(input).toContain('Ada Lovelace');
      expect(input).not.toContain('TOP SECRET DEAL');
    },
  },
  {
    id: 'feature-analysis', role: 'thinking', params: { productUrl: 'https://acme.io', competitorResearch: true, marketAnalysis: true }, badParams: {}, tools: ['web_search'],
    canned: {
      productName: 'Acme', summary: 'A product',
      keyFeatures: [{ name: 'Sync', description: 'd', competitiveAdvantage: 'fast', marketPosition: 'leader', adoptionRate: null }],
      directCompetitors: [{ name: 'Rival', strengths: ['a'], weaknesses: ['b'], marketShare: null }], indirectCompetitors: [], marketGaps: ['gap'],
      marketInsights: { totalAddressableMarket: null, serviceableAvailableMarket: '$1B', serviceableObtainableMarket: null, growthRate: null, keyTrends: ['t'] },
      recommendations: [{ type: 'pricing', priority: 'high', recommendation: 'r', rationale: 'y', expectedImpact: 'i' }], sources: ['https://acme.io'],
    },
    keys: ['analysis'],
    check: (d) => {
      expect(d.analysis.productName).toBe('Acme');
      const a = d.analysis.analysis;
      expect(Object.keys(a)).toEqual(expect.arrayContaining(['summary', 'keyFeatures', 'competitiveLandscape', 'marketInsights', 'recommendations']));
      expect(a.competitiveLandscape.directCompetitors[0].marketShare).toBeNull(); // never fabricated
      expect(a.marketInsights.totalAddressableMarket).toBe('Unknown');
      expect(a.marketInsights.serviceableAvailableMarket).toBe('$1B');
    },
  },
  {
    id: 'timeline-generator', role: 'default', params: { contactId: A, entityType: 'contact', options: {} }, foreign: { contactId: OTHER }, badParams: { contactId: A, entityType: 'company' },
    canned: {
      classified: [{ eventId: 'timeline:t1', category: 'note', importance: 'low', isMilestone: false }, { eventId: 'email:e2', category: 'email', importance: 'critical', isMilestone: true }, { eventId: 'invented:1', category: 'meeting', importance: 'critical', isMilestone: true }],
      phases: [{ name: 'Intro', firstEventId: 'timeline:t1', lastEventId: 'email:e2', characteristics: ['warm'] }, { name: 'Bad', firstEventId: 'nope', lastEventId: 'email:e2', characteristics: [] }],
      predictions: [{ type: 'next_interaction', description: 'soon', predictedDate: null, confidence: 1.7, factors: ['cadence'] }], overallTrend: 'accelerating', insights: ['They replied fast'],
    },
    keys: ['entityId', 'entityType', 'events', 'milestones', 'phases', 'predictions', 'summary', 'generatedAt'],
    check: (d) => {
      expect(d.events.map((e: any) => e.id)).toEqual(['timeline:t1', 'email:e1', 'email:e2', 'meeting:ev1']); // only REAL events, chronological
      expect(d.milestones.map((e: any) => e.id)).toEqual(['email:e2']);
      expect(d.phases).toHaveLength(1);
      expect(d.phases[0].events).toHaveLength(3);
      expect(d.predictions[0].confidence).toBe(1);
      expect(d.summary).toMatchObject({ totalEvents: 4, overallTrend: 'accelerating', mostActivePeriod: '2026-01' });
    },
  },
  {
    id: 'automation-ai', role: 'fast', params: { trigger: 'contact_created', data: { id: A, email: 'ada@acme.io' }, rules: { sendWelcomeEmail: true, autoAssign: true } }, foreign: { trigger: 'contact_created', data: { id: OTHER }, rules: {} },
    canned: { actions: [
      { type: 'send_email', reason: 'sendWelcomeEmail', template: 'welcome', to: 'evil@attacker.com', sequence: null, delay: null, message: null, channel: null, priority: 'high' },
      { type: 'assign_owner', reason: 'autoAssign', template: null, to: null, sequence: null, delay: null, message: null, channel: null, priority: null },
    ] },
    keys: [],
    check: (d) => {
      expect(Array.isArray(d)).toBe(true); // legacy contract: bare array of actions
      expect(d[0]).toMatchObject({ type: 'send_email', template: 'welcome', to: 'ada@acme.io', contactId: A, priority: 'high' });
      expect(d[1]).toMatchObject({ type: 'assign_owner', contactId: A, ownerId: 'u1' });
    },
  },
];

/** Every object node in the schema must be strict after strictify: all properties required, additionalProperties false, no free-form maps. */
function walk(node: any, where: string, problems: string[]) {
  if (!node || typeof node !== 'object') return;
  const t = node.type;
  const isObj = t === 'object' || (Array.isArray(t) && t.includes('object'));
  if (isObj) {
    if (!node.properties) problems.push(`${where}: object without properties (free-form map)`);
    else {
      const keys = Object.keys(node.properties);
      if (node.additionalProperties !== false) problems.push(`${where}: additionalProperties must be false`);
      if (JSON.stringify([...(node.required || [])].sort()) !== JSON.stringify([...keys].sort())) problems.push(`${where}: required must list every property`);
    }
  }
  for (const [k, v] of Object.entries(node.properties || {})) walk(v, `${where}.${k}`, problems);
  if (node.items) walk(node.items, `${where}[]`, problems);
  for (const k of ['anyOf', 'oneOf']) (node[k] || []).forEach((n: any, i: number) => walk(n, `${where}.${k}${i}`, problems));
}

describe.each(cases)('ai-task: $id', (c) => {
  const user = { id: 'u1' };
  const handler = (canned = c.canned) => { const d = deps(canned); return { d, h: require('../netlify/functions/ai-task.js').createHandler(d) }; };

  it('JSON mode: runs for the caller, keeps the legacy contract and the declared role/tools', async () => {
    const { d, h } = handler();
    const res = await h(ev({ task: c.id, params: c.params }), user);
    expect(res.statusCode, res.body).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ success: true, task: c.id });
    for (const k of c.keys) expect(body.data, `missing contract key ${k}`).toHaveProperty(k);
    const sent = d.responses.createResponse.mock.calls[0][0];
    expect(sent.role).toBe(c.role);
    expect(sent.schema).toBeTruthy();
    expect((sent.tools || []).map((t: any) => t.type)).toEqual(c.tools || []);
    c.check?.(body.data, String(sent.input) + String(sent.instructions));
    expect(d.logUsage).toHaveBeenCalledWith('u1', `ai-task:${c.id}`, expect.anything(), { input_tokens: 10, output_tokens: 5 }, 'ok');
  });

  it('stream mode: status/delta then a result event equal to the JSON payload, then done', async () => {
    const { h } = handler();
    const jsonRes = await h(ev({ task: c.id, params: c.params }), user);
    const res = await h(ev({ task: c.id, params: c.params, stream: true }, 'text/event-stream'), user);
    expect(res.headers['Content-Type']).toContain('text/event-stream');
    const w = await wire(res);
    const types = w.split('\n').filter((l) => l.startsWith('data: ') && !l.includes('[DONE]')).map((l) => JSON.parse(l.slice(6)).type);
    expect(types).toEqual(['status', 'delta', 'result', 'done']);
    const streamed = resultEvent(w);
    const json = JSON.parse(jsonRes.body);
    // generatedAt/analyzedAt/optimizedAt differ by timestamp only
    const strip = (x: any) => JSON.parse(JSON.stringify(x, (k, v) => (/At$/.test(k) ? undefined : v)));
    expect(strip(streamed)).toEqual(strip(json));
  });

  if (c.foreign) {
    it("never reads another user's rows: foreign ids are 404 and nothing is sent to the model", async () => {
      const { d, h } = handler();
      const res = await h(ev({ task: c.id, params: c.foreign }), user);
      expect(res.statusCode).toBe(404);
      expect(d.responses.createResponse).not.toHaveBeenCalled();
    });
  }

  if (c.badParams) {
    it('rejects unusable input with 400 before any model call', async () => {
      const { d, h } = handler();
      const res = await h(ev({ task: c.id, params: c.badParams }), user);
      expect(res.statusCode).toBe(400);
      expect(d.responses.createResponse).not.toHaveBeenCalled();
    });
  }

  it('schema is strict-compatible (all properties required, no free-form objects)', () => {
    const { strictify } = require('../netlify/functions/_responses.js');
    const task = require('../netlify/functions/_tasks').getTask(c.id);
    const problems: string[] = [];
    walk(strictify(task.schema), c.id, problems);
    expect(problems).toEqual([]);
    expect(task.moderate ? typeof task.outboundText : 'function').toBe('function'); // outbound copy must declare what to moderate
  });
});

describe('analysis tasks registry', () => {
  it('every task in this batch is registered under its legacy edge-function name', () => {
    const { getTask } = require('../netlify/functions/_tasks');
    for (const c of cases) expect(getTask(c.id)?.id).toBe(c.id);
  });
});
