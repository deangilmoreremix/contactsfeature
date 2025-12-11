/**
 * Comprehensive tests for VoiceAgentPanel component
 * Tests voice message generation, UI interactions, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceAgentPanel } from '../components/VoiceAgentPanel';

// Mock dependencies
vi.mock('../services/sdrPreferencesService', () => ({
  sdrPreferencesService: {
    getPreferences: vi.fn().mockResolvedValue({}),
    updatePreferences: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../lib/supabase', () => ({
  supabase: {}
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('VoiceAgentPanel', () => {
  const mockVoiceResponse = {
    contactId: 'contact-123',
    script: 'Hi John, this is a test voice message from SmartCRM.',
    audioUrl: 'https://example.com/audio.mp3',
    debug: { processingTime: 2.5, tokens: 150 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Render', () => {
    it('should render component with proper structure', () => {
      render(<VoiceAgentPanel />);

      expect(screen.getByText('🎙 Voice Agent')).toBeInTheDocument();
      expect(screen.getByText(/Convert SDR \/ AE scripts into voice messages/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter contact UUID')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/)).toBeInTheDocument();
      expect(screen.getByText('Generate Voice Message')).toBeInTheDocument();
    });

    it('should have empty form fields initially', () => {
      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      expect(contactIdInput).toHaveValue('');
      expect(scriptTextarea).toHaveValue('');
    });
  });

  describe('Form Validation', () => {
    it('should show error when contact ID is empty', async () => {
      render(<VoiceAgentPanel />);

      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);
      fireEvent.change(scriptTextarea, { target: { value: 'Test script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Please enter a contact ID.')).toBeInTheDocument();
      });
    });

    it('should show error when script is empty', async () => {
      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Please enter the script or talking points.')).toBeInTheDocument();
      });
    });

    it('should show error when script contains only whitespace', async () => {
      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: '   \n\t   ' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Please enter the script or talking points.')).toBeInTheDocument();
      });
    });
  });

  describe('Voice Generation', () => {
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
        expect(screen.getByText('Hi John, this is a test voice message from SmartCRM.')).toBeInTheDocument();
      });
    });


    it('should handle generation errors gracefully', async () => {
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

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test voice script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Network error')).toBeInTheDocument();
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

  describe('Result Display', () => {
    beforeEach(async () => {
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
        expect(screen.getByText('Result')).toBeInTheDocument();
      });
    });

    it('should display script when provided', () => {
      expect(screen.getByText('Hi John, this is a test voice message from SmartCRM.')).toBeInTheDocument();
    });

    it('should display audio player when audioUrl is provided', () => {
      const audioElement = document.querySelector('audio');
      expect(audioElement).toHaveAttribute('src', 'https://example.com/audio.mp3');
    });
  });

  describe('Error Handling', () => {
    it('should clear previous errors on successful generation', async () => {
      // First, trigger an error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'First error'
      });

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test voice script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ First error')).toBeInTheDocument();
      });

      // Now successful call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVoiceResponse
      });

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByText('⚠️ First error')).not.toBeInTheDocument();
        expect(screen.getByText('Result')).toBeInTheDocument();
      });
    });

    it('should clear previous results on new generation', async () => {
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
        expect(screen.getByText('Result')).toBeInTheDocument();
      });

      // Start new generation
      fireEvent.change(scriptTextarea, { target: { value: 'Updated script' } });
      fireEvent.click(generateButton);

      expect(screen.queryByText('Result')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button text and disabled state', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockVoiceResponse
        }), 100))
      );

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);
      const generateButton = screen.getByText('Generate Voice Message');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test voice script' } });

      fireEvent.click(generateButton);

      expect(generateButton).toBeDisabled();
      expect(generateButton).toHaveTextContent('Generating Voice...');

      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
        expect(generateButton).toHaveTextContent('Generate Voice Message');
      });
    });
  });
});