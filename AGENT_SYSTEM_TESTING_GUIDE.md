# SmartCRM Agent System - Testing Implementation Guide

## Overview

This guide provides comprehensive strategies for implementing the missing test categories identified in the code review:

- ❌ **End-to-end agent execution tests**
- ❌ **Supabase integration tests**
- ❌ **Error scenario coverage**
- ❌ **Performance/load testing**

## Implementation Strategy

### 1. Test Environment Setup

```bash
# Create test database
createdb smartcrm_test

# Set up test environment variables
cp .env.example .env.test
# Edit .env.test with test database credentials

# Run migrations on test database
npm run db:migrate:test

# Seed test data
npm run db:seed:test
```

### 2. Test Structure

```
src/tests/
├── unit/                          # Unit tests (existing)
├── integration/                   # Integration tests (new)
│   ├── agent-execution.test.ts    # End-to-end agent tests
│   ├── supabase-integration.test.ts # Database integration
│   ├── error-scenarios.test.ts    # Error handling
│   └── performance.test.ts        # Load testing
├── e2e/                          # End-to-end UI tests
└── utils/                        # Test utilities
    ├── test-helpers.ts
    ├── mock-data.ts
    └── performance-monitor.ts
```

## 1. End-to-End Agent Execution Tests

### Test Scenarios

#### Complete Agent Workflow Test
```typescript
describe('AI SDR Agent E2E', () => {
  it('should execute complete outreach workflow', async () => {
    // 1. Setup test data
    const { contact, deal } = await setupTestContactAndDeal();

    // 2. Execute agent
    const result = await agentFramework.executeAgent({
      agentId: 'ai-sdr-agent',
      contactId: contact.id,
      userId: testUser.id,
      input: { campaign_type: 'introduction' }
    });

    // 3. Verify execution
    expect(result.run.status).toBe('completed');
    expect(result.response.output_text).toContain('outreach sequence');

    // 4. Verify tool calls
    expect(result.response.tool_calls).toContainEqual(
      expect.objectContaining({ name: 'email-composer' })
    );

    // 5. Verify database updates
    const updatedContact = await getContact(contact.id);
    expect(updatedContact.last_agent_run).toBe(result.run.id);
  });
});
```

#### Image Generation Workflow Test
```typescript
describe('AI AE Agent with Images', () => {
  it('should generate demo visuals', async () => {
    // Setup
    const { deal } = await setupTestDeal();

    // Execute with image generation
    const result = await agentFramework.executeAgent({
      agentId: 'ai-ae-agent',
      dealId: deal.id,
      userId: testUser.id,
      input: { demo_type: 'product-overview', generate_images: true }
    });

    // Verify Gemini tool was called
    expect(result.response.tool_calls).toContainEqual(
      expect.objectContaining({ name: 'generate-demo-visuals' })
    );

    // Verify images were generated and stored
    expect(result.response.images).toBeDefined();
    expect(result.response.images.length).toBeGreaterThan(0);

    // Verify Supabase storage
    for (const image of result.response.images) {
      const { exists } = await checkSupabaseFile(image.url);
      expect(exists).toBe(true);
    }
  });
});
```

#### Multi-Step Tool Chaining Test
```typescript
describe('Complex Agent Workflows', () => {
  it('should handle sequential tool execution', async () => {
    const result = await agentFramework.executeAgent({
      agentId: 'complex-agent',
      contactId: contact.id,
      userId: testUser.id,
      input: { operation: 'full-analysis' }
    });

    // Verify tool execution order
    const toolCalls = result.response.tool_calls;
    const toolOrder = toolCalls.map(tc => tc.name);

    expect(toolOrder).toEqual([
      'ai-enrichment',      // First gather data
      'deal-health-analysis', // Then analyze
      'email-composer',     // Finally communicate
      'generate-demo-visuals' // Add visuals
    ]);

    // Verify each tool result was used
    expect(result.response.output_text).toContain('enrichment data');
    expect(result.response.output_text).toContain('health analysis');
    expect(result.response.output_text).toContain('email draft');
  });
});
```

