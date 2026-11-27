/**
 * SmartCRM Agent System Test
 *
 * This test demonstrates the complete multi-agent system with:
 * - Agent Framework using OpenAI Responses API
 * - Tool calling with Netlify functions
 * - Supabase integration
 * - 10 specialized agents
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { agentFramework } from '../services/agentFramework';
import { agentService } from '../services/agentService';
import { netlifyAdapter } from '../services/netlifyAdapter';
import { supabase } from '../services/supabaseClient';
import { aiJson } from '../services/aiClient';
import type { FakeSupabase } from './helpers/fakeSupabase';

vi.mock('../services/supabaseClient', async () => {
  const { createFakeSupabase } = await import('./helpers/fakeSupabase');
  return { supabase: createFakeSupabase() };
});
vi.mock('../services/aiClient', () => ({ aiJson: vi.fn() }));
vi.mock('../services/mcpAdapter', () => ({
  mcpAdapter: { getTool: async () => null, getOpenAITools: async () => [], executeTool: async () => { throw new Error('no MCP'); } }
}));

const db = supabase as unknown as FakeSupabase;

/** The agent_metadata rows from supabase/seed_agent_metadata.sql, parsed into table rows (the DB itself is not available in unit tests). */
function loadSeedAgents(): Array<Record<string, any>> {
  const sql = readFileSync(resolve(__dirname, '../../supabase/seed_agent_metadata.sql'), 'utf8');
  const values = sql.slice(sql.indexOf('VALUES') + 6);
  const columns = ['name', 'description', 'tools', 'input_schema', 'output_schema', 'recommended_ui_placement', 'trigger_options', 'instructions', 'model', 'reasoning_effort', 'verbosity', 'max_output_tokens'];
  const json = new Set(['tools', 'input_schema', 'output_schema', 'trigger_options']);
  return values.split(/\),\s*\n\(/).map((row, index) => {
    const tokens = [...row.matchAll(/'((?:[^']|'')*)'|(\d+)/g)].map(m => (m[1] !== undefined ? m[1].replace(/''/g, "'") : Number(m[2])));
    const record: Record<string, any> = { id: `agent-${index + 1}` };
    columns.forEach((col, k) => { record[col] = json.has(col) ? JSON.parse(tokens[k] as string) : tokens[k]; });
    return record;
  });
}

