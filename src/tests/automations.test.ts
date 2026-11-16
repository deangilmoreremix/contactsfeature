import { describe, it, expect, vi, beforeEach } from 'vitest';
import { automationService } from '../services/automation.service';
import { contactAPI } from '../services/contact-api.service';

// Mock dependencies
vi.mock('../services/contact-api.service');
vi.mock('../services/logger.service', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Supabase + provider layer are mocked: rules/runs are DB-backed now.
const db = vi.hoisted(() => {
  const state: any = { rows: [], inserted: [], updated: null, deleted: null, error: null };
  const chain: any = {
    select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, insert: (r: any) => { state.inserted.push(r); return chain; },
    update: (r: any) => { state.updated = r; return chain; }, delete: () => { state.deleted = true; return chain; },
    maybeSingle: () => Promise.resolve({ data: state.single ?? null, error: state.error }),
    then: (res: any) => Promise.resolve({ data: state.rows, error: state.error }).then(res),
  };
  return { state, chain };
});
vi.mock('../lib/supabase', () => ({
  supabase: { from: () => db.chain, auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) } },
}));
vi.mock('../services/messagingProviderService', () => ({ messagingProviderService: { sendEmail: vi.fn().mockResolvedValue({ success: true, provider: 'resend' }) } }));
vi.mock('../services/sdrClient', () => ({ sdrAuthHeaders: vi.fn().mockResolvedValue({}) }));
import { messagingProviderService } from '../services/messagingProviderService';

