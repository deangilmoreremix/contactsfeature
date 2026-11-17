/**
 * VideoAgentPanel: the script + storyboard are streamed from the video-agent function through useAIStream
 * (streamSse); the panel renders the final result, the "no video rendered" note and any error.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoAgentPanel } from '../components/VideoAgentPanel';
import { newOutcome } from '../lib/streaming/streamClient';

// Mock dependencies
vi.mock('../services/sdrPreferencesService', () => ({
  sdrPreferencesService: {
    getPreferences: vi.fn().mockResolvedValue({}),
    updatePreferences: vi.fn().mockResolvedValue({})
  }
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

const URL = '/.netlify/functions/video-agent';
const okOutcome = (result: unknown) => ({ ...newOutcome(), result });

describe('VideoAgentPanel', () => {
  const mockVideoResponse = {
    contactId: 'contact-123',
    storyboard: { scenes: ['Opening', 'Demo', 'Close'] },
    script: 'Welcome to our product demo...',
    videoUrl: 'https://example.com/video.mp4',
    rendering: { available: false, note: 'No render backend is configured' },
    debug: { processingTime: 15.2, tokens: 500 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    streamSse.mockReset().mockResolvedValue(okOutcome(mockVideoResponse));
  });

  describe('Initial Render', () => {
    it('should render component with proper structure', () => {
      render(<VideoAgentPanel />);

      expect(screen.getByText('📹 Video Agent')).toBeInTheDocument();
      expect(screen.getByText(/Auto-generate Loom-style explainer videos/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter contact UUID')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://your-landing-page.com/offer')).toBeInTheDocument();
      expect(screen.getByText('Generate Script & Storyboard')).toBeInTheDocument();
    });

    it('should have empty form fields initially', () => {
      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');
      const goalSelect = screen.getByDisplayValue('Product Demo');

      expect(contactIdInput).toHaveValue('');
      expect(productUrlInput).toHaveValue('');
      expect(goalSelect).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when contact ID is empty', async () => {
      render(<VideoAgentPanel />);

      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Please enter a contact ID.')).toBeInTheDocument();
      });
    });

    it('should show error when product URL is empty', async () => {
      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Please enter the product or landing page URL.')).toBeInTheDocument();
      });
    });
  });

  describe('Video Generation', () => {
    it('should generate video successfully', async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockVideoResponse));

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(streamSse).toHaveBeenCalledWith(
          URL,
          expect.objectContaining({ body: { contactId: 'contact-123', productUrl: 'https://example.com', goal: 'demo', stream: true } }),
          expect.anything(),
          expect.anything()
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Result')).toBeInTheDocument();
        expect(screen.getByText('Welcome to our product demo...')).toBeInTheDocument();
      });
    });

    it('should display video player when videoUrl is provided', async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockVideoResponse));

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        const videoElement = document.querySelector('video');
        expect(videoElement).toHaveAttribute('src', 'https://example.com/video.mp4');
      });
    });

    it('should handle generation errors gracefully', async () => {
      streamSse.mockRejectedValueOnce(new Error('API Error: Invalid request'));

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ API Error: Invalid request')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      streamSse.mockRejectedValueOnce(new Error('Network error'));

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Network error')).toBeInTheDocument();
      });
    });

    it('should show loading state during generation', async () => {
      streamSse.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(okOutcome(mockVideoResponse)), 100))
      );

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      expect(screen.getByText('Writing Script...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Generate Script & Storyboard')).toBeInTheDocument();
      });
    });

    it('should use selected video goal in request', async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockVideoResponse));

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');
      const goalSelect = screen.getByDisplayValue('Product Demo');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });
      fireEvent.change(goalSelect, { target: { value: 'followup' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(streamSse).toHaveBeenCalledWith(
          URL,
          expect.objectContaining({ body: { contactId: 'contact-123', productUrl: 'https://example.com', goal: 'followup', stream: true } }),
          expect.anything(),
          expect.anything()
        );
      });
    });
  });

  describe('Result Display', () => {
    beforeEach(async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockVideoResponse));

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Result')).toBeInTheDocument();
      });
    });

    it('should display script when provided', () => {
      expect(screen.getByText('Welcome to our product demo...')).toBeInTheDocument();
    });

    it('should display video player when videoUrl is provided', () => {
      const videoElement = document.querySelector('video');
      expect(videoElement).toHaveAttribute('src', 'https://example.com/video.mp4');
    });

  });

  describe('Error Handling', () => {
    it('should clear previous errors on successful generation', async () => {
      // First, trigger an error
      streamSse.mockRejectedValueOnce(new Error('First error'));

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ First error')).toBeInTheDocument();
      });

      // Now successful call
      streamSse.mockResolvedValueOnce(okOutcome(mockVideoResponse));

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByText('⚠️ First error')).not.toBeInTheDocument();
        expect(screen.getByText('Result')).toBeInTheDocument();
      });
    });

    it('should clear previous results on new generation', async () => {
      streamSse.mockResolvedValueOnce(okOutcome(mockVideoResponse));

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Script & Storyboard');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Result')).toBeInTheDocument();
      });

      // Start new generation
      fireEvent.change(productUrlInput, { target: { value: 'https://new-example.com' } });
      fireEvent.click(generateButton);

      expect(screen.queryByText('Result')).not.toBeInTheDocument();
    });
  });

  describe('Video Goal Selection', () => {
    it('should display all video goal options', () => {
      render(<VideoAgentPanel />);

      const goalSelect = screen.getByDisplayValue('Product Demo');
      expect(goalSelect).toBeInTheDocument();

      // Check that all options are available
      expect(screen.getByText('Product Demo')).toBeInTheDocument();
      expect(screen.getByText('Sales Follow-Up')).toBeInTheDocument();
      expect(screen.getByText('High-Level Overview')).toBeInTheDocument();
      expect(screen.getByText('Onboarding / Walkthrough')).toBeInTheDocument();
    });
  });
});