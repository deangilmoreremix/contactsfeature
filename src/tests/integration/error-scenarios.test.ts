/**
 * Error Scenario Coverage Tests
 *
 * How agentFramework / agentService behave when the AI proxy, a tool, the session or the database fails.
 * Supabase is the in-memory fake (tests/helpers/fakeSupabase), the model turn is `aiJson` (server-side AI proxy)
 * and tools run through `streamFunction` (Netlify functions over SSE).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { agentFramework } from '../../services/agentFramework';
import { agentService } from '../../services/agentService';
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

describe('Error Scenario Coverage', () => {
  const mockUser = { id: 'test-user-id' };

  const mockAgent = {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'Test agent for error scenarios',
    tools: ['email-composer'],
    model: 'default'
  };

  const request = (input: Record<string, unknown> = { test: true }) => ({ agentId: mockAgent.id, userId: mockUser.id, input });
  const lastRunUpdate = () => db.callsFor('agent_runs', 'update').at(-1)!.payload as Record<string, any>;
  const signedIn = () => { (db.auth as any).getSession = async () => ({ data: { session: { access_token: 'test-token', user: mockUser } }, error: null }); };
  const signedOut = () => { (db.auth as any).getSession = async () => ({ data: { session: null }, error: null }); };

  beforeEach(() => {
    db.reset();
    vi.mocked(aiJson).mockReset();
    vi.mocked(streamFunction).mockReset();
    signedIn();
    db.respond('agent_metadata', 'select', { data: mockAgent, error: null });
    db.respond('agent_runs', 'select', { data: [], error: null });
    db.respond('agent_runs', 'insert', { data: { id: 'run-1', status: 'running', created_at: new Date().toISOString() }, error: null });
    db.respond('agent_runs', 'update', { data: null, error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AI proxy errors', () => {
    it.each([
      ['rate limits', 'Rate limit exceeded'],
      ['authentication failures', 'Please sign in to use AI features'],
      ['server errors', 'Internal server error'],
      ['network failures', 'Network connectivity lost'],
      ['DNS failures', 'ENOTFOUND api.openai.com']
    ])('should surface %s and mark the run failed', async (_label, message) => {
      vi.mocked(aiJson).mockRejectedValue(new Error(message));

      await expect(agentFramework.executeAgent(request())).rejects.toThrow(message);

      expect(lastRunUpdate()).toMatchObject({ status: 'failed', error_message: message });
    });

    it('should treat a reply without tool calls as a text-only answer', async () => {
      // aiJson validates against the agent_turn schema server-side; a sparse reply must not crash the run
      vi.mocked(aiJson).mockResolvedValue({ response: undefined, tool_calls: undefined } as any);

      const result = await agentFramework.executeAgent(request());

      expect(result.run.status).toBe('completed');
      expect(result.response.output_text).toBe('');
    });
  });

  describe('Tool execution errors', () => {
    const askForTool = (name: string, argumentsJson: string) =>
      vi.mocked(aiJson).mockResolvedValue({ response: 'Testing tool execution', tool_calls: [{ name, arguments_json: argumentsJson }] });

    it('should continue execution when an individual tool fails', async () => {
      askForTool('email-composer', '{}');
      vi.mocked(streamFunction).mockRejectedValue(new Error('Tool execution failed'));

      const result = await agentFramework.executeAgent(request());

      // The run completes; the failed call is still recorded on it
      expect(result.run.status).toBe('completed');
      expect(lastRunUpdate()['tool_calls']).toEqual([expect.objectContaining({ name: 'email-composer' })]);
    });

    it('should not run unknown tools', async () => {
      askForTool('does-not-exist', '{}');

      const result = await agentFramework.executeAgent(request());

      expect(result.run.status).toBe('completed');
      expect(streamFunction).not.toHaveBeenCalled();
    });

    it('should fail the run when the agent sends invalid tool arguments', async () => {
      askForTool('email-composer', 'invalid json');

      await expect(agentFramework.executeAgent(request())).rejects.toThrow('invalid JSON arguments');

      expect(streamFunction).not.toHaveBeenCalled();
      expect(lastRunUpdate()).toMatchObject({ status: 'failed', error_message: expect.stringContaining('invalid JSON arguments') });
    });

    it('should not call tools without a signed-in session', async () => {
      askForTool('email-composer', '{}');
      signedOut();

      const result = await agentFramework.executeAgent(request());

      expect(result.run.status).toBe('completed'); // the tool error is captured, the run itself finishes
      expect(streamFunction).not.toHaveBeenCalled();
    });
  });

  describe('Configuration errors', () => {
    it('should reject an agent that does not exist', async () => {
      db.respond('agent_metadata', 'select', { data: null, error: { message: 'No rows found' } });

      await expect(agentFramework.executeAgent(request())).rejects.toThrow('Agent test-agent not found');

      expect(aiJson).not.toHaveBeenCalled();
      expect(db.callsFor('agent_runs', 'insert')).toHaveLength(0);
    });

    it('should reject when the agent row is missing entirely', async () => {
      db.respond('agent_metadata', 'select', { data: null, error: null });

      await expect(agentFramework.executeAgent(request())).rejects.toThrow('not found');
    });

    it('should run an agent that has no tools, telling the model none are available', async () => {
      db.respond('agent_metadata', 'select', { data: { ...mockAgent, tools: [] }, error: null });
      vi.mocked(aiJson).mockResolvedValue({ response: 'No tools needed', tool_calls: [] });

      const result = await agentFramework.executeAgent(request());

      expect(result.run.status).toBe('completed');
      expect(vi.mocked(aiJson).mock.calls[0]![0].instructions).toContain('No tools are available');
    });

    it('should fail when the agent run cannot be recorded', async () => {
      db.respond('agent_runs', 'insert', { data: null, error: { message: 'duplicate key value violates unique constraint' } });

      await expect(agentFramework.executeAgent(request())).rejects.toThrow('Failed to save agent run');
      expect(aiJson).not.toHaveBeenCalled();
    });
  });

  describe('Database errors (agentService)', () => {
    it('should return no agents when the query errors', async () => {
      db.respond('agent_metadata', 'select', { data: null, error: { message: 'Database connection failed' } });

      await expect(agentService.loadAllAgents()).resolves.toEqual([]);
    });

    it('should return null when agent metadata cannot be loaded', async () => {
      db.respond('agent_metadata', 'select', { data: null, error: { message: 'Query timeout' } });

      await expect(agentService.loadAgentMetadata('test-id')).resolves.toBeNull();
    });

    it('should return null when a run violates a constraint', async () => {
      db.respond('agent_runs', 'insert', { data: null, error: { message: 'duplicate key value violates unique constraint' } });

      const result = await agentService.saveAgentRun({
        agent_id: mockAgent.id,
        user_id: mockUser.id,
        input_data: { test: 'constraint violation' },
        status: 'running'
      });

      expect(result).toBeNull();
    });

    it('should not throw when the client itself throws', async () => {
      const from = vi.spyOn(db, 'from').mockImplementationOnce(() => { throw new Error('Database connection failed'); });

      await expect(agentService.loadAllAgents()).resolves.toEqual([]);
      expect(from).toHaveBeenCalled();
    });
  });

  describe('Input handling', () => {
    it('should pass hostile input to the model as data, unchanged, and complete', async () => {
      vi.mocked(aiJson).mockResolvedValue({ response: 'Input processed safely', tool_calls: [] });
      const input = {
        malicious: '<script>alert("xss")</script>',
        sql: 'DROP TABLE users;',
        path: '../../../etc/passwd'
      };

      const result = await agentFramework.executeAgent(request(input));

      expect(result.run.status).toBe('completed');
      expect(result.response.output_text).toContain('processed safely');
      // The input is only ever JSON-encoded into the model request and stored as JSON data on the run
      expect(vi.mocked(aiJson).mock.calls[0]![0].input).toBe(JSON.stringify(input));
      expect(db.callsFor('agent_runs', 'insert')[0]!.payload).toMatchObject({ input_data: input });
    });

    it('should handle extremely large inputs', async () => {
      vi.mocked(aiJson).mockResolvedValue({ response: 'Large input processed', tool_calls: [] });
      const input = {
        largeData: 'x'.repeat(1_000_000),
        hugeArray: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }))
      };

      const result = await agentFramework.executeAgent(request(input));

      expect(result.run.status).toBe('completed');
      expect(result.response.output_text).toContain('Large input processed');
    });
  });
});
