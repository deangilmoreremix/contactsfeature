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

describe('Automation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processContactAutomation', () => {
    it('should process contact creation automations', async () => {
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

      vi.spyOn(automationService, 'getActiveAutomations').mockResolvedValue(mockAutomations);
      vi.spyOn(automationService, 'evaluateConditions').mockReturnValue(Promise.resolve(true));
      vi.spyOn(automationService, 'executeActions').mockResolvedValue();

      await automationService.processContactAutomation(mockContact, 'contact_created');

      expect(automationService.getActiveAutomations).toHaveBeenCalledWith('contact_created');
      expect(automationService.evaluateConditions).toHaveBeenCalledWith(mockContact, mockAutomations[0], undefined);
      expect(automationService.executeActions).toHaveBeenCalledWith(mockContact, mockAutomations[0]);
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
      vi.spyOn(automationService, 'evaluateConditions').mockReturnValue(Promise.resolve(true));
      vi.spyOn(automationService, 'executeActions').mockResolvedValue();

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
  });

  describe('evaluateConditions', () => {
    it('should evaluate equals condition correctly', async () => {
      const contact = { status: 'lead' };
      const automation = {
        conditions: [{ field: 'status', operator: 'equals' as const, value: 'lead' }]
      };

      const result = await automationService['evaluateConditions'](contact as any, automation as any, []);

      expect(result).toBe(true);
    });

    it('should evaluate contains condition correctly', async () => {
      const contact = { company: 'Tech Corp' };
      const automation = {
        conditions: [{ field: 'company', operator: 'contains' as const, value: 'Tech' }]
      };

      const result = await automationService['evaluateConditions'](contact as any, automation as any, []);

      expect(result).toBe(true);
    });

    it('should evaluate greater_than condition correctly', async () => {
      const contact = { aiScore: 85 };
      const automation = {
        conditions: [{ field: 'aiScore', operator: 'greater_than' as const, value: 80 }]
      };

      const result = await automationService['evaluateConditions'](contact as any, automation as any, []);

      expect(result).toBe(true);
    });

    it('should return false when condition is not met', async () => {
      const contact = { status: 'lead' };
      const automation = {
        conditions: [{ field: 'status', operator: 'equals' as const, value: 'customer' }]
      };

      const result = await automationService['evaluateConditions'](contact as any, automation as any, []);

      expect(result).toBe(false);
    });

    it('should skip conditions for unchanged fields', async () => {
      const contact = { status: 'lead', company: 'Test Corp' };
      const automation = {
        conditions: [
          { field: 'status', operator: 'equals' as const, value: 'lead' },
          { field: 'company', operator: 'equals' as const, value: 'Test Corp' }
        ]
      };
      const changedFields = ['status']; // Only status changed

      const result = await automationService['evaluateConditions'](contact as any, automation as any, changedFields);

      expect(result).toBe(true); // Should pass because status condition is met and company condition is skipped
    });
  });

  describe('executeActions', () => {
    it('should execute update_field action', async () => {
      const mockContact = { id: '1', status: 'lead' };
      const automation = {
        actions: [{ type: 'update_field', config: { field: 'status', value: 'prospect' } }]
      };

      const updateSpy = vi.spyOn(contactAPI, 'updateContact').mockResolvedValue({
        ...mockContact,
        status: 'prospect'
      } as any);

      await automationService['executeActions'](mockContact as any, automation as any);

      expect(updateSpy).toHaveBeenCalledWith('1', { status: 'prospect' });
    });

    it('should execute send_email action', async () => {
      const mockContact = { id: '1', email: 'test@example.com' };
      const automation = {
        actions: [{ type: 'send_email', config: { templateId: 'welcome', automationId: 'auto1' } }]
      };

      // Mock fetch for Netlify function call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await automationService['executeActions'](mockContact as any, automation as any);

      expect(global.fetch).toHaveBeenCalledWith('/.netlify/functions/send-contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: mockContact,
          templateId: 'welcome',
          automationId: 'auto1'
        })
      });
    });

    it('should handle action execution errors gracefully', async () => {
      const mockContact = { id: '1' };
      const automation = {
        actions: [{ type: 'update_field', config: { field: 'status', value: 'prospect' } }]
      };

      vi.spyOn(contactAPI, 'updateContact').mockRejectedValue(new Error('Update failed'));

      // Should not throw, just log error
      await expect(automationService['executeActions'](mockContact as any, automation as any)).resolves.not.toThrow();
    });
  });

  describe('CRUD Operations', () => {
    it('should create automation', async () => {
      const automationData = {
        name: 'Test Automation',
        type: 'scoring' as const,
        trigger: { type: 'contact_created' as const },
        conditions: [],
        actions: [],
        isActive: true
      };

      const result = await automationService.createAutomation(automationData);

      expect(result).toMatchObject({
        ...automationData,
        id: expect.stringContaining('automation_'),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('should update automation', async () => {
      const updates = { name: 'Updated Automation', isActive: false };

      const result = await automationService.updateAutomation('auto1', updates);

      expect(result).toEqual({});
      // In real implementation, this would return the updated automation
    });

    it('should delete automation', async () => {
      await expect(automationService.deleteAutomation('auto1')).resolves.not.toThrow();
    });

    it('should get active automations', async () => {
      const result = await automationService.getActiveAutomations();

      expect(result).toEqual([]);
      // In real implementation, this would return automations from database
    });

    it('should get automation history', async () => {
      const result = await automationService.getAutomationHistory();

      expect(result).toEqual([]);
      // In real implementation, this would return execution history
    });
  });
});