### Implementation Steps

1. **Create Test Database Schema**
```sql
-- Test-specific tables
CREATE TABLE test_contacts (id UUID PRIMARY KEY, ...);
CREATE TABLE test_deals (id UUID PRIMARY KEY, ...);
CREATE TABLE test_agent_runs (id UUID PRIMARY KEY, ...);

-- Seed with test data
INSERT INTO agent_metadata (id, name, ...) VALUES
('ai-sdr-agent', 'AI SDR Agent', ...);
```

2. **Mock External APIs**
```typescript
// Mock OpenAI API
vi.mock('../services/agentFramework', () => ({
  callOpenAIResponses: vi.fn().mockResolvedValue({
    choices: [{ message: { content: 'Mock response', tool_calls: [] } }],
    usage: { total_tokens: 100 }
  })
}));

// Mock Netlify functions
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.includes('email-composer')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ subject: 'Test', body: 'Content' })
    });
  }
  // ... other mocks
});
```

3. **Test Data Factories**
```typescript
export const createTestContact = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  company: faker.company.name(),
  ...overrides
});

export const createTestDeal = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.commerce.productName(),
  value: faker.number.int({ min: 10000, max: 100000 }),
  stage: 'discovery',
  ...overrides
});
```

## 2. Supabase Integration Tests

### Database CRUD Operations
```typescript
describe('Agent Metadata CRUD', () => {
  it('should create, read, update, delete agent configs', async () => {
    // Create
    const agentData = createTestAgent();
    const created = await agentService.saveAgentMetadata(agentData);
    expect(created.id).toBeDefined();

    // Read
    const retrieved = await agentService.loadAgentMetadata(created.id);
    expect(retrieved.name).toBe(agentData.name);

    // Update
    const updated = await agentService.updateAgentMetadata(created.id, {
      description: 'Updated description'
    });
    expect(updated.description).toBe('Updated description');

    // Delete
    const deleted = await agentService.deleteAgentMetadata(created.id);
    expect(deleted).toBe(true);

    // Verify deletion
    const notFound = await agentService.loadAgentMetadata(created.id);
    expect(notFound).toBeNull();
  });
});
```

### Agent Run Lifecycle
```typescript
describe('Agent Run Management', () => {
  it('should track complete agent execution lifecycle', async () => {
    // Start run
    const runData = {
      agent_id: 'test-agent',
      user_id: testUser.id,
      status: 'running' as const,
      input_data: { test: 'input' }
    };

    const startedRun = await agentService.saveAgentRun(runData);
    expect(startedRun.status).toBe('running');

    // Update with results
    const updated = await agentService.updateAgentRun(startedRun.id, {
      status: 'completed',
      output_data: { result: 'success' },
      tool_calls: [{ name: 'test-tool' }],
      execution_time_ms: 1500,
      tokens_used: { total_tokens: 100 }
    });

    expect(updated.status).toBe('completed');
    expect(updated.execution_time_ms).toBe(1500);

    // Verify in history
    const history = await agentService.loadAgentRuns('test-agent');
    expect(history[0].id).toBe(startedRun.id);
  });
});
```

### Context Gathering Tests
```typescript
describe('Context Data Aggregation', () => {
  it('should gather comprehensive context for agent execution', async () => {
    // Setup related data
    const contact = await createTestContact();
    const deal = await createTestDeal({ contact_id: contact.id });
    await createTestAgentRun({ contact_id: contact.id });

    // Gather context
    const context = await agentService.gatherContext(testUser.id, contact.id, deal.id);

    // Verify all data is present
    expect(context.contact.id).toBe(contact.id);
    expect(context.deal.id).toBe(deal.id);
    expect(context.prior_runs.length).toBeGreaterThan(0);
    expect(context.journey_history).toBeDefined();
  });
});
```

