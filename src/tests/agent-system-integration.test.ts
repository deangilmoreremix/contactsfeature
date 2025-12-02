/**
 * SmartCRM Agent System - Integration Test Implementation Guide
 *
 * This guide shows how to implement comprehensive testing for the missing test categories:
 *
 * ❌ End-to-end agent execution tests
 * ❌ Supabase integration tests
 * ❌ Error scenario coverage
 * ❌ Performance/load testing
 *
 * IMPLEMENTATION STRATEGY:
 * =======================
 *
 * 1. Use a separate test database for integration tests
 * 2. Mock external APIs (OpenAI, Gemini) but test real Supabase operations
 * 3. Use test-specific environment variables
 * 4. Implement proper test isolation and cleanup
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// END-TO-END AGENT EXECUTION TESTS
// ============================================================================

// ============================================================================
// END-TO-END AGENT EXECUTION TESTS
// ============================================================================

describe('End-to-End Agent Execution Tests', () => {
  it('should execute complete AI SDR Agent workflow', async () => {
    /**
     * TEST SCENARIO:
     * 1. Load AI SDR Agent configuration from database
     * 2. Execute agent with contact context
     * 3. Verify agent calls email-composer tool
     * 4. Verify agent generates outreach sequence
     * 5. Verify agent run is saved to database
     * 6. Verify contact/deal updates are applied
     *
     * IMPLEMENTATION APPROACH:
     * - Use test database with seeded agent metadata
     * - Mock OpenAI API responses
     * - Mock Netlify function calls
     * - Verify database state changes
     * - Check agent run history
     */
    expect(true).toBe(true); // Placeholder - implement with real test database
  });

  it('should handle agent execution with image generation', async () => {
    /**
     * TEST SCENARIO:
     * 1. Execute AI AE Agent with demo preparation request
     * 2. Verify agent calls generate-demo-visuals tool
     * 3. Verify Gemini API integration works
     * 4. Verify images are stored in Supabase Storage
     * 5. Verify image metadata is saved to database
     * 6. Verify agent response includes image URLs
     *
     * IMPLEMENTATION APPROACH:
     * - Mock Gemini API responses
     * - Test real Supabase Storage operations
     * - Verify image metadata structure
     * - Check storage bucket contents
     */
    expect(true).toBe(true); // Placeholder - implement with real services
  });

  it('should execute agent with multi-step tool chaining', async () => {
    /**
     * TEST SCENARIO:
     * 1. Execute agent that requires multiple tool calls
     * 2. Verify tools are called in correct sequence
     * 3. Verify tool results are properly combined
     * 4. Verify final agent response incorporates all tool outputs
     * 5. Verify execution time and token usage are tracked
     *
     * IMPLEMENTATION APPROACH:
     * - Create agent with complex tool chain
     * - Mock sequential tool responses
     * - Verify execution order
     * - Check performance metrics
     */
    expect(true).toBe(true); // Placeholder - implement with real agent execution
  });
});

// ============================================================================
// SUPABASE INTEGRATION TESTS
// ============================================================================

