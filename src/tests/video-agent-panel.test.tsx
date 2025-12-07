/**
 * Comprehensive tests for VideoAgentPanel component
 * Tests video generation, UI interactions, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoAgentPanel } from '../components/VideoAgentPanel';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('VideoAgentPanel', () => {
  const mockVideoResponse = {
    contactId: 'contact-123',
    storyboard: { scenes: ['Opening', 'Demo', 'Close'] },
    script: 'Welcome to our product demo...',
    videoUrl: 'https://example.com/video.mp4',
    debug: { processingTime: 15.2, tokens: 500 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Render', () => {
    it('should render component with proper structure', () => {
      render(<VideoAgentPanel />);

      expect(screen.getByText('📹 Video Agent')).toBeInTheDocument();
      expect(screen.getByText(/Auto-generate Loom-style explainer videos/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter contact UUID')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://your-landing-page.com/offer')).toBeInTheDocument();
      expect(screen.getByText('Generate Video')).toBeInTheDocument();
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

      const generateButton = screen.getByText('Generate Video');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Please enter a contact ID.')).toBeInTheDocument();
      });
    });

    it('should show error when product URL is empty', async () => {
      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });

      const generateButton = screen.getByText('Generate Video');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Please enter the product or landing page URL.')).toBeInTheDocument();
      });
    });
  });

  describe('Video Generation', () => {
    it('should generate video successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse
      });

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Video');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/video-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: 'contact-123', productUrl: 'https://example.com', goal: 'demo' })
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Result')).toBeInTheDocument();
        expect(screen.getByText('Welcome to our product demo...')).toBeInTheDocument();
      });
    });

    it('should display video player when videoUrl is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse
      });

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Video');
      fireEvent.click(generateButton);

      await waitFor(() => {
        const videoElement = document.querySelector('video');
        expect(videoElement).toHaveAttribute('src', 'https://example.com/video.mp4');
      });
    });

    it('should handle generation errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error: Invalid request'
      });

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Video');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ API Error: Invalid request')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Video');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Network error')).toBeInTheDocument();
      });
    });

    it('should show loading state during generation', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockVideoResponse
        }), 100))
      );

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Video');
      fireEvent.click(generateButton);

      expect(screen.getByText('Generating Video Plan...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Generate Video')).toBeInTheDocument();
      });
    });

    it('should use selected video goal in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse
      });

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');
      const goalSelect = screen.getByDisplayValue('Product Demo');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });
      fireEvent.change(goalSelect, { target: { value: 'followup' } });

      const generateButton = screen.getByText('Generate Video');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/video-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: 'contact-123', productUrl: 'https://example.com', goal: 'followup' })
        });
      });
    });
  });

  describe('Result Display', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse
      });

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Video');
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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'First error'
      });

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Video');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ First error')).toBeInTheDocument();
      });

      // Now successful call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse
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
        json: async () => mockVideoResponse
      });

      render(<VideoAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const productUrlInput = screen.getByPlaceholderText('https://your-landing-page.com/offer');

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(productUrlInput, { target: { value: 'https://example.com' } });

      const generateButton = screen.getByText('Generate Video');
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