### Connection Resilience
```typescript
describe('Database Connection Handling', () => {
  it('should handle connection failures gracefully', async () => {
    // Mock connection failure
    vi.mocked(supabase.from).mockImplementationOnce(() => {
      throw new Error('Connection failed');
    });

    // Should not crash
    await expect(agentService.loadAllAgents()).rejects.toThrow('Connection failed');

    // Should recover on retry
    vi.clearAllMocks();
    const agents = await agentService.loadAllAgents();
    expect(Array.isArray(agents)).toBe(true);
  });

  it('should handle transaction rollbacks', async () => {
    // Test atomic operations
    const contactId = await createTestContact();

    // Start transaction that will fail
    try {
      await supabase.rpc('test_transaction_with_rollback', {
        contact_id: contactId,
        invalid_data: 'should fail'
      });
      fail('Should have thrown');
    } catch (error) {
      // Verify no partial data was committed
      const contact = await getContact(contactId);
      expect(contact.status).not.toBe('invalid_status');
    }
  });
});
```

## 3. Error Scenario Coverage

### API Failure Handling
```typescript
describe('External API Error Handling', () => {
  it('should handle OpenAI API rate limits', async () => {
    // Mock rate limit response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } })
    });

    const request = createTestAgentRequest();
    await expect(agentFramework.executeAgent(request)).rejects.toThrow('Rate limit exceeded');

    // Verify retry logic if implemented
    // expect(fetch).toHaveBeenCalledTimes(3); // With retry
  });

  it('should handle OpenAI API authentication failures', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
    });

    await expect(agentFramework.executeAgent(createTestAgentRequest()))
      .rejects.toThrow('Invalid API key');
  });

  it('should handle malformed API responses', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invalid: 'response' }) // Missing required fields
    });

    await expect(agentFramework.executeAgent(createTestAgentRequest()))
      .rejects.toThrow('Invalid API response');
  });
});
```

### Tool Execution Failures
```typescript
describe('Tool Execution Error Handling', () => {
  it('should continue execution when individual tools fail', async () => {
    // Mock tool failure
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 }) // First tool fails
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }); // Second succeeds

    const result = await agentFramework.executeAgent(createTestAgentRequest());

    // Should complete despite first tool failure
    expect(result.run.status).toBe('completed');
    expect(result.response.tool_calls.some(tc => tc.error)).toBe(true);
  });

  it('should handle tool timeouts', async () => {
    // Mock slow tool that times out
    global.fetch = vi.fn().mockImplementationOnce(
      () => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 31000) // Over 30s limit
      )
    );

    const result = await agentFramework.executeAgent(createTestAgentRequest());

    expect(result.response.tool_calls[0].error).toContain('Timeout');
    expect(result.run.status).toBe('completed'); // Agent continues
  });
});
```

### Authentication & Authorization
```typescript
describe('Authentication Error Handling', () => {
  it('should handle expired tokens', async () => {
    // Mock expired session
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'JWT expired' }
    });

    await expect(agentFramework.executeAgent(createTestAgentRequest()))
      .rejects.toThrow('Authentication required');
  });

  it('should handle insufficient permissions', async () => {
    // Mock user without agent execution permissions
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { ...testUser, role: 'read-only' } },
      error: null
    });

    await expect(agentFramework.executeAgent(createTestAgentRequest()))
      .rejects.toThrow('Insufficient permissions');
  });
});
```

### Configuration Errors
```typescript
describe('Configuration Error Handling', () => {
  it('should handle invalid agent configurations', async () => {
    // Mock invalid agent config
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { invalid: 'config' },
            error: null
          })
        }))
      }))
    });

    await expect(agentFramework.executeAgent(createTestAgentRequest()))
      .rejects.toThrow('Invalid agent configuration');
  });

  it('should handle missing required tools', async () => {
    const agentWithoutTools = createTestAgent({ tools: [] });

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: agentWithoutTools,
            error: null
          })
        }))
      }))
    });

    await expect(agentFramework.executeAgent(createTestAgentRequest()))
      .rejects.toThrow('No tools configured');
  });
});
```

