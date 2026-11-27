/**
 * Regression tests for latent bugs found by the strict-typing pass:
 *  - task router reported OpenAI as unavailable (it looked for a browser API key that never exists)
 *  - logger dev console output never fired (boolean DEV compared with the string 'development')
 *  - provider health split ids on every underscore, so names always resolved to "Unknown ..."
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { taskRouter } from '../services/task-router.service';
import { logger } from '../services/logger.service';
import { communicationConfigService } from '../services/communicationConfigService';

afterEach(() => vi.restoreAllMocks());

describe('task router provider availability', () => {
  it('treats the server-proxied OpenAI provider as available when enabled', async () => {
    const availability = await (taskRouter as unknown as { checkProviderAvailability(): Promise<{ openai: boolean }> }).checkProviderAvailability();
    expect(availability.openai).toBe(true);
  });
});

describe('logger dev console output', () => {
  it('writes to the console in dev builds', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logger.info('latent-bug-test message');
    expect(import.meta.env.DEV).toBe(true);
    expect(spy.mock.calls.some((c) => c.some((a) => String(a).includes('latent-bug-test message')))).toBe(true);
  });
});

describe('provider health names', () => {
  it('splits provider keys on the first underscore only', () => {
    const svc = communicationConfigService as unknown as {
      providers: Map<string, unknown>;
      configs: { smtp: Map<string, { id: string; name: string }> };
    };
    svc.configs.smtp.set('my_smtp_1', { id: 'my_smtp_1', name: 'Team SMTP' });
    svc.providers.set('smtp_my_smtp_1', {
      type: 'smtp',
      config: { id: 'my_smtp_1' },
      healthCheck: { status: 'healthy', lastChecked: new Date().toISOString() },
    });
    const row = communicationConfigService.getProviderHealth().find((r) => r.id === 'my_smtp_1');
    expect(row).toBeDefined();
    expect(row!.type).toBe('smtp');
    expect(row!.name).toBe('Team SMTP');
    svc.providers.delete('smtp_my_smtp_1');
    svc.configs.smtp.delete('my_smtp_1');
  });
});

describe('accessibility fixes', () => {
  it('AgentModal boolean fields are labelled by their checkbox', async () => {
    const { render, screen } = await import('@testing-library/react');
    const React = await import('react');
    const { AgentModal } = await import('../components/ai-sales-intelligence/AgentModal');
    const props: any = {
      loading: false, onClose: () => undefined, onExecute: () => undefined,
      agent: { id: 'a', name: 'Agent A', input_schema: { properties: { includeNotes: { type: 'boolean', description: 'Include notes' } }, required: [] } },
    };
    render(React.createElement(AgentModal, props));
    expect(screen.getByLabelText('Include notes')).toHaveAttribute('type', 'checkbox');
  });
});

describe('useSmartAI enrichment state', () => {
  it('clears `enriching` after a successful enrichment (it used to stay true forever)', async () => {
    vi.resetModules();
    vi.doMock('../services/enhanced-ai-integration.service', () => ({
      enhancedAI: { enrichContact: vi.fn().mockResolvedValue({ ok: true }) },
    }));
    const { renderHook, act } = await import('@testing-library/react');
    const { useSmartAI } = await import('../hooks/useSmartAI');
    const { result } = renderHook(() => useSmartAI());
    await act(async () => { await result.current.smartEnrichContact('c1', { id: 'c1' } as any); });
    expect(result.current.enriching).toBe(false);
    expect(result.current.getResult('enrich_c1')).toEqual({ ok: true });
    vi.doUnmock('../services/enhanced-ai-integration.service');
  });
});