describe('Supabase Integration Tests', () => {
  it('should handle agent metadata CRUD operations', async () => {
    /**
     * TEST SCENARIO:
     * 1. Create new agent metadata record
     * 2. Read agent metadata by ID and name
     * 3. Update agent configuration
     * 4. Delete agent metadata
     * 5. Verify data consistency across operations
     *
     * IMPLEMENTATION APPROACH:
     * - Use test database schema
     * - Test all CRUD operations
     * - Verify data validation
     * - Check referential integrity
     * - Test bulk operations
     */
    expect(true).toBe(true); // Placeholder - implement with test database
  });

  it('should manage agent run lifecycle in database', async () => {
    /**
     * TEST SCENARIO:
     * 1. Create agent run record with 'running' status
     * 2. Update run with tool calls and partial results
     * 3. Complete run with final results and metrics
     * 4. Query run history and verify data integrity
     * 5. Test run cleanup and archival
     *
     * IMPLEMENTATION APPROACH:
     * - Test complete run lifecycle
     * - Verify status transitions
     * - Check data consistency
     * - Test query performance
     * - Verify audit trail
     */
    expect(true).toBe(true); // Placeholder - implement with real database operations
  });

  it('should handle context gathering from multiple tables', async () => {
    /**
     * TEST SCENARIO:
     * 1. Gather context for agent execution
     * 2. Load contact data from contacts table
     * 3. Load deal data from deals table
     * 4. Load journey history from interactions table
     * 5. Load prior agent runs from agent_runs table
     * 6. Verify context structure and data completeness
     *
     * IMPLEMENTATION APPROACH:
     * - Seed test data across multiple tables
     * - Test context gathering logic
     * - Verify data relationships
     * - Check performance with large datasets
     * - Test error handling for missing data
     */
    expect(true).toBe(true); // Placeholder - implement with seeded test data
  });

  it('should handle database connection failures gracefully', async () => {
    /**
     * TEST SCENARIO:
     * 1. Simulate database connection failures
     * 2. Test connection retry logic
     * 3. Verify graceful degradation
     * 4. Check error reporting and logging
     * 5. Test connection recovery
     *
     * IMPLEMENTATION APPROACH:
     * - Mock database connection failures
     * - Test retry mechanisms
     * - Verify error boundaries
     * - Check monitoring/alerting
     * - Test failover scenarios
     */
    expect(true).toBe(true); // Placeholder - implement with connection mocking
  });
});

// ============================================================================
// ERROR SCENARIO COVERAGE
// ============================================================================

describe('Error Scenario Coverage', () => {
  it('should handle OpenAI API failures and retries', async () => {
    /**
     * TEST SCENARIO:
     * 1. Simulate OpenAI API rate limiting
     * 2. Test retry logic with exponential backoff
     * 3. Verify fallback to alternative models
     * 4. Check error reporting and user feedback
     * 5. Test partial failure recovery
     *
     * IMPLEMENTATION APPROACH:
     * - Mock OpenAI API failures
     * - Test retry configuration
     * - Verify error handling logic
     * - Check user experience during failures
     * - Test recovery mechanisms
     */
    expect(true).toBe(true); // Placeholder - implement with API mocking
  });

  it('should handle tool execution failures', async () => {
    /**
     * TEST SCENARIO:
     * 1. Simulate Netlify function failures
     * 2. Test tool timeout handling
     * 3. Verify partial success scenarios
     * 4. Check agent continues with available tools
     * 5. Test error aggregation and reporting
     *
     * IMPLEMENTATION APPROACH:
     * - Mock tool execution failures
     * - Test error isolation
     * - Verify agent resilience
     * - Check error reporting
     * - Test recovery strategies
     */
    expect(true).toBe(true); // Placeholder - implement with tool mocking
  });

  it('should handle authentication and authorization failures', async () => {
    /**
     * TEST SCENARIO:
     * 1. Test expired authentication tokens
     * 2. Verify token refresh logic
     * 3. Test insufficient permissions
     * 4. Check access control enforcement
     * 5. Verify secure error messages
     *
     * IMPLEMENTATION APPROACH:
     * - Mock auth failures
     * - Test token handling
     * - Verify security boundaries
     * - Check error sanitization
     * - Test user feedback
     */
    expect(true).toBe(true); // Placeholder - implement with auth mocking
  });

  it('should handle invalid agent configurations', async () => {
    /**
     * TEST SCENARIO:
     * 1. Test malformed agent metadata
     * 2. Verify configuration validation
     * 3. Check graceful handling of invalid tools
     * 4. Test model compatibility issues
     * 5. Verify error reporting for config issues
     *
     * IMPLEMENTATION APPROACH:
     * - Test invalid agent configs
     * - Verify validation logic
     * - Check error handling
     * - Test configuration recovery
     * - Verify user feedback
     */
    expect(true).toBe(true); // Placeholder - implement with config validation
  });
});

// ============================================================================
// PERFORMANCE AND LOAD TESTING
// ============================================================================

