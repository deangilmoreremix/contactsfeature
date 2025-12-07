/**
 * Comprehensive tests for PlaybooksPanel component
 * Tests playbook generation, UI interactions, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlaybooksPanel } from '../components/PlaybooksPanel';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
  });

  afterEach(() => {
    vi.resetAllMocks();
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlaybooksResponse
      });

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/playbooks-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: 'contact-456', dealId: undefined })
        });
      });
    });

    it('should allow generation with only deal ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlaybooksResponse
      });

      render(<PlaybooksPanel />);

      const dealIdInput = screen.getByPlaceholderText('Enter deal UUID');
      fireEvent.change(dealIdInput, { target: { value: 'deal-123' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/playbooks-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: undefined, dealId: 'deal-123' })
        });
      });
    });
  });

  describe('Playbook Generation', () => {
    it('should generate playbooks successfully with both IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlaybooksResponse
      });

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const dealIdInput = screen.getByPlaceholderText('Enter deal UUID');

      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });
      fireEvent.change(dealIdInput, { target: { value: 'deal-123' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/playbooks-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: 'contact-456', dealId: 'deal-123' })
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Top Scripts')).toBeInTheDocument();
        expect(screen.getByText('Script 1: Introduction')).toBeInTheDocument();
      });
    });

    it('should handle generation errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error: No data found'
      });

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
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

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
      mockFetch.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockPlaybooksResponse
        }), 100))
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlaybooksResponse
      });

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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'First error'
      });

      render(<PlaybooksPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-456' } });

      const generateButton = screen.getByText('Generate Playbooks');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ First error')).toBeInTheDocument();
      });

      // Now successful call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlaybooksResponse
      });

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByText('⚠️ First error')).not.toBeInTheDocument();
        expect(screen.getByText('Top Scripts')).toBeInTheDocument();
      });
    });

    it('should clear previous results on new generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlaybooksResponse
      });

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
    it('should handle empty arrays gracefully', async () => {
      const emptyResponse = {
        ...mockPlaybooksResponse,
        top_scripts: [],
        objections: [],
        followups: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse
      });

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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => stringResponse
      });

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