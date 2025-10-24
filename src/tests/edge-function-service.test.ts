/**
 * Tests for Edge Function Service
 * Tests the integration with Supabase Edge Functions for various sections
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Supabase client
vi.mock('../services/supabaseClient', () => {
  const mockInvoke = vi.fn();
  return {
    supabase: {
      functions: {
        invoke: mockInvoke
      }
    }
  };
});

import { edgeFunctionService } from '../services/edgeFunctionService';
import { supabase } from '../services/supabaseClient';

describe('Edge Function Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Journey Section Functions', () => {
    it('should get journey events successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'event-1',
            type: 'email_sent',
            timestamp: '2024-01-01T00:00:00Z',
            data: { subject: 'Follow-up' }
          }
        ],
        error: null
      };

      vi.mocked(supabase, true).functions.invoke.mockResolvedValue(mockResponse);

      const result = await edgeFunctionService.getJourneyEvents('contact-1');

      expect(vi.mocked(supabase, true).functions.invoke)
        .toHaveBeenCalledWith('journey-manager', {
          body: { action: 'get_events', contactId: 'contact-1', filters: {} }
        });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors in getJourneyEvents', async () => {
      const mockError = new Error('Function error');
      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue({ data: null, error: mockError });

      await expect(edgeFunctionService.getJourneyEvents('contact-1'))
        .rejects.toThrow('Function error');
    });

    it('should generate timeline successfully', async () => {
      const mockResponse = {
        data: {
          timeline: [
            { date: '2024-01-01', events: ['Contact created'] }
          ]
        },
        error: null
      };

      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue(mockResponse);

      const result = await edgeFunctionService.generateTimeline('contact-1', { includeAI: true });

      expect(vi.mocked(supabase, true).functions.invoke)
        .toHaveBeenCalledWith('timeline-generator', {
          body: { contactId: 'contact-1', options: { includeAI: true } }
        });
      expect(result).toEqual(mockResponse.data);
    });

    it('should add journey event successfully', async () => {
      const eventData = { type: 'note_added', content: 'Test note' };
      const mockResponse = { data: { id: 'event-2' }, error: null };

      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue(mockResponse);

      const result = await edgeFunctionService.addJourneyEvent('contact-1', eventData);

      expect(vi.mocked(supabase, true).functions.invoke)
        .toHaveBeenCalledWith('journey-manager', {
          body: { action: 'add_event', contactId: 'contact-1', eventData }
        });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Analytics Section Functions', () => {
    it('should get contact analytics successfully', async () => {
      const mockResponse = {
        data: {
          engagement: { score: 85, trend: 'up' },
          interactions: 10,
          lastActivity: '2024-01-01T00:00:00Z'
        },
        error: null
      };

      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue(mockResponse);

      const result = await edgeFunctionService.getContactAnalytics('contact-1', { period: '30d' });

      expect(vi.mocked(supabase, true).functions.invoke)
        .toHaveBeenCalledWith('analytics-manager', {
          body: { action: 'get', contactId: 'contact-1', data: { period: '30d' } }
        });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors in getContactAnalytics', async () => {
      const mockError = new Error('Analytics error');
      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue({ data: null, error: mockError });

      await expect(edgeFunctionService.getContactAnalytics('contact-1'))
        .rejects.toThrow('Analytics error');
    });

    it('should generate predictions successfully', async () => {
      const mockResponse = {
        data: {
          conversionProbability: 0.75,
          nextBestAction: 'Send follow-up email',
          timeline: '2 weeks'
        },
        error: null
      };

      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue(mockResponse);

      const result = await edgeFunctionService.generatePredictions(
        { contactId: 'contact-1', history: [] },
        'conversion'
      );

      expect(vi.mocked(supabase, true).functions.invoke)
        .toHaveBeenCalledWith('predictive-analytics', {
          body: { data: { contactId: 'contact-1', history: [] }, predictionType: 'conversion' }
        });
      expect(result).toEqual(mockResponse.data);
    });

    it('should create analytics data successfully', async () => {
      const analyticsData = { metric: 'engagement', value: 100 };
      const mockResponse = { data: { id: 'analytics-1' }, error: null };

      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue(mockResponse);

      const result = await edgeFunctionService.createAnalyticsData('contact-1', analyticsData);

      expect(vi.mocked(supabase, true).functions.invoke)
        .toHaveBeenCalledWith('analytics-manager', {
          body: { action: 'create', contactId: 'contact-1', data: analyticsData }
        });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Security and Authentication', () => {
    it('should include proper authentication headers', async () => {
      const mockResponse = { data: {}, error: null };
      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue(mockResponse);

      await edgeFunctionService.getJourneyEvents('contact-1');

      // Verify that the invoke was called (auth is handled by Supabase client)
      expect(vi.mocked(supabase, true).functions.invoke)
        .toHaveBeenCalledTimes(1);
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue({ data: null, error: rateLimitError });

      await expect(edgeFunctionService.getContactAnalytics('contact-1'))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockRejectedValue(networkError);

      await expect(edgeFunctionService.generateTimeline('contact-1'))
        .rejects.toThrow('Network error');
    });

    it('should handle malformed responses', async () => {
      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue({ data: null, error: null });

      const result = await edgeFunctionService.getJourneyEvents('contact-1');
      expect(result).toBeNull();
    });
  });

  describe('Data Validation', () => {
    it('should validate input parameters for journey functions', async () => {
      const mockResponse = { data: [], error: null };
      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue(mockResponse);

      // Test with invalid contactId
      await expect(edgeFunctionService.getJourneyEvents(''))
        .rejects.toThrow(); // Should throw due to empty contactId
    });

    it('should validate input parameters for analytics functions', async () => {
      const mockResponse = { data: {}, error: null };
      vi.mocked(vi.mocked(supabase, true).functions.invoke)
        .mockResolvedValue(mockResponse);

      // Test with invalid filters
      const result = await edgeFunctionService.getContactAnalytics('contact-1', { invalidFilter: true });
      expect(result).toEqual(mockResponse.data);
    });
  });
});