describe('SmartCRM Agent System', () => {
  const seedAgents = loadSeedAgents();

  beforeEach(() => {
    db.reset();
    vi.mocked(aiJson).mockReset();
    (db.auth as any).getSession = async () => ({ data: { session: { access_token: 't' } }, error: null });
    db.respond('agent_metadata', 'select', ({ filters }) => {
      const byId = filters.find(([k]) => k === 'eq:id');
      return { data: byId ? seedAgents.find(a => a['id'] === byId[1]) ?? null : seedAgents, error: null };
    });
    db.respond('agent_runs', 'select', { data: [], error: null });
    db.respond('agent_runs', 'insert', { data: { id: 'run-1', status: 'running', created_at: new Date().toISOString() }, error: null });
    db.respond('agent_runs', 'update', { data: null, error: null });
  });

  it('should parse the seed file into the ten documented agents', () => {
    expect(seedAgents).toHaveLength(10);
  });

  describe('Agent Framework', () => {
    it('should load agent configurations', async () => {
      const agents = await agentService.loadAllAgents();
      expect(agents.length).toBeGreaterThan(0);

      const aiSdrAgent = agents.find(a => a.name === 'AI SDR Agent');
      expect(aiSdrAgent).toBeDefined();
      expect(aiSdrAgent?.tools).toContain('email-composer');
      expect(aiSdrAgent?.model).toBe('gpt-4o');
    });

    it('should execute AI SDR Agent', async () => {
      const agents = await agentService.loadAllAgents();
      const aiSdrAgent = agents.find(a => a.name === 'AI SDR Agent')!;
      vi.mocked(aiJson).mockResolvedValue({ response: 'Outreach plan', tool_calls: [] });

      const result = await agentFramework.executeAgent({
        agentId: aiSdrAgent.id,
        contactId: 'test-contact-123',
        userId: 'test-user-123',
        input: { campaign_type: 'cold_outreach' }
      });

      expect(result.run.status).toBe('completed');
      expect(result.response.output_text).toBe('Outreach plan');
    });
  });

  describe('Netlify Adapter', () => {
    it('should validate function calls', () => {
      const validation = netlifyAdapter.validateFunctionCall('email-composer', {
        contact: { name: 'John Doe' },
        purpose: 'introduction'
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid function calls', () => {
      const validation = netlifyAdapter.validateFunctionCall('email-composer', {});

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required parameter: contact');
    });

    it('should get function metadata', () => {
      const metadata = netlifyAdapter.getFunctionMetadata('email-composer');

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('email-composer');
      expect(metadata?.parameters.required).toContain('contact');
    });
  });

  describe('Agent Capabilities', () => {
    const testAgents = [
      { name: 'AI SDR Agent', tools: ['ai-enrichment', 'email-composer'] },
      { name: 'AI Dialer Agent', tools: ['discovery-questions', 'voice-analysis'] },
      { name: 'AI Journeys Agent', tools: ['communication-optimizer', 'adaptive-playbook'] },
      { name: 'Signals Agent', tools: ['email-engagement-scoring', 'deal-health-analysis'] },
      { name: 'Lead DB Agent', tools: ['contact-enrichment', 'ai-scoring'] },
      { name: 'CRM Ops Agent', tools: ['semantic-search', 'ai-insights'] },
      { name: 'Meetings Agent', tools: ['ai-scoring', 'email-composer'] },
      { name: 'AI AE Agent', tools: ['deal-health-analysis', 'generate-demo-visuals'] },
      { name: 'Agent Builder', tools: ['all-netlify-functions'] },
      { name: 'Voice Agent', tools: ['speech-to-text', 'voice-analysis'] }
    ];

    it.each(testAgents)('should configure $name with correct tools', async (agentTest) => {
      const agents = await agentService.loadAllAgents();
      const agent = agents.find(a => a.name === agentTest.name);

      expect(agent).toBeDefined();
      agentTest.tools.forEach(tool => {
        expect(agent?.tools).toContain(tool);
      });
    });
  });

  describe('Tool Integration', () => {
    it('should integrate with OpenAI image generation', async () => {
      const metadata = netlifyAdapter.getFunctionMetadata('generate-demo-visuals');

      expect(metadata).toBeDefined();
      expect(metadata?.parameters.properties['prompt']).toBeDefined();
      expect(metadata?.parameters.properties['contact_id']).toBeDefined();
    });

    it('should integrate with email composer', async () => {
      const metadata = netlifyAdapter.getFunctionMetadata('email-composer');

      expect(metadata).toBeDefined();
      expect(metadata?.parameters.properties['contact']).toBeDefined();
      expect(metadata?.parameters.properties['generate_images']).toBeDefined();
    });
  });

  describe('UI Integration Points', () => {
    it('should define contact toolbar placements', async () => {
      const agents = await agentService.loadAllAgents();
      const toolbarAgents = agents.filter(a => a.recommended_ui_placement === 'contact-toolbar');

      expect(toolbarAgents.length).toBeGreaterThan(0);
      expect(toolbarAgents.some(a => a.name === 'AI SDR Agent')).toBe(true);
    });

    it('should define pipeline button placements', async () => {
      const agents = await agentService.loadAllAgents();
      const pipelineAgents = agents.filter(a => a.recommended_ui_placement === 'pipeline-buttons');

      expect(pipelineAgents.length).toBeGreaterThan(0);
      expect(pipelineAgents.some(a => a.name === 'AI AE Agent')).toBe(true);
    });
  });
});

/**
 * Example Agent Run JSON
 */
export const exampleAgentRun = {
  agentId: "ai-sdr-agent",
  contactId: "contact-123",
  dealId: "deal-456",
  userId: "user-789",
  input: {
    campaign_type: "cold_outreach"
  },
  instructions: "Focus on personalized value proposition"
};

/**
 * Example Tool Call JSON
 */
export const exampleToolCall = {
  id: "call_123",
  type: "function",
  function: {
    name: "email-composer",
    arguments: JSON.stringify({
      contact: {
        name: "John Doe",
        email: "john@company.com",
        title: "CTO",
        company: "TechCorp"
      },
      purpose: "introduction",
      generate_images: true
    })
  }
};

/**
 * Example Agent Response JSON
 */
export const exampleAgentResponse = {
  id: "response_123",
  agent_id: "ai-sdr-agent",
  output_text: "I've analyzed the contact and created a personalized outreach sequence...",
  tool_calls: [exampleToolCall],
  usage: {
    input_tokens: 150,
    output_tokens: 300,
    total_tokens: 450
  },
  metadata: {
    generated_images: 2,
    email_drafts: 1,
    confidence_score: 85
  }
};