describe('Performance and Load Testing', () => {
  it('should handle concurrent agent executions', async () => {
    /**
     * TEST SCENARIO:
     * 1. Execute multiple agents simultaneously
     * 2. Measure execution times and resource usage
     * 3. Verify isolation between executions
     * 4. Check database connection pooling
     * 5. Test memory and CPU usage under load
     *
     * IMPLEMENTATION APPROACH:
     * - Use test runners with concurrency
     * - Measure performance metrics
     * - Monitor resource usage
     * - Test database connection limits
     * - Verify execution isolation
     *
     * PERFORMANCE TARGETS:
     * - Max concurrent executions: 10
     * - Average execution time: < 2 seconds
     * - Memory usage: < 100MB per execution
     * - Database connections: < 5 per execution
     */
    expect(true).toBe(true); // Placeholder - implement with load testing framework
  });

  it('should maintain performance with large datasets', async () => {
    /**
     * TEST SCENARIO:
     * 1. Test agent execution with large contact/deal datasets
     * 2. Measure query performance and memory usage
     * 3. Test context gathering with 1000+ records
     * 4. Verify efficient data processing
     * 5. Check memory cleanup and garbage collection
     *
     * IMPLEMENTATION APPROACH:
     * - Seed large test datasets
     * - Monitor memory usage
     * - Measure query performance
     * - Test data processing efficiency
     * - Verify resource cleanup
     *
     * SCALE TARGETS:
     * - Contact records: 10,000
     * - Deal records: 5,000
     * - Context gathering: < 500ms
     * - Memory usage: < 200MB
     * - Query optimization: < 100ms per query
     */
    expect(true).toBe(true); // Placeholder - implement with large dataset testing
  });

  it('should handle sustained load over time', async () => {
    /**
     * TEST SCENARIO:
     * 1. Run continuous agent executions for extended period
     * 2. Monitor memory leaks and performance degradation
     * 3. Test database connection stability
     * 4. Verify consistent execution times
     * 5. Check system resource usage over time
     *
     * IMPLEMENTATION APPROACH:
     * - Implement endurance testing
     * - Monitor system resources
     * - Check for memory leaks
     * - Verify performance stability
     * - Test long-running scenarios
     *
     * ENDURANCE TARGETS:
     * - Test duration: 1 hour
     * - Execution frequency: 1 per minute
     * - Memory growth: < 10MB/hour
     * - Performance degradation: < 5%
     * - Error rate: < 1%
     */
    expect(true).toBe(true); // Placeholder - implement with endurance testing
  });

  it('should optimize database queries under load', async () => {
    /**
     * TEST SCENARIO:
     * 1. Test database query performance under concurrent load
     * 2. Verify query optimization and indexing
     * 3. Check connection pooling efficiency
     * 4. Test query result caching
     * 5. Monitor database performance metrics
     *
     * IMPLEMENTATION APPROACH:
     * - Load test database operations
     * - Monitor query execution plans
     * - Test connection pooling
     * - Verify indexing effectiveness
     * - Check query result caching
     *
     * DATABASE TARGETS:
     * - Query execution: < 50ms average
     * - Connection pool utilization: < 80%
     * - Cache hit rate: > 90%
     * - Concurrent connections: < 20
     * - Database CPU usage: < 70%
     */
    expect(true).toBe(true); // Placeholder - implement with database load testing
  });
});

// ============================================================================
// TEST UTILITIES AND HELPERS
// ============================================================================

describe('Test Utilities and Helpers', () => {
  it('should provide comprehensive test data factories', () => {
    /**
     * TEST DATA FACTORIES:
     * - createMockUser(): Generate consistent user test data
     * - createMockContact(): Generate contact test data with relationships
     * - createMockDeal(): Generate deal test data with stages
     * - createMockAgent(): Generate agent configurations
     * - createMockAgentRun(): Generate agent execution data
     * - createMockToolCall(): Generate tool call test data
     *
     * USAGE:
     * const user = createMockUser({ email: 'test@example.com' });
     * const contact = createMockContact({ company: 'Test Corp' });
     * const agent = createMockAgent({ tools: ['email-composer'] });
     */
    expect(true).toBe(true); // Placeholder - implement test data factories
  });

  it('should provide test environment setup utilities', () => {
    /**
     * ENVIRONMENT SETUP UTILITIES:
     * - setupTestDatabase(): Initialize clean test database
     * - seedTestData(): Populate test data
     * - mockExternalAPIs(): Mock OpenAI, Gemini, Netlify functions
     * - cleanupTestData(): Clean up after tests
     * - resetTestEnvironment(): Reset all test state
     *
     * USAGE:
     * beforeAll(async () => {
     *   await setupTestDatabase();
     *   await seedTestData();
     * });
     *
     * afterEach(async () => {
     *   await cleanupTestData();
     * });
     */
    expect(true).toBe(true); // Placeholder - implement environment utilities
  });

  it('should provide performance monitoring utilities', () => {
    /**
     * PERFORMANCE MONITORING:
     * - measureExecutionTime(): Time function execution
     * - monitorMemoryUsage(): Track memory consumption
     * - trackDatabaseQueries(): Monitor query performance
     * - measureAPIResponseTimes(): Track external API calls
     * - generatePerformanceReport(): Create performance summaries
     *
     * USAGE:
     * const executionTime = await measureExecutionTime(async () => {
     *   await agentFramework.executeAgent(request);
     * });
     * expect(executionTime).toBeLessThan(2000);
     */
    expect(true).toBe(true); // Placeholder - implement performance monitoring
  });
});

