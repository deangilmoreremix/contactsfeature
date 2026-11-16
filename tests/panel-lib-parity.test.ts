// @vitest-environment node
/**
 * The CommonJS ports under netlify/functions/_lib must match the TypeScript originals in lib/ (the browser/Deno side
 * keeps using those): same mood rules, same memory block, byte-identical prompts for skills / heatmap / video / voice.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sent: { prompt?: string } = {};
const state: { contact: any; deal: any; memory: any } = { contact: null, deal: null, memory: null };

vi.mock('../lib/core/callOpenAI', () => ({
  callOpenAI: vi.fn(async (prompt: string, opts: any) => {
    sent.prompt = prompt;
    return opts && opts.schema ? { risk_score: 1, reason: 'r', next_action: 'n', next_move: 'm' } : 'ok';
  }),
}));
vi.mock('../lib/core/openaiClient', () => ({
  createResponse: vi.fn(async (o: any) => { sent.prompt = o.input; return { text: 'ok', citations: [] }; }),
}));
vi.mock('../lib/core/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../lib/core/supabaseClient', () => ({
  supabase: {
    from: (t: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: t === 'deals' ? state.deal : state.contact, error: null }) }) }) }),
  },
}));
vi.mock('../lib/autopilot/helpers', () => ({ getContactAndDeal: async () => ({ contact: state.contact, deal: state.deal }) }));
vi.mock('../lib/memory/loadMemory', () => ({ loadAgentMemory: async () => state.memory }));
vi.mock('../lib/voice/queueVoiceJob', () => ({ queueVoiceJob: async () => ({ id: 'j' }) }));
vi.mock('../lib/video/queueVideoJob', () => ({ queueVideoJob: async () => ({ id: 'j' }) }));
vi.mock('../lib/memory/updateShortTerm', () => ({ updateShortTerm: async () => undefined }));

const contact = { id: 'c1', name: 'Ada', email: 'ada@acme.io', company: 'Acme', status: 'lead', notes: 'Likes "quotes"' };
const deal = { id: 'd1', contact_id: 'c1', stage: 'proposal', value: 5000, risk_score: 40, objection_level: 2, stage_stagnation: 3, days_since_reply: 4, updated_at: '2026-01-01' };
const memory = {
  short: [{ contact_id: 'c1', memory_type: 'short', data: { last_message: 'hi' } }],
  mid: [{ contact_id: 'c1', memory_type: 'mid', data: { tone_preferences: ['brief'] } }],
  long: [],
};

beforeEach(() => { sent.prompt = undefined; state.contact = contact; state.deal = deal; state.memory = memory; });

describe('mood', () => {
  it('determineMood / applyMood / modifiers are identical', async () => {
    const ts = await import('../lib/mood/determineMood');
    const apply = await import('../lib/mood/applyMood');
    const mods = await import('../lib/mood/moodModifiers');
    const js = require('../netlify/functions/_lib/mood.js');
    const contacts = [null, { status: 'angry' }, { status: 'UPSET' }, { status: 'churn_risk' }, { status: 'lead' }];
    const deals = [null, { risk_score: 80 }, { objection_level: 7 }, { stage: 'Proposal' }, { stage: 'negotiation' }, { stage: 'discovery' }, { stage: 'research' }, { stage: 'won', risk_score: 10 }, { stage: 'proposal', risk_score: 70 }];
    for (const c of contacts) for (const d of deals) expect(js.determineMood(c, d), JSON.stringify([c, d])).toBe(ts.determineMood(c as any, d as any));
    expect(js.moodModifiers).toEqual(mods.moodModifiers);
    for (const m of Object.keys(mods.moodModifiers)) expect(js.applyMood('BASE', m)).toBe(apply.applyMood('BASE', m as any));
  });
});

describe('memory', () => {
  it('buildMemoryPrompt is identical (with and without layers)', async () => {
    const ts = await import('../lib/memory/memoryPrompt');
    const js = require('../netlify/functions/_lib/memory.js');
    expect(js.buildMemoryPrompt(memory.short, memory.mid, memory.long)).toBe(ts.buildMemoryPrompt(memory.short as any, memory.mid as any, memory.long as any));
    expect(js.buildMemoryPrompt()).toBe(ts.buildMemoryPrompt());
  });
});

describe('skills', () => {
  it('registry ids + descriptions and every prompt are byte-identical to lib/skills', async () => {
    const reg = await import('../lib/skills/registry');
    const js = require('../netlify/functions/_lib/skills.js');
    expect(js.listSkills()).toEqual(reg.listSkills().map((s) => ({ id: s.id, description: s.description })));
    const ctxs = [
      { contact, deal, lastMessage: 'We have no budget', extra: { subject: 'Acme Inc', market: 'SaaS' } },
      { contact, deal: null, lastMessage: null, extra: undefined },
      { contact: { email: 'x@y.z' }, deal, lastMessage: undefined, extra: {} },
    ];
    for (const s of reg.listSkills()) {
      for (const c of ctxs) {
        sent.prompt = undefined;
        await s.run(c as any);
        expect(js.getSkill(s.id).prompt(c), `${s.id} ${JSON.stringify(c).slice(0, 40)}`).toBe(sent.prompt);
      }
    }
  });

  it('risk_analysis schema keys match', async () => {
    const js = require('../netlify/functions/_lib/skills.js');
    expect(Object.keys(js.getSkill('risk_analysis').schema.properties)).toEqual(['risk_score', 'reason', 'next_move']);
  });
});

describe('heatmap', () => {
  it('buildRiskPrompt equals computeDealRisk\'s prompt', async () => {
    const { computeDealRisk } = await import('../lib/heatmap/computeDealRisk');
    const js = require('../netlify/functions/_lib/heatmap.js');
    await computeDealRisk('d1');
    expect(js.buildRiskPrompt(contact, deal)).toBe(sent.prompt);
  });

  it('baseline risk is bounded and monotonic; open-deal filter', () => {
    const js = require('../netlify/functions/_lib/heatmap.js');
    const low = js.baselineRisk({ days_since_reply: 0, objection_level: 0, stage_stagnation: 0, days_since_update: 0 });
    const high = js.baselineRisk({ days_since_reply: 99, objection_level: 10, stage_stagnation: 99, days_since_update: 99 });
    expect([low, high]).toEqual([0, 100]);
    expect(js.baselineRisk({ days_since_reply: null, objection_level: null, stage_stagnation: null, days_since_update: null })).toBe(0);
    expect(['proposal', 'discovery', 'lead'].every((s) => js.isOpenDeal({ stage: s }))).toBe(true);
    expect(['won', 'lost', 'closed_won', 'Closed Lost'].some((s) => js.isOpenDeal({ stage: s }))).toBe(false);
    expect(js.isOpenDeal({ stage: 'proposal', closed_at: '2026-01-01' })).toBe(false);
  });
});

describe('video + voice', () => {
  it('video prompt equals createVideoScript (template, memory block, mood)', async () => {
    const { createVideoScript } = await import('../lib/video/createVideoScript');
    const js = require('../netlify/functions/_lib/agentScripts.js');
    const { mood } = await createVideoScript('c1', 'demo');
    expect(js.videoPrompt({ template: 'demo', contact, deal, memory }, mood)).toBe(sent.prompt);
  });

  it('voice prompt equals runVoiceAgent for sdr and ae', async () => {
    const { runVoiceAgent } = await import('../lib/voice/voiceAgent');
    const js = require('../netlify/functions/_lib/agentScripts.js');
    const moodJs = require('../netlify/functions/_lib/mood.js');
    for (const mode of ['sdr', 'ae'] as const) {
      await runVoiceAgent('c1', mode);
      expect(js.voicePrompt({ mode, contact, deal, memory }, moodJs.determineMood(contact, deal))).toBe(sent.prompt);
    }
  });
});
