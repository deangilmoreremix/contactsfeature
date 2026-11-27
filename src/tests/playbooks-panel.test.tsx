/**
 * PlaybooksPanel: playbooks are streamed from the playbooks-ai function through useAIStream (streamSse);
 * the panel renders the final result (summary + script / objection / follow-up lists) or the error.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlaybooksPanel } from '../components/PlaybooksPanel';
import { newOutcome } from '../lib/streaming/streamClient';

vi.mock('../services/sdrPreferencesService', () => ({
  SDRPreferencesService: class { getPreferences = vi.fn().mockResolvedValue({}); updatePreferences = vi.fn().mockResolvedValue({}); },
  sdrPreferencesService: { getPreferences: vi.fn().mockResolvedValue({}), updatePreferences: vi.fn().mockResolvedValue({}) }
}));

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } }
}));

vi.mock('../services/sdrClient', () => ({
  sdrAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer test' })
}));

// The SSE transport is mocked; the real useAIStream hook and panel run on top of it.
const streamSse = vi.hoisted(() => vi.fn());
vi.mock('../lib/streaming/streamClient', async (orig) => ({
  ...(await orig<typeof import('../lib/streaming/streamClient')>()),
  streamSse
}));

const URL = '/.netlify/functions/playbooks-ai';
const okOutcome = (result: unknown) => ({ ...newOutcome(), result });

describe('PlaybooksPanel', () => {
  const mockPlaybooksResponse = {
    dealId: 'deal-123',
    contactId: 'contact-456',
    top_scripts: ['Script 1: Introduction', 'Script 2: Value proposition'],
    objections: ['Price objection: Handle by focusing on ROI', 'Timeline objection: Offer flexible terms'],
    followups: ['Follow up in 3 days', 'Send case study', 'Schedule demo call'],
    summary: 'This contact shows strong interest but has budget concerns. Focus on ROI and long-term value.',
    raw: { additionalData: 'test' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    streamSse.mockReset().mockResolvedValue(okOutcome(mockPlaybooksResponse));
  });

  describe('Initial Render', () => {
    it('should render component with proper structure', () => {
      render(<PlaybooksPanel />);

      expect(screen.getByText('📘 Playbooks AI')).toBeInTheDocument();
      expect(screen.getByText(/Generate AI sales playbooks/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter contact UUID')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter deal UUID')).toBeInTheDocument();
      expect(screen.getByText('Generate Playbooks')).toBeInTheDocument();
    });

    it('should have empty form fields initially', () => {
      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const dealIdInput = screen.getByPlaceholderText('Enter deal UUID');

      expect(contactIdInput).toHaveValue('');
      expect(dealIdInput).toHaveValue('');
    });

    it('should show placeholder text when no data', () => {
      render(<PlaybooksPanel />);

      expect(screen.getByText('Run Playbooks AI to see scripts, objections, and follow-up patterns here.')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when both contact ID and deal ID are empty', async () => {
      render(<PlaybooksPanel />);

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Enter at least a contact ID or deal ID.')).toBeInTheDocument();
      });
    });

    it('should allow generation with only contact ID', async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockPlaybooksResponse));

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(streamSse).toHaveBeenCalledWith(
          URL,
          expect.objectContaining({ body: { contactId: 'contact-456', dealId: undefined, stream: true } }),
          expect.anything(),
          expect.anything()
        );
      });
    });

    it('should allow generation with only deal ID', async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockPlaybooksResponse));

      render(<PlaybooksPanel />);

      const dealIdInput = screen.getByPlaceholderText('Enter deal UUID');
      fireEvent.change(dealIdInput, { target: { value: 'deal-123' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(streamSse).toHaveBeenCalledWith(
          URL,
          expect.objectContaining({ body: { contactId: undefined, dealId: 'deal-123', stream: true } }),
          expect.anything(),
          expect.anything()
        );
      });
    });
  });

  describe('Playbook Generation', () => {
    it('should generate playbooks successfully with both IDs', async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockPlaybooksResponse));

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const dealIdInput = screen.getByPlaceholderText('Enter deal UUID');

      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });
      fireEvent.change(dealIdInput, { target: { value: 'deal-123' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(streamSse).toHaveBeenCalledWith(
          URL,
          expect.objectContaining({ body: { contactId: 'contact-456', dealId: 'deal-123', stream: true } }),
          expect.anything(),
          expect.anything()
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Top Scripts')).toBeInTheDocument();
        expect(screen.getByText('Script 1: Introduction')).toBeInTheDocument();
      });
    });

    it('should handle generation errors gracefully', async () => {
      streamSse.mockRejectedValueOnce(new Error('API Error: No data found'));

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ API Error: No data found')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      streamSse.mockRejectedValueOnce(new Error('Network error'));

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Network error')).toBeInTheDocument();
      });
    });

    it('should show loading state during generation', async () => {
      streamSse.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(okOutcome(mockPlaybooksResponse)), 100))
      );

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      expect(screen.getByText('Generating Playbooks...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Generate Playbooks')).toBeInTheDocument();
      });
    });
  });

  describe('Result Display', () => {
    beforeEach(async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockPlaybooksResponse));

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Top Scripts')).toBeInTheDocument();
      });
    });

    it('should display summary when provided', () => {
      expect(screen.getByText('This contact shows strong interest but has budget concerns. Focus on ROI and long-term value.')).toBeInTheDocument();
    });

    it('should display top scripts', () => {
      expect(screen.getByText('Top Scripts')).toBeInTheDocument();
      expect(screen.getByText('Script 1: Introduction')).toBeInTheDocument();
      expect(screen.getByText('Script 2: Value proposition')).toBeInTheDocument();
    });

    it('should display objections and responses', () => {
      expect(screen.getByText('Top Objections & Responses')).toBeInTheDocument();
      expect(screen.getByText('Price objection: Handle by focusing on ROI')).toBeInTheDocument();
    });

    it('should display follow-up patterns', () => {
      expect(screen.getByText('Follow-Up Patterns')).toBeInTheDocument();
      expect(screen.getByText('Follow up in 3 days')).toBeInTheDocument();
      expect(screen.getByText('Send case study')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should clear previous errors on successful generation', async () => {
      // First, trigger an error
      streamSse.mockRejectedValueOnce(new Error('First error'));

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ First error')).toBeInTheDocument();
      });

      // Now successful call
      streamSse.mockResolvedValueOnce(okOutcome(mockPlaybooksResponse));

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByText('⚠️ First error')).not.toBeInTheDocument();
        expect(screen.getByText('Top Scripts')).toBeInTheDocument();
      });
    });

    it('should clear previous results on new generation', async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockPlaybooksResponse));

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Top Scripts')).toBeInTheDocument();
      });

      // Start new generation
      fireEvent.change(contactIdInput, { target: { value: 'contact-789' } });
      fireEvent.click(generateButton);

      expect(screen.queryByText('Top Scripts')).not.toBeInTheDocument();
    });
  });

  describe('List Rendering', () => {
    it('should render structured script, objection and follow-up items', async () => {
      streamSse.mockResolvedValueOnce(okOutcome({
        summary: 'Structured summary',
        top_scripts: [{ name: 'Intro opener', script: 'Hi, quick question about your pipeline' }],
        objections: [{ objection: 'Too expensive', response: 'Compare against the cost of lost deals' }],
        followups: [{ timing: 'Day 3', channel: 'email', message: 'Sharing a short case study' }]
      }));

      render(<PlaybooksPanel />);
      fireEvent.change(screen.getByPlaceholderText('Enter contact UUID'), { target: { value: 'contact-456' } });
      fireEvent.click(screen.getByText('Generate Playbooks'));

      await waitFor(() => {
        expect(screen.getByText('Intro opener')).toBeInTheDocument();
        expect(screen.getByText('Hi, quick question about your pipeline')).toBeInTheDocument();
        expect(screen.getByText('Too expensive')).toBeInTheDocument();
        expect(screen.getByText('Compare against the cost of lost deals')).toBeInTheDocument();
        expect(screen.getByText('Day 3 · email')).toBeInTheDocument();
        expect(screen.getByText('Sharing a short case study')).toBeInTheDocument();
      });
    });

    it('should handle empty arrays gracefully', async () => {
      const emptyResponse = {
        ...mockPlaybooksResponse,
        top_scripts: [],
        objections: [],
        followups: []
      };

      streamSse.mockResolvedValueOnce(okOutcome(emptyResponse));

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('This contact shows strong interest but has budget concerns. Focus on ROI and long-term value.')).toBeInTheDocument();
        // Empty arrays should not render sections
        expect(screen.queryByText('Top Scripts')).not.toBeInTheDocument();
      });
    });

    it('should handle string items in lists', async () => {
      const stringResponse = {
        ...mockPlaybooksResponse,
        top_scripts: ['Simple string script'],
        objections: ['Simple objection response']
      };

      streamSse.mockResolvedValueOnce(okOutcome(stringResponse));

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Simple string script')).toBeInTheDocument();
        expect(screen.getByText('Simple objection response')).toBeInTheDocument();
      });
    });
  });
});