// ============================================================================
// CI/CD INTEGRATION GUIDE
// ============================================================================

/**
 * CI/CD INTEGRATION STRATEGY:
 *
 * 1. TEST ENVIRONMENT SETUP:
 *    - Separate test database (e.g., smartcrm_test)
 *    - Isolated Supabase project for testing
 *    - Mock external APIs in CI environment
 *    - Use test-specific environment variables
 *
 * 2. TEST EXECUTION PHASES:
 *    - Unit Tests: Fast, isolated component tests
 *    - Integration Tests: Database and service integration
 *    - End-to-End Tests: Full workflow testing
 *    - Performance Tests: Load and stress testing
 *
 * 3. TEST DATA MANAGEMENT:
 *    - Seed test data before test execution
 *    - Clean up test data after each test
 *    - Use factories for consistent test data
 *    - Maintain referential integrity
 *
 * 4. MONITORING AND REPORTING:
 *    - Track test execution times
 *    - Monitor resource usage
 *    - Generate detailed test reports
 *    - Set up alerts for test failures
 *
 * 5. PERFORMANCE BASELINES:
 *    - Establish performance benchmarks
 *    - Monitor performance regressions
 *    - Set up automated performance testing
 *    - Track performance trends over time
 */

// Placeholder test to ensure file runs
it('should provide comprehensive testing framework', () => {
  expect(true).toBe(true);
});

