// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);

describe('SDR agents (OpenAI Agents SDK)', () => {
  let factory: any;
  let defs: any;
  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    factory = require('../netlify/functions/_agents/factory.js');
    defs = factory.DEFINITIONS;
  });

  it('defines the 8 missing SDR agents', () => {
    expect(Object.keys(defs).sort()).toEqual(
      ['competitor-aware-sdr', 'data-enrichment-sdr', 'event-based-sdr', 'high-intent-sdr', 'linkedin-sdr', 'newsletter-sdr', 'referral-sdr', 'whatsapp-sdr']
    );
  });

  it('builds each agent with model from models.json and web search only where needed', () => {
    const ctx = { supabase: null, userId: 'u1', contact: { id: 'c1', name: 'Ada' }, personaId: 'cold_saas_founder' };
    for (const slug of Object.keys(defs)) {
      const { agent, model } = factory.buildAgent(slug, ctx);
      expect(model).toMatch(/^gpt-6/);
      const hasSearch = agent.tools.some((t: any) => t.type === 'hosted_tool' || t.name === 'web_search');
      expect(hasSearch).toBe(defs[slug].search);
      expect(agent.instructions).toContain('Cold Outbound SaaS Founder');
    }
  });

  it('ships all 30 personas and validates persona ids', () => {
    expect(factory.PERSONA_IDS.size).toBe(30);
    expect(factory.getPersona('investor_update_outreach')).toBeTruthy();
    expect(factory.getPersona('nope')).toBeNull();
  });

  it('personas.json is in sync with src/agents/personas.ts', () => {
    expect(() => execFileSync('node', ['scripts/export-personas.cjs', '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  it('output schemas parse a representative payload', () => {
    const out = defs['high-intent-sdr'].output.parse({
      intentSignals: ['opened 3x'], urgency: 'high', subject: 's', body: 'b', suggestedNextAction: 'call',
    });
    expect(out.urgency).toBe('high');
    expect(() => defs['high-intent-sdr'].output.parse({ urgency: 'asap' })).toThrow();
  });
});
