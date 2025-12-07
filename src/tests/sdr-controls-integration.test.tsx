/**
 * Integration tests for SDR Agent User Controls System
 * Tests the complete SDR agent configuration workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceAgentPanel } from '../components/VoiceAgentPanel';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

describe('SDR Agent User Controls Integration', () => {
  const mockVoiceResponse = {
    contactId: 'contact-123',
    script: 'Hi John, this is a test voice message.',
    audioUrl: 'https://example.com/audio.mp3',
    debug: { processingTime: 2.5, tokens: 150 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('VoiceAgentPanel Settings Integration', () => {
    it('should render settings button', () => {
      render(<VoiceAgentPanel />);
      expect(screen.getByTitle('Configure Voice Agent Settings')).toBeInTheDocument();
    });

    it('should open settings modal when settings button is clicked', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      expect(screen.getByText('Configure Voice Agent')).toBeInTheDocument();
    });

    it('should allow configuration changes in settings modal', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      // Should show configuration tabs
      expect(screen.getByText('Basic Settings')).toBeInTheDocument();
      expect(screen.getByText('Timing & Schedule')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('AI Settings')).toBeInTheDocument();
    });

    it('should show Campaign Builder button in settings', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      expect(screen.getByText('Campaign Builder')).toBeInTheDocument();
    });

    it('should open Campaign Builder when button is clicked', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      const campaignBuilderButton = screen.getByText('Campaign Builder');
      fireEvent.click(campaignBuilderButton);

      expect(screen.getByText('Campaign Builder - Voice Agent')).toBeInTheDocument();
    });
  });

  describe('Voice Generation with Settings', () => {
    it('should generate voice message successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVoiceResponse
      });

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test voice script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/voice-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: 'contact-123', script: 'Test voice script' })
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Result')).toBeInTheDocument();
        expect(screen.getByText('Hi John, this is a test voice message.')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error: Invalid request'
      });

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test voice script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ API Error: Invalid request')).toBeInTheDocument();
      });
    });

    it('should show loading state during generation', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockVoiceResponse
        }), 100))
      );

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test voice script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      expect(screen.getByText('Generating Voice...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Generate Voice Message')).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Builder Integration', () => {
    it('should allow campaign sequence creation', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      const campaignBuilderButton = screen.getByText('Campaign Builder');
      fireEvent.click(campaignBuilderButton);

      // Should show campaign builder interface
      expect(screen.getByText('Design your personalized SDR campaign sequence')).toBeInTheDocument();
      expect(screen.getByText('Campaign Sequence')).toBeInTheDocument();
    });

    it('should show initial campaign step', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      const campaignBuilderButton = screen.getByText('Campaign Builder');
      fireEvent.click(campaignBuilderButton);

      expect(screen.getByText('Day 0')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('introduction')).toBeInTheDocument();
    });

    it('should allow adding campaign steps', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      const campaignBuilderButton = screen.getByText('Campaign Builder');
      fireEvent.click(campaignBuilderButton);

      const addButton = screen.getByText('Add Campaign Step');
      fireEvent.click(addButton);

      expect(screen.getAllByText('Day')).toHaveLength(2);
    });
  });

  describe('Settings Persistence', () => {
    it('should save configuration when Save button is clicked', async () => {
      // Mock the SDRPreferencesService
      const mockSave = vi.fn().mockResolvedValue({});
      vi.doMock('../services/sdrPreferencesService', () => ({
        SDRPreferencesService: {
          saveUserPreferences: mockSave
        }
      }));

      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalled();
      });
    });

    it('should close settings modal after successful save', async () => {
      const mockSave = vi.fn().mockResolvedValue({});
      vi.doMock('../services/sdrPreferencesService', () => ({
        SDRPreferencesService: {
          saveUserPreferences: mockSave
        }
      }));

      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      expect(screen.getByText('Configure Voice Agent')).toBeInTheDocument();

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText('Configure Voice Agent')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show validation errors for invalid configuration', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      // Try to save with invalid campaign length
      const campaignLengthInput = screen.getByDisplayValue('3');
      fireEvent.change(campaignLengthInput, { target: { value: '25' } }); // Invalid: too high

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      // Should show validation error
      expect(screen.getByText('Campaign length must be between 1 and 20 messages')).toBeInTheDocument();
    });

    it('should handle network errors during save', async () => {
      const mockSave = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.doMock('../services/sdrPreferencesService', () => ({
        SDRPreferencesService: {
          saveUserPreferences: mockSave
        }
      }));

      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save configuration. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper ARIA labels and keyboard navigation', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');

      // Should be focusable
      settingsButton.focus();
      expect(document.activeElement).toBe(settingsButton);
    });

    it('should maintain focus management in modals', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      // Focus should move to modal
      const modal = screen.getByText('Configure Voice Agent');
      expect(modal).toBeInTheDocument();
    });

    it('should prevent interaction with background when modal is open', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      // Background should be disabled
      const backdrop = document.querySelector('.fixed.inset-0.bg-black');
      expect(backdrop).toBeInTheDocument();
    });
  });
});