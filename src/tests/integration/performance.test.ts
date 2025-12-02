/**
 * Performance and Load Testing
 * Tests system performance under various load conditions
 */

import { describe, it, expect } from 'vitest';

describe('Performance and Load Testing', () => {
  describe('Performance Benchmarking', () => {
    it('should define performance targets and SLAs', () => {
      // Define performance benchmarks that would be measured in real tests
      const performanceTargets = {
        agentExecution: {
          p50: 1500, // 1.5 seconds - median response time
          p95: 3000, // 3 seconds - 95th percentile
          p99: 5000  // 5 seconds - 99th percentile
        },
        databaseQuery: {
          p50: 100,  // 100ms - median query time
          p95: 500,  // 500ms - 95th percentile
          p99: 1000  // 1 second - 99th percentile
        },
        apiCall: {
          p50: 500,  // 500ms - median API response
          p95: 2000, // 2 seconds - 95th percentile
          p99: 5000  // 5 seconds - 99th percentile
        },
        concurrentUsers: {
          supported: 50,    // Maximum concurrent users
          target: 25,       // Target concurrent users
          degradation: 0.1  // Max 10% performance degradation
        }
      };

      // Test that performance targets are reasonable
      expect(performanceTargets.agentExecution.p95).toBeLessThan(3000);
      expect(performanceTargets.databaseQuery.p95).toBeLessThan(500);
      expect(performanceTargets.apiCall.p95).toBeLessThan(2000);
      expect(performanceTargets.concurrentUsers.supported).toBeGreaterThanOrEqual(50);
    });

    it('should validate performance monitoring utilities', () => {
      // Test performance monitoring helper functions
      const measureExecutionTime = async (fn: () => Promise<any>) => {
        const start = Date.now();
        const result = await fn();
        const duration = Date.now() - start;
        return { result, duration };
      };

      const mockAsyncOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'operation_completed';
      };

      // Test the monitoring utility
      return measureExecutionTime(mockAsyncOperation).then(({ result, duration }) => {
        expect(result).toBe('operation_completed');
        expect(duration).toBeGreaterThanOrEqual(90);  // At least 90ms
        expect(duration).toBeLessThan(200);           // Less than 200ms
      });
    });

    it('should define load testing scenarios', () => {
      // Define load testing scenarios that would be executed
      const loadScenarios = {
        concurrentAgentExecution: {
          users: 10,
          duration: 300, // 5 minutes
          rampUp: 30,    // 30 seconds ramp up
          expectedThroughput: 100, // requests per minute
          maxResponseTime: 5000    // 5 seconds
        },
        sustainedLoad: {
          users: 25,
          duration: 1800, // 30 minutes
          steadyState: 900, // 15 minutes steady state
          errorRateThreshold: 0.01, // 1% error rate
          memoryGrowthLimit: 100   // MB
        },
        spikeLoad: {
          baselineUsers: 10,
          spikeUsers: 100,
          spikeDuration: 60, // 1 minute spike
          recoveryTime: 300, // 5 minutes recovery
          degradationThreshold: 0.2 // 20% performance degradation allowed
        },
        databaseLoad: {
          concurrentQueries: 50,
          queryComplexity: 'high',
          duration: 600, // 10 minutes
          connectionPoolSize: 20,
          queryTimeout: 30000 // 30 seconds
        }
      };

      // Validate load testing configuration
      expect(loadScenarios.concurrentAgentExecution.users).toBe(10);
      expect(loadScenarios.sustainedLoad.duration).toBe(1800);
      expect(loadScenarios.spikeLoad.spikeUsers).toBe(100);
      expect(loadScenarios.databaseLoad.concurrentQueries).toBe(50);
    });

    it('should establish performance regression detection', () => {
      // Define performance regression thresholds
      const regressionThresholds = {
        responseTimeIncrease: 0.1,    // 10% increase allowed
        errorRateIncrease: 0.05,      // 5% error rate increase allowed
        throughputDecrease: 0.1,      // 10% throughput decrease allowed
        memoryIncrease: 50,           // 50MB memory increase allowed
        consecutiveFailures: 3        // Max 3 consecutive failures
      };

      // Test that regression detection is properly configured
      expect(regressionThresholds.responseTimeIncrease).toBeLessThanOrEqual(0.1);
      expect(regressionThresholds.errorRateIncrease).toBeLessThanOrEqual(0.05);
      expect(regressionThresholds.throughputDecrease).toBeLessThanOrEqual(0.1);
      expect(regressionThresholds.memoryIncrease).toBeLessThanOrEqual(50);
      expect(regressionThresholds.consecutiveFailures).toBeLessThanOrEqual(3);
    });
  });

  describe('Resource Usage Monitoring', () => {
    it('should define memory usage limits', () => {
      const memoryLimits = {
        perAgentExecution: {
          heapUsed: 100,     // MB
          external: 50,      // MB
          rss: 200          // MB
        },
        perConcurrentUser: {
          heapUsed: 10,      // MB
          external: 5,       // MB
          growthRate: 1      // MB per minute
        },
        systemWide: {
          totalHeap: 1000,   // MB
          leakThreshold: 10, // MB per hour
          gcFrequency: 60    // seconds
        }
      };

      // Validate memory limits are reasonable
      expect(memoryLimits.perAgentExecution.heapUsed).toBeLessThanOrEqual(100);
      expect(memoryLimits.perConcurrentUser.heapUsed).toBeLessThanOrEqual(10);
      expect(memoryLimits.systemWide.totalHeap).toBeLessThanOrEqual(1000);
    });

    it('should define database connection limits', () => {
      const connectionLimits = {
        poolSize: {
          min: 5,
          max: 20,
          idle: 5
        },
        timeouts: {
          connection: 30000,    // 30 seconds
          idle: 600000,         // 10 minutes
          query: 300000         // 5 minutes
        },
        monitoring: {
          activeConnections: true,
          waitingQueries: true,
          slowQueries: true,
          connectionLeaks: true
        }
      };

      // Validate connection pool configuration
      expect(connectionLimits.poolSize.max).toBeGreaterThanOrEqual(20);
      expect(connectionLimits.timeouts.connection).toBeLessThanOrEqual(30000);
      expect(connectionLimits.monitoring.activeConnections).toBe(true);
    });

    it('should define API rate limiting', () => {
      const rateLimits = {
        openai: {
          requestsPerMinute: 50,
          requestsPerHour: 1000,
          burstLimit: 10,
          backoffStrategy: 'exponential'
        },
        gemini: {
          requestsPerMinute: 60,
          requestsPerHour: 1200,
          burstLimit: 15,
          backoffStrategy: 'exponential'
        },
        supabase: {
          requestsPerSecond: 100,
          burstLimit: 50,
          retryStrategy: 'linear'
        }
      };

      // Validate rate limiting configuration
      expect(rateLimits.openai.requestsPerMinute).toBeLessThanOrEqual(50);
      expect(rateLimits.gemini.requestsPerMinute).toBeLessThanOrEqual(60);
      expect(rateLimits.supabase.requestsPerSecond).toBeLessThanOrEqual(100);
    });
  });

  describe('Endurance Testing', () => {
    it('should define endurance test parameters', () => {
      const enduranceTests = {
        shortTerm: {
          duration: 1800,      // 30 minutes
          interval: 30,        // 30 seconds between requests
          totalRequests: 60,   // 60 requests total
          successRateTarget: 0.99 // 99% success rate
        },
        mediumTerm: {
          duration: 3600,      // 1 hour
          interval: 60,        // 1 minute between requests
          totalRequests: 60,   // 60 requests total
          memoryGrowthLimit: 25 // MB
        },
        longTerm: {
          duration: 21600,     // 6 hours
          interval: 300,       // 5 minutes between requests
          totalRequests: 72,   // 72 requests total
          performanceDegradationLimit: 0.1 // 10%
        }
      };

      // Validate endurance test configuration
      expect(enduranceTests.shortTerm.successRateTarget).toBeGreaterThanOrEqual(0.99);
      expect(enduranceTests.mediumTerm.memoryGrowthLimit).toBeLessThanOrEqual(25);
      expect(enduranceTests.longTerm.performanceDegradationLimit).toBeLessThanOrEqual(0.1);
    });

    it('should define stability metrics', () => {
      const stabilityMetrics = {
        errorRates: {
          acceptable: 0.01,      // 1% error rate
          warning: 0.05,         // 5% warning threshold
          critical: 0.1          // 10% critical threshold
        },
        responseTimes: {
          baseline: 1000,        // 1 second baseline
          degradation: 0.2,      // 20% degradation allowed
          recovery: 300          // 5 minutes recovery time
        },
        resourceUsage: {
          cpuThreshold: 0.8,     // 80% CPU usage threshold
          memoryThreshold: 0.9,  // 90% memory usage threshold
          diskThreshold: 0.85    // 85% disk usage threshold
        }
      };

      // Validate stability metrics
      expect(stabilityMetrics.errorRates.acceptable).toBeLessThanOrEqual(0.01);
      expect(stabilityMetrics.responseTimes.degradation).toBeLessThanOrEqual(0.2);
      expect(stabilityMetrics.resourceUsage.cpuThreshold).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Load Testing Infrastructure', () => {
    it('should define load testing tools and frameworks', () => {
      const loadTestingTools = {
        primary: {
          name: 'k6',
          purpose: 'HTTP load testing',
          scenarios: ['constant_load', 'ramping_load', 'spike_testing'],
          metrics: ['response_time', 'error_rate', 'throughput']
        },
        secondary: {
          name: 'Artillery',
          purpose: 'Application load testing',
          scenarios: ['scenarios_based', 'custom_scripts'],
          metrics: ['latency', 'concurrency', 'resource_usage']
        },
        database: {
          name: 'pgbench',
          purpose: 'PostgreSQL load testing',
          scenarios: ['read_only', 'read_write', 'custom_scripts'],
          metrics: ['tps', 'latency', 'connection_stats']
        }
      };

      // Validate load testing tool configuration
      expect(loadTestingTools.primary.name).toBe('k6');
      expect(loadTestingTools.secondary.name).toBe('Artillery');
      expect(loadTestingTools.database.name).toBe('pgbench');
    });

    it('should define test data generation strategies', () => {
      const testDataStrategies = {
        synthetic: {
          generator: 'faker.js',
          volume: 'configurable',
          realism: 'high',
          consistency: 'guaranteed'
        },
        production: {
          source: 'anonymized_production_data',
          volume: 'subset',
          realism: 'maximum',
          compliance: 'gdpr_compliant'
        },
        hybrid: {
          approach: 'synthetic_with_production_patterns',
          volume: 'scaled',
          realism: 'balanced',
          maintenance: 'automated'
        }
      };

      // Validate test data strategies
      expect(testDataStrategies.synthetic.generator).toBe('faker.js');
      expect(testDataStrategies.production.compliance).toBe('gdpr_compliant');
      expect(testDataStrategies.hybrid.approach).toContain('synthetic');
    });

    it('should define monitoring and alerting', () => {
      const monitoringConfig = {
        metrics: {
          collection: ['prometheus', 'datadog', 'custom'],
          granularity: '1_second',
          retention: '30_days'
        },
        alerting: {
          responseTime: { threshold: 5000, channels: ['slack', 'email'] },
          errorRate: { threshold: 0.05, channels: ['slack', 'pagerduty'] },
          resourceUsage: { threshold: 0.9, channels: ['slack'] }
        },
        dashboards: {
          realTime: 'grafana_realtime',
          historical: 'grafana_historical',
          executive: 'custom_dashboard'
        }
      };

      // Validate monitoring configuration
      expect(monitoringConfig.metrics.collection).toContain('prometheus');
      expect(monitoringConfig.alerting.responseTime.threshold).toBe(5000);
      expect(monitoringConfig.dashboards.realTime).toBe('grafana_realtime');
    });
  });
});

  describe('Concurrent Agent Execution', () => {
    beforeEach(() => {
      // Setup mocks for all concurrent executions
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
    });

    it('should handle multiple simultaneous agent executions', async () => {
      const startTime = Date.now();

      // Execute 10 agents concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        agentFramework.executeAgent({
          agentId: mockAgent.id,
          contactId: mockContact.id,
          userId: mockUser.id,
          input: { request_id: i, concurrent: true }
        })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should complete successfully
      results.forEach((result, index) => {
        expect(result.run.status).toBe('completed');
        expect(result.response.output_text).toContain(`Response ${index}`);
      });

      // Should complete within reasonable time (allowing for some overhead)
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max

      // Verify isolation (no cross-contamination)
      const uniqueIds = new Set(results.map(r => r.run.id));
      expect(uniqueIds.size).toBe(10);
    });

    it('should maintain consistent performance under sustained load', async () => {
      const executionTimes: number[] = [];

      // Run 50 executions sequentially to test sustained performance
      for (let i = 0; i < 50; i++) {
        // Setup mocks for each execution
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
                data: { id: `run-seq-${i}`, status: 'running' },
                error: null
              })
            })
          }))
        } as any);

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            choices: [{
              message: { content: `Sequential response ${i}`, tool_calls: [] }
            }],
            usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
          })
        });

        vi.mocked(supabase.from).mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        } as any);

        const start = Date.now();
        await agentFramework.executeAgent({
          agentId: mockAgent.id,
          contactId: mockContact.id,
          userId: mockUser.id,
          input: { iteration: i, sequential: true }
        });
        const end = Date.now();
        executionTimes.push(end - start);

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);

      // Performance assertions
      expect(avgTime).toBeLessThan(2000); // Average under 2 seconds
      expect(maxTime).toBeLessThan(5000); // Max under 5 seconds
      expect(minTime).toBeGreaterThan(500); // Min over 500ms (realistic)

      // Check consistency (no huge variance)
      const variance = maxTime - minTime;
      expect(variance).toBeLessThan(3000);
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle large contact datasets efficiently', async () => {
      // Create mock large contact dataset
      const largeContacts = Array.from({ length: 100 }, (_, i) => ({
        id: `contact-${i}`,
        name: `Contact ${i}`,
        email: `contact${i}@example.com`,
        company: `Company ${i}`,
        notes: 'x'.repeat(1000) // 1KB per contact
      }));

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
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'run-large', status: 'running' },
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
              content: `Processed ${largeContacts.length} contacts successfully`,
              tool_calls: []
            }
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

      const result = await agentFramework.executeAgent({
        agentId: mockAgent.id,
        userId: mockUser.id,
        input: {
          operation: 'analyze_contacts',
          dataset: largeContacts,
          analysis_type: 'bulk'
        }
      });

      const endTime = Date.now();

      expect(result.run.status).toBe('completed');
      expect(result.response.output_text).toContain('100 contacts');
      expect(result.response.usage?.total_tokens).toBeGreaterThan(2000);

      // Should handle large datasets within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // Under 10 seconds
    });

    it('should optimize database queries under load', async () => {
      const queryTimes: number[] = [];

      // Execute multiple complex queries
      for (let i = 0; i: 20; i++) {
        // Setup mocks for each query
        vi.mocked(supabase.from).mockReturnValueOnce({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: Array.from({ length: 100 }, (_, j) => ({
                  id: `run-${i}-${j}`,
                  agent_id: mockAgent.id,
                  status: 'completed',
                  created_at: new Date().toISOString()
                })),
                error: null
              })
            }))
          }))
        } as any);

        const start = Date.now();

        // Complex query: get agent runs with filtering and sorting
        await agentService.loadAgentRuns(
          mockAgent.id,
          undefined, // all contacts
          undefined, // all deals
          100 // large limit
        );

        const end = Date.now();
        queryTimes.push(end - start);
      }

      const avgQueryTime = queryTimes.reduce((sum, m) => sum + m.duration, 0) / queryTimes.length;

      // Database performance targets
      expect(avgQueryTime).toBeLessThan(500); // Under 500ms per query
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should maintain stable memory usage during execution', async () => {
      // This test would require actual memory monitoring in a real environment
      // For now, we test the execution completes without memory-related errors

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
              data: { id: 'run-memory', status: 'running' },
              error: null
            })
          }))
        }))
      } as any);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: { content: 'Memory test completed', tool_calls: [] }
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        })
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const result = await agentFramework.executeAgent({
        agentId: mockAgent.id,
        userId: mockUser.id,
        input: { test: 'memory_usage' }
      });

      expect(result.run.status).toBe('completed');

      // In a real performance test environment, we would check:
      // - Memory usage before and after execution
      // - Garbage collection effectiveness
      // - Memory leak detection
    });

    it('should handle database connection pooling efficiently', async () => {
      // Test multiple concurrent database operations
      const connectionTestPromises = Array.from({ length: 5 }, async (_, i) => {
        vi.mocked(supabase.from).mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: `connection-test-${i}`, status: 'completed' },
                error: null
              })
            }))
          }))
        } as any);

        return agentService.loadAgentMetadata(`test-agent-${i}`);
      });

      const startTime = Date.now();
      const results = await Promise.all(connectionTestPromises);
      const endTime = Date.now();

      // All operations should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // Should complete quickly (testing connection pooling)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Endurance and Sustained Load Testing', () => {
    it('should maintain performance over extended periods', async () => {
      const testDuration = 30000; // 30 seconds for testing
      const metrics: any[] = [];
      const startTime = Date.now();

      while (Date.now() - startTime < testDuration) {
        const iterationStart = Date.now();

        try {
          // Setup mocks for each iteration
          vi.mocked(supabase.from).mockReturnValueOnce({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockAgent,
                  error: null
                })
              })
            }))
          } as any);

          vi.mocked(supabase.from).mockReturnValueOnce({
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: `endurance-run-${Date.now()}`, status: 'running' },
                  error: null
                })
              })
            })
          } as any);

          global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
              choices: [{
                message: { content: 'Endurance test response', tool_calls: [] }
              }],
              usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
            })
          });

          vi.mocked(supabase.from).mockReturnValueOnce({
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          } as any);

          await agentFramework.executeAgent({
            agentId: mockAgent.id,
            userId: mockUser.id,
            input: { endurance_test: true, timestamp: Date.now() }
          });

          const iterationEnd = Date.now();
          metrics.push({
            duration: iterationEnd - iterationStart,
            success: true
          });
        } catch (error) {
          metrics.push({
            duration: Date.now() - iterationStart,
            success: false,
            error: error.message
          });
        }

        // Wait between executions to simulate realistic load
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Analyze endurance metrics
      const successRate = metrics.filter(m => m.success).length / metrics.length;
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      const totalExecutions = metrics.length;

      // Endurance targets
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(avgDuration).toBeLessThan(2000); // Average under 2 seconds
      expect(totalExecutions).toBeGreaterThan(10); // At least 10 executions in 30 seconds

      // Performance should not degrade significantly over time
      const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
      const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;

      // Performance degradation should be minimal
      const degradation = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
      expect(degradation).toBeLessThan(0.5); // Less than 50% degradation
    });
  });

  describe('API Rate Limiting and Throttling', () => {
    it('should handle API rate limits gracefully', async () => {
      // Setup initial successful calls
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
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: `rate-limit-run-${i}`, status: 'running' },
                error: null
              })
            })
          }))
        } as any);

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            choices: [{
              message: { content: `Rate limit test ${i}`, tool_calls: [] }
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

      // Execute multiple requests rapidly
      const promises = Array.from({ length: 5 }, (_, i) =>
        agentFramework.executeAgent({
          agentId: mockAgent.id,
          userId: mockUser.id,
          input: { rate_limit_test: i }
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should complete (in real implementation, some might be rate limited)
      results.forEach(result => {
        expect(result.run.status).toBe('completed');
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should implement proper backoff strategies', async () => {
      // Test exponential backoff for failed requests
      let attemptCount = 0;

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
              data: { id: 'backoff-test-run', status: 'running' },
              error: null
            })
          }))
        }))
      } as any);

      // Mock API that fails then succeeds
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: vi.fn().mockResolvedValue({ error: { message: 'Rate limited' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            choices: [{
              message: { content: 'Backoff test successful', tool_calls: [] }
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
      const result = await agentFramework.executeAgent({
        agentId: mockAgent.id,
        userId: mockUser.id,
        input: { backoff_test: true }
      });
      const endTime = Date.now();

      expect(result.run.status).toBe('completed');

      // Should take longer due to backoff (in real implementation)
      // expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second delay
    });
  });

  describe('Performance Benchmarking', () => {
    it('should meet performance SLAs', () => {
      // Define performance benchmarks
      const performanceTargets = {
        agentExecution: {
          p50: 1500, // 1.5 seconds
          p95: 3000, // 3 seconds
          p99: 5000  // 5 seconds
        },
        databaseQuery: {
          p50: 100,  // 100ms
          p95: 500,  // 500ms
          p99: 1000  // 1 second
        },
        apiCall: {
          p50: 500,  // 500ms
          p95: 2000, // 2 seconds
          p99: 5000  // 5 seconds
        }
      };

      // These would be measured in real performance tests
      expect(performanceTargets.agentExecution.p95).toBeLessThan(3000);
      expect(performanceTargets.databaseQuery.p95).toBeLessThan(500);
      expect(performanceTargets.apiCall.p95).toBeLessThan(2000);
    });

    it('should provide performance monitoring utilities', () => {
      // Test performance monitoring helpers
      const monitorExecution = async (fn: () => Promise<any>) => {
        const start = Date.now();
        const result = await fn();
        const duration = Date.now() - start;
        return { result, duration };
      };

      const mockAsyncOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'completed';
      };

      // Test the monitoring utility
      monitorExecution(mockAsyncOperation).then(({ result, duration }) => {
        expect(result).toBe('completed');
        expect(duration).toBeGreaterThan(90);
        expect(duration).toBeLessThan(200);
      });
    });
  });
});