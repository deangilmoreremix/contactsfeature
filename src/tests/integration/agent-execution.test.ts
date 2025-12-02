/**
 * End-to-End Agent Execution Tests
 * Tests complete agent workflows from execution to result validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { agentFramework } from '../../services/agentFramework';
import { agentService } from '../../services/agentService';
import { supabase } from '../../services/supabaseClient';

// Mock external dependencies
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

describe('End-to-End Agent Execution', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  };

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
    model: 'gpt-4o',
    instructions: 'You are an expert SDR assistant...'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: mockUser
        }
      },
      error: null
    });

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  it('should execute complete AI SDR Agent workflow', async () => {
    // Mock agent metadata
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockAgent,
            error: null
          })
        }))
      }))
    } as any);

    // Mock contact data
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockContact,
            error: null
          })
        }))
      }))
    } as any);

    // Mock agent run creation
    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-run-id',
              agent_id: mockAgent.id,
              status: 'running',
              created_at: new Date().toISOString()
            },
            error: null
          })
        }))
      }))
    } as any);

    // Mock OpenAI API call
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        id: 'test-response-id',
        choices: [{
          message: {
            content: 'Generated outreach sequence for John Doe',
            tool_calls: []
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      })
    });

    // Mock agent run update
    vi.mocked(supabase.from).mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    } as any);

    const request = {
      agentId: mockAgent.id,
      contactId: mockContact.id,
      userId: mockUser.id,
      input: { campaign_type: 'introduction' }
    };

    const result = await agentFramework.executeAgent(request);

    expect(result).toBeDefined();
    expect(result.run.status).toBe('completed');
    expect(result.response.output_text).toContain('Generated outreach sequence');
    expect(result.response.usage?.total_tokens).toBe(150);
  });

  it('should handle agent execution with tool calls', async () => {
    const agentWithTools = {
      ...mockAgent,
      tools: ['email-composer']
    };

    // Setup mocks for agent with tools
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: agentWithTools,
            error: null
          })
        }))
      }))
    } as any);

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockContact,
            error: null
          })
        }))
      }))
    } as any);

    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-run-id', status: 'running' },
            error: null
          })
        }))
      }))
    } as any);

    // Mock OpenAI response with tool calls
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Preparing personalized outreach',
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'email-composer',
                  arguments: JSON.stringify({
                    contact: mockContact,
                    purpose: 'introduction'
                  })
                }
              }]
            }
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          subject: 'Introduction to SmartCRM',
          body: 'Personalized email content...'
        })
      });

    vi.mocked(supabase.from).mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    } as any);

    const request = {
      agentId: agentWithTools.id,
      contactId: mockContact.id,
      userId: mockUser.id,
      input: { campaign_type: 'introduction' }
    };

    const result = await agentFramework.executeAgent(request);

    expect(result).toBeDefined();
    expect(result.run.status).toBe('completed');
    expect(result.response.tool_calls).toHaveLength(1);
    expect(result.response.tool_calls?.[0]?.name).toBe('email-composer');
  });

  it('should handle multi-step tool chaining', async () => {
    const complexAgent = {
      ...mockAgent,
      tools: ['ai-enrichment', 'email-composer', 'generate-demo-visuals']
    };

    // Setup mocks
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: complexAgent,
            error: null
          })
        }))
      }))
    } as any);

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockContact,
            error: null
          })
        }))
      }))
    } as any);

    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-run-id', status: 'running' },
            error: null
          })
        }))
      }))
    } as any);

    // Mock sequential tool calls
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Starting comprehensive outreach process',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'ai-enrichment',
                    arguments: JSON.stringify({ contact_id: mockContact.id })
                  }
                }
              ]
            }
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ enriched: true, score: 85 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Enrichment complete, now composing email',
              tool_calls: [
                {
                  id: 'call_2',
                  type: 'function',
                  function: {
                    name: 'email-composer',
                    arguments: JSON.stringify({
                      contact: mockContact,
                      purpose: 'introduction'
                    })
                  }
                }
              ]
            }
          }],
          usage: { prompt_tokens: 200, completion_tokens: 75, total_tokens: 275 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          subject: 'SmartCRM Introduction',
          body: 'Personalized content based on enrichment data...'
        })
      });

    vi.mocked(supabase.from).mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    } as any);

    const request = {
      agentId: complexAgent.id,
      contactId: mockContact.id,
      userId: mockUser.id,
      input: { operation: 'full_outreach' }
    };

    const result = await agentFramework.executeAgent(request);

    expect(result).toBeDefined();
    expect(result.run.status).toBe('completed');
    expect(result.response.tool_calls).toHaveLength(2);
    expect(result.response.tool_calls.map(tc => tc.name)).toEqual(
      expect.arrayContaining(['ai-enrichment', 'email-composer'])
    );
  });

  it('should validate agent execution results structure', async () => {
    // Setup minimal mocks
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockAgent,
            error: null
          })
        }))
      }))
    } as any);

    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-run-id', status: 'running' },
            error: null
          })
        }))
      }))
    } as any);

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{
          message: { content: 'Test response', tool_calls: [] }
        }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      })
    });

    vi.mocked(supabase.from).mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    } as any);

    const request = {
      agentId: mockAgent.id,
      userId: mockUser.id,
      input: { test: 'validation' }
    };

    const result = await agentFramework.executeAgent(request);

    // Validate result structure
    expect(result).toHaveProperty('run');
    expect(result).toHaveProperty('response');
    expect(result).toHaveProperty('updates');

    expect(result.run).toHaveProperty('id');
    expect(result.run).toHaveProperty('status');
    expect(result.run).toHaveProperty('agent_id');
    expect(result.run.status).toBe('completed');

    expect(result.response).toHaveProperty('output_text');
    expect(result.response).toHaveProperty('usage');
    expect(result.response).toHaveProperty('tool_calls');

    expect(result.updates).toHaveProperty('contacts');
    expect(result.updates).toHaveProperty('deals');
    expect(result.updates).toHaveProperty('insights');
    expect(result.updates).toHaveProperty('tags');
    expect(result.updates).toHaveProperty('tasks');
  });
});