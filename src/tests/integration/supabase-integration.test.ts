/**
 * Supabase Integration Tests
 *
 * agentService's database operations (agent metadata, run lifecycle, context gathering) against an in-memory
 * Supabase (tests/helpers/fakeSupabase), including how each operation reports database errors.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { agentService } from '../../services/agentService';
import { supabase } from '../../services/supabaseClient';
import type { FakeSupabase } from '../helpers/fakeSupabase';

vi.mock('../../services/supabaseClient', async () => {
  const { createFakeSupabase } = await import('../helpers/fakeSupabase');
  return { supabase: createFakeSupabase() };
});

const db = supabase as unknown as FakeSupabase;

describe('Supabase Integration Tests', () => {
  const mockUser = { id: 'test-user-id' };

  const mockAgent = {
    id: 'test-agent-id',
    name: 'Test Agent',
    description: 'Test agent for integration testing',
    tools: ['test-tool'],
    input_schema: { test: 'string' },
    output_schema: { result: 'string' },
    recommended_ui_placement: 'contact-toolbar',
    trigger_options: { manual: true },
    model: 'default',
    reasoning_effort: 'medium' as const,
    verbosity: 'medium' as const
  };

  beforeEach(() => {
    db.reset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Agent Metadata Operations', () => {
    it('should load agent metadata by id', async () => {
      db.respond('agent_metadata', 'select', { data: mockAgent, error: null });

      const agent = await agentService.loadAgentMetadata(mockAgent.id);

      expect(agent).toMatchObject({ id: mockAgent.id, name: mockAgent.name, tools: ['test-tool'], model: 'default' });
      expect(db.callsFor('agent_metadata', 'select')[0]!.filters).toEqual([['eq:id', mockAgent.id]]);
    });

    it('should load agent metadata by name', async () => {
      db.respond('agent_metadata', 'select', { data: mockAgent, error: null });

      const agent = await agentService.loadAgentByName('Test Agent');

      expect(agent?.id).toBe(mockAgent.id);
      expect(db.callsFor('agent_metadata', 'select')[0]!.filters).toEqual([['eq:name', 'Test Agent']]);
    });

    it('should fill defaults for optional metadata fields', async () => {
      db.respond('agent_metadata', 'select', { data: { id: 'sparse', name: 'Sparse', description: 'd' }, error: null });

      const agent = await agentService.loadAgentMetadata('sparse');

      expect(agent).toMatchObject({
        tools: [],
        input_schema: {},
        output_schema: {},
        recommended_ui_placement: '',
        trigger_options: {},
        reasoning_effort: 'medium',
        verbosity: 'medium'
      });
    });

    it('should return null for a missing agent', async () => {
      db.respond('agent_metadata', 'select', { data: null, error: { message: 'Not found' } });

      await expect(agentService.loadAgentMetadata('nonexistent-id')).resolves.toBeNull();
      await expect(agentService.loadAgentByName('nonexistent')).resolves.toBeNull();
    });

    it('should load all agents', async () => {
      db.respond('agent_metadata', 'select', { data: [mockAgent, { ...mockAgent, id: 'agent-2', name: 'Agent 2' }], error: null });

      const agents = await agentService.loadAllAgents();

      expect(agents).toHaveLength(2);
      expect(agents[0]?.name).toBe(mockAgent.name);
      expect(agents[1]?.name).toBe('Agent 2');
    });
  });

  describe('Agent Run Lifecycle Management', () => {
    const mockRun = {
      agent_id: mockAgent.id,
      contact_id: 'test-contact-id',
      user_id: mockUser.id,
      input_data: { test: 'input' },
      status: 'running' as const
    };

    it('should create an agent run', async () => {
      db.respond('agent_runs', 'insert', ({ payload }) => ({ data: { ...(payload as object), id: 'run-123', created_at: new Date().toISOString() }, error: null }));

      const savedRun = await agentService.saveAgentRun(mockRun);

      expect(savedRun?.id).toBe('run-123');
      expect(savedRun?.status).toBe('running');
      expect(db.callsFor('agent_runs', 'insert')[0]!.payload).toMatchObject({ agent_id: mockAgent.id, contact_id: 'test-contact-id', user_id: mockUser.id, input_data: { test: 'input' } });
    });

    it('should update agent run status and results', async () => {
      db.respond('agent_runs', 'update', { data: null, error: null });

      const updateSuccess = await agentService.updateAgentRun('run-123', {
        status: 'completed',
        output_data: { result: 'success' },
        tool_calls: [{ id: 'call-1', type: 'function', name: 'test-tool' }] as any,
        execution_time_ms: 1500,
        tokens_used: { input_tokens: 50, output_tokens: 50, total_tokens: 100 } as any
      });

      expect(updateSuccess).toBe(true);
      const [call] = db.callsFor('agent_runs', 'update');
      expect(call!.filters).toEqual([['eq:id', 'run-123']]);
      expect(call!.payload).toMatchObject({ status: 'completed', output_data: { result: 'success' }, execution_time_ms: 1500 });
    });

    it('should report a failed run update', async () => {
      db.respond('agent_runs', 'update', { data: null, error: { message: 'row not found' } });

      await expect(agentService.updateAgentRun('run-123', { status: 'failed' })).resolves.toBe(false);
    });

    it('should retrieve agent run history', async () => {
      const runs = [
        { id: 'run-1', agent_id: mockAgent.id, status: 'completed', created_at: new Date().toISOString() },
        { id: 'run-2', agent_id: mockAgent.id, status: 'running', created_at: new Date().toISOString() }
      ];
      db.respond('agent_runs', 'select', { data: runs, error: null });

      const loaded = await agentService.loadAgentRuns(mockAgent.id, undefined, undefined, 10);

      expect(loaded).toHaveLength(2);
      expect(loaded[0]?.status).toBe('completed');
      expect(loaded[1]?.status).toBe('running');
      expect(db.callsFor('agent_runs', 'select')[0]!.filters).toEqual([['eq:agent_id', mockAgent.id]]);
    });

    it('should filter agent runs by contact and deal', async () => {
      db.respond('agent_runs', 'select', { data: [{ id: 'run-1', agent_id: mockAgent.id, contact_id: 'contact-123', deal_id: 'deal-456', status: 'completed' }], error: null });

      const loaded = await agentService.loadAgentRuns(mockAgent.id, 'contact-123', 'deal-456', 10);

      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toMatchObject({ contact_id: 'contact-123', deal_id: 'deal-456' });
      expect(db.callsFor('agent_runs', 'select')[0]!.filters).toEqual([
        ['eq:agent_id', mockAgent.id],
        ['eq:contact_id', 'contact-123'],
        ['eq:deal_id', 'deal-456']
      ]);
    });

    it('should return no runs when the query fails', async () => {
      db.respond('agent_runs', 'select', { data: null, error: { message: 'boom' } });

      await expect(agentService.loadAgentRuns(mockAgent.id)).resolves.toEqual([]);
    });
  });

  describe('Context Data Gathering', () => {
    const mockContact = { id: 'contact-123', name: 'John Doe', email: 'john@example.com', company: 'Acme Corp' };
    const mockDeal = { id: 'deal-456', title: 'Big Deal', value: 50000 };

    it('should gather comprehensive context for agent execution', async () => {
      db.respond('contacts', 'select', { data: mockContact, error: null });
      db.respond('deals', 'select', { data: mockDeal, error: null });
      db.respond('agent_runs', 'select', { data: [{ id: 'run-1', status: 'completed' }], error: null });

      const context = await agentService.gatherContext(mockUser.id, mockContact.id, mockDeal.id);

      expect(context.contact).toEqual(mockContact);
      expect(context.deal).toEqual(mockDeal);
      expect(context.prior_runs).toHaveLength(1);
      expect(context.journey_history).toEqual([]);
      expect(context.analytics).toEqual({});
    });

    it('should handle missing context data gracefully', async () => {
      db.respond('contacts', 'select', { data: null, error: { message: 'Not found' } });
      db.respond('deals', 'select', { data: null, error: { message: 'Not found' } });
      db.respond('agent_runs', 'select', { data: [], error: null });

      const context = await agentService.gatherContext(mockUser.id, 'missing-contact', 'missing-deal');

      expect(context.contact).toBeUndefined();
      expect(context.deal).toBeUndefined();
      expect(context.prior_runs).toEqual([]);
    });

    it('should only query contacts and deals that were asked for', async () => {
      db.respond('agent_runs', 'select', { data: [], error: null });

      await agentService.gatherContext(mockUser.id);

      expect(db.callsFor('contacts')).toHaveLength(0);
      expect(db.callsFor('deals')).toHaveLength(0);
    });
  });

  describe('Database Connection Resilience', () => {
    it('should return no agents when the database call throws', async () => {
      vi.spyOn(db, 'from').mockImplementationOnce(() => { throw new Error('Database connection failed'); });

      await expect(agentService.loadAllAgents()).resolves.toEqual([]);
    });

    it('should return null when a query fails with a timeout', async () => {
      db.respond('agent_metadata', 'select', () => Promise.reject(new Error('Query timeout')));

      await expect(agentService.loadAgentMetadata('test-id')).resolves.toBeNull();
    });

    it('should return null for database constraint violations on insert', async () => {
      db.respond('agent_runs', 'insert', { data: null, error: { message: 'duplicate key value violates unique constraint' } });

      const result = await agentService.saveAgentRun({
        agent_id: mockAgent.id,
        user_id: mockUser.id,
        input_data: { test: 'constraint violation' },
        status: 'running'
      });

      expect(result).toBeNull();
    });

    it('should work again after a temporary database failure', async () => {
      const original = db.from;
      let calls = 0;
      vi.spyOn(db, 'from').mockImplementation((table: string) => {
        calls++;
        if (calls === 1) throw new Error('Temporary connection issue');
        return original(table);
      });
      db.respond('agent_metadata', 'select', { data: mockAgent, error: null });

      // The first call fails (reported as null), the next one succeeds: the service keeps no broken state
      await expect(agentService.loadAgentMetadata(mockAgent.id)).resolves.toBeNull();
      await expect(agentService.loadAgentMetadata(mockAgent.id)).resolves.toMatchObject({ id: mockAgent.id });
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should pass the database result through when an insert succeeds', async () => {
      // Referential integrity (agent_id -> agent_metadata) is enforced by the database, not by the service
      db.respond('agent_runs', 'insert', ({ payload }) => ({ data: { ...(payload as object), id: 'run-123' }, error: null }));

      const result = await agentService.saveAgentRun({
        agent_id: 'nonexistent-agent',
        user_id: mockUser.id,
        input_data: { test: 'data' },
        status: 'running'
      });

      expect(result).toMatchObject({ id: 'run-123', agent_id: 'nonexistent-agent' });
    });

    it('should apply concurrent updates independently', async () => {
      db.respond('agent_runs', 'update', { data: null, error: null });

      const [result1, result2] = await Promise.all([
        agentService.updateAgentRun('run-123', { status: 'running', execution_time_ms: 1000 }),
        agentService.updateAgentRun('run-123', { status: 'completed' })
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(db.callsFor('agent_runs', 'update').map(c => (c.payload as { status: string }).status).sort()).toEqual(['completed', 'running']);
    });

    it('should report database validation errors as a null result', async () => {
      db.respond('agent_runs', 'insert', { data: null, error: { message: 'Validation failed' } });

      const result = await agentService.saveAgentRun({
        agent_id: '',
        user_id: mockUser.id,
        input_data: {},
        status: 'invalid_status' as any
      });

      expect(result).toBeNull();
    });
  });
});