describe('Automation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processContactAutomation', () => {
    it('should process contact creation automations with update_field action', async () => {
      const mockContact = {
        id: '1',
        name: 'Test Contact',
        email: 'test@example.com',
        interestLevel: 'hot' as const,
        status: 'lead' as const
      };

      // Mock getting active automations
      const mockAutomations = [{
        id: 'auto1',
        name: 'Test Automation',
        type: 'scoring' as const,
        trigger: { type: 'contact_created' as const },
        conditions: [],
        actions: [{ type: 'update_field', config: { field: 'status', value: 'prospect' } }],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }];

      const updateSpy = vi.spyOn(contactAPI, 'updateContact').mockResolvedValue({
        ...mockContact,
        status: 'prospect'
      } as any);

      vi.spyOn(automationService, 'getActiveAutomations').mockResolvedValue(mockAutomations);

      await automationService.processContactAutomation(mockContact, 'contact_created');

      expect(automationService.getActiveAutomations).toHaveBeenCalledWith('contact_created');
      expect(updateSpy).toHaveBeenCalledWith('1', { status: 'prospect' });
    });

    it('should process contact creation automations with send_email action', async () => {
      const mockContact = {
        id: '1',
        name: 'Test Contact',
        email: 'test@example.com',
        interestLevel: 'hot' as const,
        status: 'lead' as const
      };

      // Mock getting active automations
      const mockAutomations = [{
        id: 'auto1',
        name: 'Test Automation',
        type: 'scoring' as const,
        trigger: { type: 'contact_created' as const },
        conditions: [],
        actions: [{ type: 'send_email', config: { subject: 'Hi {{name}}', body: 'Hello {{name}}' } }],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }];

      vi.spyOn(automationService, 'getActiveAutomations').mockResolvedValue(mockAutomations);

      await automationService.processContactAutomation(mockContact, 'contact_created');

      expect(automationService.getActiveAutomations).toHaveBeenCalledWith('contact_created');
      expect(messagingProviderService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com', subject: 'Hi Test Contact', body_text: 'Hello Test Contact', contact_id: '1'
      }));
      // the run is recorded in automation_runs
      expect(db.state.inserted.at(-1)).toMatchObject({ rule_id: 'auto1', contact_id: '1', status: 'completed' });
    });

    it('should process contact update automations with changed fields', async () => {
      const mockContact = {
        id: '1',
        name: 'Test Contact',
        email: 'test@example.com',
        interestLevel: 'hot' as const,
        status: 'lead' as const
      };

      const changedFields = ['status'];

      vi.spyOn(automationService, 'getActiveAutomations').mockResolvedValue([]);

      await automationService.processContactAutomation(mockContact, 'contact_updated', changedFields);

      expect(automationService.getActiveAutomations).toHaveBeenCalledWith('contact_updated');
    });

    it('should handle automation processing errors gracefully', async () => {
      const mockContact = {
        id: '1',
        name: 'Test Contact',
        email: 'test@example.com'
      };

      vi.spyOn(automationService, 'getActiveAutomations').mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(automationService.processContactAutomation(mockContact, 'contact_created')).resolves.not.toThrow();
    });

    it('should skip automations when conditions are not met', async () => {
      const mockContact = {
        id: '1',
        name: 'Test Contact',
        email: 'test@example.com',
        status: 'lead' as const
      };

      // Mock getting active automations with conditions that won't be met
      const mockAutomations = [{
        id: 'auto1',
        name: 'Test Automation',
        type: 'scoring' as const,
        trigger: { type: 'contact_created' as const },
        conditions: [{ field: 'status', operator: 'equals' as const, value: 'customer' }],
        actions: [{ type: 'update_field', config: { field: 'status', value: 'prospect' } }],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }];

      const updateSpy = vi.spyOn(contactAPI, 'updateContact').mockResolvedValue({
        ...mockContact,
        status: 'prospect'
      } as any);

      vi.spyOn(automationService, 'getActiveAutomations').mockResolvedValue(mockAutomations);

      await automationService.processContactAutomation(mockContact, 'contact_created');

      expect(automationService.getActiveAutomations).toHaveBeenCalledWith('contact_created');
      expect(updateSpy).not.toHaveBeenCalled(); // Should not execute action because condition is not met
    });
  });


  describe('CRUD Operations (Supabase backed)', () => {
    const row = { id: 'r1', name: 'Test Automation', type: 'scoring', trigger: { type: 'contact_created' }, conditions: [], actions: [], is_active: true, created_at: 'c', updated_at: 'u' };
    beforeEach(() => { vi.restoreAllMocks(); db.state.rows = []; db.state.single = null; db.state.error = null; db.state.inserted = []; db.state.updated = null; db.state.deleted = null; });

    it('creates an automation row for the signed-in user', async () => {
      db.state.single = row;
      const result = await automationService.createAutomation({ name: 'Test Automation', type: 'scoring', trigger: { type: 'contact_created' }, conditions: [], actions: [], isActive: true });
      expect(db.state.inserted[0]).toMatchObject({ user_id: 'u1', name: 'Test Automation', is_active: true });
      expect(result).toMatchObject({ id: 'r1', isActive: true });
    });

    it('updates mapped fields', async () => {
      db.state.single = { ...row, is_active: false };
      const result = await automationService.updateAutomation('r1', { isActive: false });
      expect(db.state.updated).toMatchObject({ is_active: false });
      expect(result.isActive).toBe(false);
    });

    it('fails loudly when the automation does not exist', async () => {
      await expect(automationService.updateAutomation('nope', { name: 'x' })).rejects.toThrow(/not found/);
    });

    it('deletes and surfaces database errors', async () => {
      await expect(automationService.deleteAutomation('r1')).resolves.not.toThrow();
      expect(db.state.deleted).toBe(true);
      db.state.error = { message: 'boom' };
      await expect(automationService.deleteAutomation('r1')).rejects.toThrow('boom');
    });

    it('returns only active rules for the requested trigger', async () => {
      db.state.rows = [row, { ...row, id: 'r2', trigger: { type: 'contact_updated' } }];
      const result = await automationService.getActiveAutomations('contact_created');
      expect(result.map((r) => r.id)).toEqual(['r1']);
    });

    it('reads execution history from automation_runs', async () => {
      db.state.rows = [{ id: 'x', rule_id: 'r1', contact_id: 'c1', trigger: 'contact_created', status: 'failed', results: {}, error: 'nope', executed_at: 't' }];
      const result = await automationService.getAutomationHistory();
      expect(result[0]).toMatchObject({ automationId: 'r1', status: 'failed', error: 'nope' });
    });
  });
});
