/**
 * End-to-End Agent Execution Tests
 *
 * agentFramework.executeAgent against an in-memory Supabase (tests/helpers/fakeSupabase): load the agent,
 * gather context, record the run, run the planning turn through the server-side AI proxy (aiJson), execute the
 * requested tools through the Netlify functions (streamFunction) and complete the run.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { agentFramework } from '../../services/agentFramework';
import { supabase } from '../../services/supabaseClient';
import { aiJson } from '../../services/aiClient';
import { streamFunction } from '../../services/liveFunction';
import type { FakeSupabase } from '../helpers/fakeSupabase';

vi.mock('../../services/supabaseClient', async () => {
  const { createFakeSupabase } = await import('../helpers/fakeSupabase');
  return { supabase: createFakeSupabase() };
});
vi.mock('../../services/aiClient', () => ({ aiJson: vi.fn() }));
vi.mock('../../services/liveFunction', () => ({ streamFunction: vi.fn() }));
// No MCP tools are registered (plain functions, so restoreAllMocks cannot reset them)
vi.mock('../../services/mcpAdapter', () => ({
  mcpAdapter: { getTool: async () => null, getOpenAITools: async () => [], executeTool: async () => { throw new Error('no MCP tools in tests'); } }
}));

const db = supabase as unknown as FakeSupabase;

describe('End-to-End Agent Execution', () => {
  const mockUser = { id: 'test-user-id' };

  const mockContact = {
    id: 'test-contact-id',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp'
  };

  const mockAgent = {
    id: 'ai-sdr-agent',
    name: 'AI SDR Agent',
    description: 'Turn contacts into booked meetings',
    tools: ['email-composer'],
    model: 'default',
    instructions: 'You are an expert SDR assistant...'
  };

  /** Seed the database for one run of `agent`. */
  function seed(agent: typeof mockAgent) {
    db.respond('agent_metadata', 'select', { data: agent, error: null });
    db.respond('contacts', 'select', { data: mockContact, error: null });
    db.respond('agent_runs', 'select', { data: [], error: null });
    db.respond('agent_runs', 'insert', { data: { id: 'test-run-id', agent_id: agent.id, status: 'running', created_at: new Date().toISOString() }, error: null });
    db.respond('agent_runs', 'update', { data: null, error: null });
  }

  const lastRunUpdate = () => db.callsFor('agent_runs', 'update').at(-1)!.payload as Record<string, any>;

  beforeEach(() => {
    db.reset();
    vi.mocked(aiJson).mockReset();
    vi.mocked(streamFunction).mockReset();
    (db.auth as any).getSession = async () => ({ data: { session: { access_token: 'test-token', user: mockUser } }, error: null });
  });

  it('should execute complete AI SDR Agent workflow', async () => {
    seed(mockAgent);
    vi.mocked(aiJson).mockResolvedValue({ response: 'Generated outreach sequence for John Doe', tool_calls: [] });

    const result = await agentFramework.executeAgent({
      agentId: mockAgent.id,
      contactId: mockContact.id,
      userId: mockUser.id,
      input: { campaign_type: 'introduction' }
    });

    expect(result.run.status).toBe('completed');
    expect(result.response.output_text).toContain('Generated outreach sequence');
    expect(result.response.agent_id).toBe(mockAgent.id);

    // The planning turn went through the AI proxy with the agent's instructions, contact context and input
    expect(aiJson).toHaveBeenCalledTimes(1);
    const request = vi.mocked(aiJson).mock.calls[0]![0];
    expect(request.instructions).toContain('You are an expert SDR assistant');
    expect(request.instructions).toContain('john@example.com');
    expect(request.input).toBe(JSON.stringify({ campaign_type: 'introduction' }));

    // The run was recorded as running, then completed with its output
    expect(db.callsFor('agent_runs', 'insert')[0]!.payload).toMatchObject({ agent_id: mockAgent.id, contact_id: mockContact.id, user_id: mockUser.id, status: 'running' });
    expect(lastRunUpdate()).toMatchObject({ status: 'completed', output_data: expect.objectContaining({ output_text: expect.stringContaining('Generated outreach sequence') }) });
  });

  it('should handle agent execution with tool calls', async () => {
    seed(mockAgent);
    const emailArgs = { contact: mockContact, purpose: 'introduction' };
    vi.mocked(aiJson).mockResolvedValue({
      response: 'Preparing personalized outreach',
      tool_calls: [{ name: 'email-composer', arguments_json: JSON.stringify(emailArgs) }]
    });
    vi.mocked(streamFunction).mockResolvedValue({ result: { subject: 'Introduction to SmartCRM', body: 'Personalized email content...' }, outcome: {} as any, citations: [] });

    const result = await agentFramework.executeAgent({
      agentId: mockAgent.id,
      contactId: mockContact.id,
      userId: mockUser.id,
      input: { campaign_type: 'introduction' }
    });

    expect(result.run.status).toBe('completed');
    // The email-composer function was called with the model's arguments
    expect(streamFunction).toHaveBeenCalledTimes(1);
    expect(vi.mocked(streamFunction).mock.calls[0]![0]).toBe('/.netlify/functions/email-composer');
    expect(vi.mocked(streamFunction).mock.calls[0]![1]).toEqual(emailArgs);
    // The tool call is stored on the run record
    expect(lastRunUpdate()['tool_calls']).toEqual([expect.objectContaining({ type: 'function', name: 'email-composer', arguments: emailArgs })]);
  });

  it('should execute several requested tools in the order the agent asked for them', async () => {
    const complexAgent = { ...mockAgent, tools: ['ai-enrichment', 'email-composer', 'generate-demo-visuals'] };
    seed(complexAgent);
    vi.mocked(aiJson).mockResolvedValue({
      response: 'Starting comprehensive outreach process',
      tool_calls: [
        { name: 'ai-enrichment', arguments_json: JSON.stringify({ contact_id: mockContact.id }) },
        { name: 'email-composer', arguments_json: JSON.stringify({ contact: mockContact, purpose: 'introduction' }) }
      ]
    });
    vi.mocked(streamFunction)
      .mockResolvedValueOnce({ result: { enriched: true, score: 85 }, outcome: {} as any, citations: [] })
      .mockResolvedValueOnce({ result: { subject: 'SmartCRM Introduction', body: 'Personalized content...' }, outcome: {} as any, citations: [] });

    const result = await agentFramework.executeAgent({
      agentId: complexAgent.id,
      contactId: mockContact.id,
      userId: mockUser.id,
      input: { operation: 'full_outreach' }
    });

    expect(result.run.status).toBe('completed');
    expect(vi.mocked(streamFunction).mock.calls.map(c => c[0])).toEqual([
      '/.netlify/functions/ai-enrichment',
      '/.netlify/functions/email-composer'
    ]);
    expect(lastRunUpdate()['tool_calls'].map((tc: { name: string }) => tc.name)).toEqual(['ai-enrichment', 'email-composer']);
  });

  it('should validate agent execution results structure', async () => {
    seed(mockAgent);
    // A structured reply is applied as updates to the contact
    vi.mocked(aiJson).mockResolvedValue({
      response: JSON.stringify({ contact_updates: { status: 'prospect' }, tags: ['warm'] }),
      tool_calls: []
    });

    const result = await agentFramework.executeAgent({
      agentId: mockAgent.id,
      contactId: mockContact.id,
      userId: mockUser.id,
      input: {}
    });

    expect(result.run).toMatchObject({ id: 'test-run-id', status: 'completed' });
    expect(result.response).toMatchObject({
      agent_id: mockAgent.id,
      output_text: expect.any(String),
      tool_calls: [],
      usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } // the proxy reports no per-call usage; none is invented
    });
    expect(result.updates).toEqual({
      contacts: [{ id: mockContact.id, updates: { status: 'prospect' } }],
      deals: [],
      insights: [],
      tags: ['warm'],
      tasks: []
    });
  });

  it('should fail and mark the run failed when the agent does not exist', async () => {
    db.respond('agent_metadata', 'select', { data: null, error: { message: 'not found' } });

    await expect(agentFramework.executeAgent({ agentId: 'missing', userId: mockUser.id, input: {} }))
      .rejects.toThrow('Agent missing not found');
    expect(db.callsFor('agent_runs', 'insert')).toHaveLength(0);
  });
});