## 4. Performance and Load Testing

### Concurrent Execution Tests
```typescript
describe('Concurrent Agent Execution', () => {
  it('should handle multiple simultaneous agent executions', async () => {
    const startTime = Date.now();

    // Execute 10 agents concurrently
    const promises = Array.from({ length: 10 }, (_, i) =>
      agentFramework.executeAgent({
        ...createTestAgentRequest(),
        input: { request_id: i }
      })
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();

    // All should complete successfully
    results.forEach(result => {
      expect(result.run.status).toBe('completed');
    });

    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max

    // Verify isolation (no cross-contamination)
    const uniqueIds = new Set(results.map(r => r.run.id));
    expect(uniqueIds.size).toBe(10);
  });

  it('should maintain performance under sustained load', async () => {
    const executionTimes: number[] = [];

    // Run 50 executions sequentially
    for (let i = 0; i < 50; i++) {
      const start = Date.now();
      await agentFramework.executeAgent(createTestAgentRequest());
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
```

### Large Dataset Performance
```typescript
describe('Large Dataset Performance', () => {
  it('should handle large contact datasets efficiently', async () => {
    // Create 1000 test contacts
    const contacts = Array.from({ length: 1000 }, () =>
      createTestContact({
        notes: faker.lorem.paragraphs(5) // Large text content
      })
    );

    // Insert into test database
    await insertBulkContacts(contacts);

    const startTime = Date.now();

    // Execute agent that processes all contacts
    const result = await agentFramework.executeAgent({
      agentId: 'bulk-analysis-agent',
      userId: testUser.id,
      input: { operation: 'analyze_all_contacts' }
    });

    const endTime = Date.now();

    expect(result.run.status).toBe('completed');
    expect(endTime - startTime).toBeLessThan(30000); // Under 30 seconds

    // Verify memory cleanup
    if (global.gc) {
      global.gc();
    }
    // Memory usage should return to baseline
  });

  it('should optimize database queries under load', async () => {
    // Setup large dataset
    await setupLargeTestDataset(10000); // 10k records

    const queryTimes: number[] = [];

    // Execute multiple complex queries
    for (let i = 0; i: 20; i++) {
      const start = Date.now();

      // Complex query joining multiple tables
      await agentService.loadAgentRuns(
        undefined, // all agents
        undefined, // all contacts
        undefined, // all deals
        100 // large limit
      );

      const end = Date.now();
      queryTimes.push(end - start);
    }

    const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

    // Database performance targets
    expect(avgQueryTime).toBeLessThan(500); // Under 500ms per query
  });
});
```

### Memory and Resource Usage
```typescript
describe('Resource Usage Monitoring', () => {
  it('should monitor memory usage during execution', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Execute memory-intensive operation
    await agentFramework.executeAgent({
      agentId: 'memory-intensive-agent',
      userId: testUser.id,
      input: { operation: 'large_dataset_processing' }
    });

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory usage should be reasonable
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Under 50MB increase

    // Force garbage collection if available
    if (global.gc) {
      global.gc();

      const afterGCMemory = process.memoryUsage().heapUsed;
      // Memory should be reclaimed
      expect(afterGCMemory).toBeLessThan(finalMemory);
    }
  });

  it('should handle database connection pooling', async () => {
    // Monitor connection pool usage
    const connectionStats = await getDatabaseConnectionStats();

    // Execute concurrent operations
    await Promise.all(
      Array.from({ length: 20 }, () =>
        agentFramework.executeAgent(createTestAgentRequest())
      )
    );

    const finalConnectionStats = await getDatabaseConnectionStats();

    // Connection pool should handle load
    expect(finalConnectionStats.active).toBeLessThanOrEqual(finalConnectionStats.total);
    expect(finalConnectionStats.waiting).toBe(0); // No queries waiting for connections
  });
});
```