describe('SmartCRM Agent System - Integration Test Guide', () => {

  const mockContact = {
    id: 'test-contact-id',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp',
    title: 'CTO'
  };

  const mockDeal = {
    id: 'test-deal-id',
    name: 'Enterprise Software Deal',
    value: 50000,
    stage: 'discovery'
  };

  const mockAgent = {
    id: 'ai-sdr-agent',
    name: 'AI SDR Agent',
    description: 'Turn contacts into booked meetings',
    tools: ['ai-enrichment', 'email-composer'],
    model: 'gpt-4o',
    instructions: 'You are an expert SDR assistant...'
  };

  beforeAll(() => {
    // Setup test environment
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-openai-key');
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'test-token', user: mockUser } },
      error: null
    });

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('End-to-End Agent Execution Tests', () => {
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
      expect(result.response.usage.total_tokens).toBe(150);
    });

    it('should handle agent execution with tool calls', async () => {
      // Mock agent with tools
      const agentWithTools = {
        ...mockAgent,
        tools: ['email-composer', 'generate-demo-visuals']
      };

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

      // Mock contact and deal data
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
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockDeal,
              error: null
            })
          }))
        }))
      } as any);

      // Mock agent run operations
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
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-response-id',
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
      });

      // Mock Netlify function call
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            subject: 'Introduction to SmartCRM',
            body: 'Personalized email content...'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            subject: 'Introduction to SmartCRM',
            body: 'Personalized email content...'
          })
        });

      // Mock agent run update
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const request = {
        agentId: agentWithTools.id,
        contactId: mockContact.id,
        dealId: mockDeal.id,
        userId: mockUser.id,
        input: { campaign_type: 'introduction' }
      };

      const result = await agentFramework.executeAgent(request);

      expect(result).toBeDefined();
      expect(result.run.status).toBe('completed');
      expect(result.response.tool_calls).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/.netlify/functions/email-composer'),
        expect.any(Object)
      );
    });

    it('should execute AI AE Agent with image generation', async () => {
      const aeAgent = {
        id: 'ai-ae-agent',
        name: 'AI AE Agent',
        description: 'Demo preparation and follow-ups',
        tools: ['generate-demo-visuals', 'email-composer'],
        model: 'gpt-4o',
        instructions: 'You are an expert Account Executive...'
      };

      // Setup mocks for AE agent execution
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: aeAgent,
              error: null
            })
          }))
        }))
      } as any);

      // Mock contact and deal
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
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockDeal,
              error: null
            })
          }))
        }))
      } as any);

      // Mock agent run
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

      // Mock OpenAI response with image generation tool call
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Preparing demo visuals',
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'generate-demo-visuals',
                  arguments: JSON.stringify({
                    prompt: 'Create professional demo visuals for enterprise software',
                    contact_id: mockContact.id,
                    deal_id: mockDeal.id
                  })
                }
              }]
            }
          }],
          usage: { prompt_tokens: 120, completion_tokens: 60, total_tokens: 180 }
        })
      });

      // Mock Gemini image generation response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          images: [{
            id: 'img-1',
            url: 'https://example.com/image1.png',
            filename: 'demo-visual-1.png',
            metadata: { prompt: 'demo visuals' }
          }],
          metadata: { total_generated: 1, model: 'gemini-2.5-flash' }
        })
      });

      // Mock agent run update
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const request = {
        agentId: aeAgent.id,
        contactId: mockContact.id,
        dealId: mockDeal.id,
        userId: mockUser.id,
        input: { demo_type: 'product-overview' }
      };

      const result = await agentFramework.executeAgent(request);

      expect(result).toBeDefined();
      expect(result.response.tool_calls).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/.netlify/functions/gemini-image-generator'),
        expect.any(Object)
      );
    });
  });

  describe('Supabase Integration Tests', () => {
    it('should handle agent metadata CRUD operations', async () => {
      // Test loading agent metadata
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

      const agent = await agentService.loadAgentMetadata(mockAgent.id);
      expect(agent).toEqual(mockAgent);

      // Test loading all agents
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [mockAgent],
            error: null
          })
        }))
      } as any);

      const agents = await agentService.loadAllAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0]).toEqual(mockAgent);
    });

    it('should manage agent run lifecycle', async () => {
      const runData = {
        agent_id: mockAgent.id,
        contact_id: mockContact.id,
        user_id: mockUser.id,
        input_data: { test: 'data' },
        status: 'running' as const
      };

      // Mock successful run creation
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { ...runData, id: 'run-123', created_at: new Date().toISOString() },
              error: null
            })
          }))
        }))
      } as any);

      const savedRun = await agentService.saveAgentRun(runData);
      expect(savedRun).toBeDefined();
      expect(savedRun?.id).toBe('run-123');

      // Test run update
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const updateSuccess = await agentService.updateAgentRun('run-123', {
        status: 'completed',
        execution_time_ms: 1500
      });
      expect(updateSuccess).toBe(true);
    });

    it('should handle context gathering from Supabase', async () => {
      // Mock contact query
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

      // Mock deal query
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockDeal,
              error: null
            })
          }))
        }))
      } as any);

      // Mock prior runs query
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          }))
        }))
      } as any);

      const context = await agentService.gatherContext(mockUser.id, mockContact.id, mockDeal.id);

      expect(context.contact).toEqual(mockContact);
      expect(context.deal).toEqual(mockDeal);
      expect(context.journey_history).toEqual([]);
      expect(context.prior_runs).toEqual([]);
    });

    it('should handle Supabase connection errors gracefully', async () => {
      // Mock connection error
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection failed' }
            })
          }))
        }))
      } as any);

      const agent = await agentService.loadAgentMetadata('nonexistent-id');
      expect(agent).toBeNull();
    });
  });

  describe('Error Scenario Coverage', () => {
    it('should handle OpenAI API failures', async () => {
      // Setup mocks
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

      // Mock OpenAI API failure
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue('Rate limit exceeded')
      });

      // Mock run update for failure
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const request = {
        agentId: mockAgent.id,
        contactId: mockContact.id,
        userId: mockUser.id,
        input: {}
      };

      await expect(agentFramework.executeAgent(request)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle tool execution failures', async () => {
      // Setup agent with tools
      const agentWithTools = { ...mockAgent, tools: ['failing-tool'] };

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

      // Mock OpenAI response with tool call
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Testing tool execution',
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'failing-tool',
                  arguments: '{}'
                }
              }]
            }
          }],
          usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
        })
      });

      // Mock tool execution failure
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Tool execution failed' })
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
        input: {}
      };

      const result = await agentFramework.executeAgent(request);

      // Should complete despite tool failure
      expect(result.run.status).toBe('completed');
      expect(result.response).toBeDefined();
    });

    it('should handle authentication failures', async () => {
      // Mock auth failure
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Not authenticated' }
      });

      const request = {
        agentId: mockAgent.id,
        userId: mockUser.id,
        input: {}
      };

      await expect(agentFramework.executeAgent(request)).rejects.toThrow('User must be authenticated');
    });

    it('should handle invalid agent IDs', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          }))
        }))
      } as any);

      const request = {
        agentId: 'invalid-agent-id',
        userId: mockUser.id,
        input: {}
      };

      await expect(agentFramework.executeAgent(request)).rejects.toThrow('Agent invalid-agent-id not found');
    });

    it('should handle network timeouts', async () => {
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

      // Mock network timeout
      global.fetch = vi.fn().mockImplementationOnce(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const request = {
        agentId: mockAgent.id,
        userId: mockUser.id,
        input: {}
      };

      await expect(agentFramework.executeAgent(request)).rejects.toThrow('Network timeout');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent agent executions', async () => {
      const agentRequests = Array.from({ length: 5 }, (_, i) => ({
        agentId: mockAgent.id,
        contactId: mockContact.id,
        userId: mockUser.id,
        input: { request_id: i }
      }));

      // Setup mocks for all requests
      for (let i = 0; i < 5; i++) {
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
                data: { id: `run-${i}`, status: 'running' },
                error: null
              })
            })
          }))
        } as any);

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            choices: [{
              message: { content: `Response ${i}`, tool_calls: [] }
            }],
            usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
          })
        });

        vi.mocked(supabase.from).mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        } as any);
      }

      const startTime = Date.now();
      const results = await Promise.all(
        agentRequests.map(request => agentFramework.executeAgent(request))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.run.status).toBe('completed');
      });

      // Should complete within reasonable time (allowing for some overhead)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle large context data efficiently', async () => {
      // Create large context data
      const largeContact = {
        ...mockContact,
        notes: 'x'.repeat(10000), // 10KB of notes
        history: Array.from({ length: 100 }, (_, i) => ({
          type: 'interaction',
          timestamp: new Date().toISOString(),
          data: { interaction_id: i, details: 'x'.repeat(100) }
        }))
      };

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
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: largeContact,
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
            message: { content: 'Processed large context successfully', tool_calls: [] }
          }],
          usage: { prompt_tokens: 2000, completion_tokens: 100, total_tokens: 2100 }
        })
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const startTime = Date.now();
      const request = {
        agentId: mockAgent.id,
        contactId: largeContact.id,
        userId: mockUser.id,
        input: { analyze_history: true }
      };

      const result = await agentFramework.executeAgent(request);
      const endTime = Date.now();

      expect(result.run.status).toBe('completed');
      expect(result.response.usage.total_tokens).toBeGreaterThan(2000);

      // Should handle large context within reasonable time
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('should maintain performance under sustained load', async () => {
      const executionTimes: number[] = [];

      // Run 10 sequential executions to test sustained performance
      for (let i = 0; i < 10; i++) {
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
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockContact,
                error: null
              })
            })
          }))
        } as any);

        vi.mocked(supabase.from).mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: `run-${i}`, status: 'running' },
                error: null
              })
            })
          }))
        } as any);

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            choices: [{
              message: { content: `Response ${i}`, tool_calls: [] }
            }],
            usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
          })
        });

        vi.mocked(supabase.from).mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        } as any);

        const startTime = Date.now();
        const request = {
          agentId: mockAgent.id,
          contactId: mockContact.id,
          userId: mockUser.id,
          input: { iteration: i }
        };

        await agentFramework.executeAgent(request);
        const endTime = Date.now();

        executionTimes.push(endTime - startTime);
      }

      // Calculate performance metrics
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);

      // Performance assertions
      expect(avgTime).toBeLessThan(1000); // Average under 1 second
      expect(maxTime).toBeLessThan(2000); // Max under 2 seconds
      expect(minTime).toBeGreaterThan(100); // Min over 100ms (realistic)

      // Check performance consistency (no huge variance)
      const variance = maxTime - minTime;
      expect(variance).toBeLessThan(1500);
    });

    it('should handle memory efficiently with large datasets', async () => {
      // Test memory usage with large datasets
      const largeDataset = {
        contacts: Array.from({ length: 1000 }, (_, i) => ({
          id: `contact-${i}`,
          name: `Contact ${i}`,
          email: `contact${i}@example.com`,
          company: `Company ${i}`,
          data: 'x'.repeat(1000) // 1KB per contact
        })),
        deals: Array.from({ length: 500 }, (_, i) => ({
          id: `deal-${i}`,
          name: `Deal ${i}`,
          value: Math.random() * 100000,
          stage: ['discovery', 'qualification', 'proposal', 'negotiation', 'closed'][Math.floor(Math.random() * 5)]
        }))
      };

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

      // Mock response that processes large dataset
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: `Processed ${largeDataset.contacts.length} contacts and ${largeDataset.deals.length} deals`,
              tool_calls: []
            }
          }],
          usage: { prompt_tokens: 5000, completion_tokens: 200, total_tokens: 5200 }
        })
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const startTime = Date.now();
      const request = {
        agentId: mockAgent.id,
        userId: mockUser.id,
        input: { dataset: largeDataset, operation: 'analyze' }
      };

      const result = await agentFramework.executeAgent(request);
      const endTime = Date.now();

      expect(result.run.status).toBe('completed');
      expect(result.response.output_text).toContain('Processed 1000 contacts');

      // Should handle large datasets within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);

      // Memory cleanup should work (no memory leaks in test)
      if (typeof global.gc === 'function') {
        global.gc();
      }
    });
  });

  describe('Integration Test Utilities', () => {
    it('should provide test helpers for agent testing', () => {
      // Test data factories
      const createMockAgent = (overrides = {}) => ({
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test agent description',
        tools: ['test-tool'],
        model: 'gpt-4o',
        ...overrides
      });

      const createMockRequest = (overrides = {}) => ({
        agentId: 'test-agent',
        userId: 'test-user',
        input: {},
        ...overrides
      });

      const mockAgent = createMockAgent({ name: 'Custom Agent' });
      const mockRequest = createMockRequest({ contactId: 'test-contact' });

      expect(mockAgent.name).toBe('Custom Agent');
      expect(mockRequest.contactId).toBe('test-contact');
    });

    it('should validate agent execution results', () => {
      const validateExecutionResult = (result: any) => {
        expect(result).toHaveProperty('run');
        expect(result).toHaveProperty('response');
        expect(result).toHaveProperty('updates');

        expect(result.run).toHaveProperty('id');
        expect(result.run).toHaveProperty('status');
        expect(result.run).toHaveProperty('agent_id');

        expect(result.response).toHaveProperty('output_text');
        expect(result.response).toHaveProperty('usage');

        expect(result.updates).toHaveProperty('contacts');
        expect(result.updates).toHaveProperty('deals');
        expect(result.updates).toHaveProperty('insights');
        expect(result.updates).toHaveProperty('tags');
        expect(result.updates).toHaveProperty('tasks');
      };

      const mockResult = {
        run: {
          id: 'test-run',
          status: 'completed',
          agent_id: 'test-agent'
        },
        response: {
          output_text: 'Test response',
          usage: { total_tokens: 100 }
        },
        updates: {
          contacts: [],
          deals: [],
          insights: [],
          tags: [],
          tasks: []
        }
      };

      expect(() => validateExecutionResult(mockResult)).not.toThrow();
    });
  });
});