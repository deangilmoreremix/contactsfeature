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
        actions: [{ type: 'send_email', config: { templateId: 'welcome', automationId: 'auto1' } }],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }];

      // Mock fetch for Netlify function call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      vi.spyOn(automationService, 'getActiveAutomations').mockResolvedValue(mockAutomations);

      await automationService.processContactAutomation(mockContact, 'contact_created');

      expect(automationService.getActiveAutomations).toHaveBeenCalledWith('contact_created');
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
      // Clear any previous state that might affect this test
      vi.clearAllMocks();

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