### Endurance Testing
```typescript
describe('System Endurance', () => {
  it('should maintain stability over extended periods', async () => {
    const testDuration = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    const metrics: any[] = [];

    while (Date.now() - startTime < testDuration) {
      const iterationStart = Date.now();

      try {
        await agentFramework.executeAgent(createTestAgentRequest());

        const iterationEnd = Date.now();
        metrics.push({
          duration: iterationEnd - iterationStart,
          success: true,
          memory: process.memoryUsage().heapUsed
        });
      } catch (error) {
        metrics.push({
          duration: Date.now() - iterationStart,
          success: false,
          error: error.message
        });
      }

      // Wait between executions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Analyze endurance metrics
    const successRate = metrics.filter(m => m.success).length / metrics.length;
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const memoryGrowth = metrics[metrics.length - 1].memory - metrics[0].memory;

    // Endurance targets
    expect(successRate).toBeGreaterThan(0.99); // 99% success rate
    expect(avgDuration).toBeLessThan(2000); // Average under 2 seconds
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Under 10MB growth
  });
});
```

## Test Utilities and Infrastructure

### Test Helpers
```typescript
// src/tests/utils/test-helpers.ts
export class TestDatabaseManager {
  static async setup() {
    await this.createTestDatabase();
    await this.runMigrations();
    await this.seedTestData();
  }

  static async cleanup() {
    await this.clearTestData();
    await this.dropTestDatabase();
  }

  static async createTestDatabase() {
    // Implementation
  }
}

export class MockAPIManager {
  static mockOpenAI(success = true) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: success,
      json: () => Promise.resolve(success ? {
        choices: [{ message: { content: 'Mock response' } }],
        usage: { total_tokens: 100 }
      } : { error: 'Mock error' })
    });
  }

  static mockNetlifyFunctions() {
    // Implementation
  }
}

export class PerformanceMonitor {
  static startMonitoring() {
    // Start collecting metrics
  }

  static getMetrics() {
    return {
      memoryUsage: process.memoryUsage(),
      executionTimes: [],
      errorRates: {}
    };
  }
}
```

### CI/CD Integration
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: npm run db:test:setup

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/smartcrm_test

      - name: Run performance tests
        run: npm run test:performance

      - name: Generate test report
        run: npm run test:report
```

## Implementation Checklist

### Phase 1: Basic Integration Tests
- [ ] Set up test database
- [ ] Create basic agent execution tests
- [ ] Implement Supabase CRUD tests
- [ ] Add simple error scenario tests

### Phase 2: Advanced Integration Tests
- [ ] Implement end-to-end agent workflows
- [ ] Add multi-step tool chaining tests
- [ ] Create comprehensive error coverage
- [ ] Add database transaction tests

### Phase 3: Performance and Load Testing
- [ ] Implement concurrent execution tests
- [ ] Add large dataset performance tests
- [ ] Create endurance testing suite
- [ ] Add resource monitoring

### Phase 4: CI/CD and Monitoring
- [ ] Set up automated test pipelines
- [ ] Implement performance regression detection
- [ ] Add test result reporting
- [ ] Create performance dashboards

## Success Metrics

### Test Coverage Targets
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: 90%+ coverage
- **End-to-End Tests**: 85%+ coverage
- **Error Scenarios**: 95%+ coverage

### Performance Benchmarks
- **Agent Execution**: < 2 seconds average
- **Database Queries**: < 100ms average
- **Concurrent Users**: 50+ simultaneous
- **Memory Usage**: < 100MB per execution
- **Error Rate**: < 1% under normal load

### Reliability Targets
- **Test Suite Execution**: < 10 minutes
- **Flaky Test Rate**: < 2%
- **CI/CD Pipeline**: 100% pass rate
- **Performance Regression**: < 5% degradation threshold

This comprehensive testing strategy will ensure the SmartCRM Agent System is production-ready with robust error handling, excellent performance, and comprehensive test coverage.