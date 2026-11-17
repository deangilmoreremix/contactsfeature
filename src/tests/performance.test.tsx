/**
 * Performance benchmarks for the AI buttons (score badge on the contact card, CustomizableAIToolbar).
 *
 * The real components, AIProvider, AI orchestrator and contact AI service run; only the network boundary is stubbed
 * (`aiJson` answers immediately, `webSearchService` is stubbed), so the timings measure our own overhead and the
 * budgets below are deliberately generous to stay stable on slow CI machines.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ aiJson: vi.fn(), searchWithAI: vi.fn() }));

vi.mock('../services/aiClient', () => ({ aiJson: mocks.aiJson, aiRespond: vi.fn(), aiStream: vi.fn() }));
vi.mock('../services/webSearchService', () => ({ webSearchService: { searchWithAI: mocks.searchWithAI } }));

import { AIEnhancedContactCard } from '../components/contacts/AIEnhancedContactCard';
import { CustomizableAIToolbar } from '../components/ui/CustomizableAIToolbar';
import { AIProvider } from '../contexts/AIContext';
import { aiOrchestrator } from '../services/ai-orchestrator.service';
import { useContactStore } from '../hooks/useContactStore';
import type { Contact } from '../types';

const makeContact = (id: string, name = 'Performance Test User') => ({
  id,
  name,
  firstName: 'Performance',
  lastName: 'Test',
  email: 'perf@test.com',
  company: 'Test Corp',
  title: 'Test User',
  phone: '+1-555-0123',
  industry: 'Technology',
  sources: ['Test'],
  socialProfiles: {},
  customFields: {},
  interestLevel: 'hot',
  status: 'lead',
  createdBy: 'test',
  dataSource: 'test',
}) as unknown as Contact;

const scoreJson = { score: 77, breakdown: { fitScore: 70, engagementScore: 70, conversionProbability: 60, urgencyScore: 50 }, reasoning: ['Good fit'], recommendations: [], nextBestActions: [] };

const updateContact = vi.fn();

function seedStore(...contacts: Contact[]) {
  updateContact.mockReset();
  updateContact.mockResolvedValue(undefined);
  useContactStore.setState({ contacts, updateContact } as never);
}

const card = (contact: Contact) => (
  <AIEnhancedContactCard key={contact.id} contact={contact} isSelected={false} onSelect={() => {}} onClick={() => {}} />
);

describe('AI Buttons Performance Benchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_AI_MAX_RETRY_ATTEMPTS', '1');
    aiOrchestrator.clearCache();
    mocks.aiJson.mockResolvedValue(scoreJson);
    mocks.searchWithAI.mockResolvedValue({ content: 'Test Corp is a company.', sources: [{ url: 'https://example.com', title: 'Example', domain: 'example.com' }] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('AI Analysis Button Performance', () => {
    it('scores a contact within 2 seconds', async () => {
      const contact = makeContact('perf-test-contact');
      seedStore(contact);
      const startTime = performance.now();

      render(<AIProvider>{card(contact)}</AIProvider>);
      fireEvent.click(screen.getByTestId('ai-score-button'));
      await waitFor(() => expect(screen.getByTestId('ai-score-display')).toHaveTextContent('77'), { timeout: 3000 });

      expect(performance.now() - startTime).toBeLessThan(2000);
      expect(mocks.aiJson).toHaveBeenCalledTimes(1);
    });

    it('handles 5 simultaneous analyses (one AI call per card) within 5 seconds', async () => {
      const contacts = Array.from({ length: 5 }, (_, i) => makeContact(`perf-contact-${i}`, `Performance User ${i}`));
      seedStore(...contacts);
      const startTime = performance.now();

      render(<AIProvider>{contacts.map(card)}</AIProvider>);
      screen.getAllByTestId('ai-score-button').forEach((button) => fireEvent.click(button));

      await waitFor(() => expect(screen.getAllByTestId('ai-score-display')).toHaveLength(5), { timeout: 10000 });

      expect(performance.now() - startTime).toBeLessThan(5000);
      expect(mocks.aiJson).toHaveBeenCalledTimes(5);
      expect(updateContact.mock.calls.map(([id]) => id).sort()).toEqual(contacts.map((c) => c.id).sort());
    });

    it('keeps performance steady over 10 sequential analyses', async () => {
      const results: number[] = [];

      for (let i = 0; i < 10; i++) {
        const contact = makeContact(`load-test-${i}`);
        seedStore(contact);
        const startTime = performance.now();

        const { unmount } = render(<AIProvider>{card(contact)}</AIProvider>);
        fireEvent.click(screen.getByTestId('ai-score-button'));
        await waitFor(() => expect(screen.getByTestId('ai-score-display')).toBeInTheDocument());

        results.push(performance.now() - startTime);
        unmount();
      }

      const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avgTime).toBeLessThan(1500);
      expect(Math.max(...results)).toBeLessThan(3000);
      expect(mocks.aiJson).toHaveBeenCalledTimes(10);
    });
  });

  describe('AI Toolbar Performance', () => {
    it('completes a Lead Score toolbar action within 3 seconds', async () => {
      const contact = makeContact('perf-test-contact');
      seedStore(contact);
      const startTime = performance.now();

      render(
        <AIProvider>
          <CustomizableAIToolbar entityType="contact" entityId={contact.id} entityData={contact} location="contactCards" layout="grid" size="sm" />
        </AIProvider>
      );
      fireEvent.click(screen.getByText('Lead Score'));
      await waitFor(() => expect(screen.getByText('Done!')).toBeInTheDocument(), { timeout: 5000 });

      expect(performance.now() - startTime).toBeLessThan(3000);
      expect(mocks.searchWithAI).toHaveBeenCalledTimes(1);
      expect(mocks.aiJson).toHaveBeenCalledTimes(1);
    });
  });

  describe('Repeated use', () => {
    it('leaves nothing mounted and makes exactly one AI call per analysis over 20 mount/analyse/unmount cycles', async () => {
      for (let i = 0; i < 20; i++) {
        const contact = makeContact(`memory-test-${i}`);
        seedStore(contact);

        const { unmount } = render(<AIProvider>{card(contact)}</AIProvider>);
        fireEvent.click(screen.getByTestId('ai-score-button'));
        await waitFor(() => expect(screen.getByTestId('ai-score-display')).toBeInTheDocument());
        unmount();
      }

      expect(document.body.querySelectorAll('[data-testid="contact-card"]')).toHaveLength(0);
      expect(mocks.aiJson).toHaveBeenCalledTimes(20);
    });
  });

  describe('Error Recovery Performance', () => {
    it('surfaces an AI failure within 1 second and lets the user retry', async () => {
      const contact = makeContact('perf-test-contact');
      seedStore(contact);
      mocks.aiJson.mockRejectedValueOnce(new Error('Network error'));
      const startTime = performance.now();

      render(<AIProvider>{card(contact)}</AIProvider>);
      fireEvent.click(screen.getByTestId('ai-score-button'));
      await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument());

      expect(performance.now() - startTime).toBeLessThan(1000);
      expect(screen.getByTestId('ai-score-button')).not.toBeDisabled();

      fireEvent.click(screen.getByTestId('ai-score-button'));
      await waitFor(() => expect(screen.getByTestId('ai-score-display')).toHaveTextContent('77'));
    });
  });
});
