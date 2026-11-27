/**
 * AI buttons on a contact: AIEnhancedContactCard (score badge, feedback), the AI tools in the contact detail
 * sidebar (AI Web Research / Enrich / AI Auto-Enrich / AI Goals) and CustomizableAIToolbar
 * (Lead Score / Email AI / Enrich / Insights).
 *
 * Real code under test: the components, useContactAI, AIProvider, the AI orchestrator and the contact AI service.
 * Stubbed at the network boundary only: `aiJson` (the AI proxy client), `streamFunction` (SSE transport used by the
 * web enrichment), `fetch` + Supabase auth (polling enrichment path), `webSearchService`, and the contact store's
 * persistence (`updateContact`).
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  aiJson: vi.fn(),
  streamFunction: vi.fn(),
  searchWithAI: vi.fn(),
}));

vi.mock('../services/aiClient', () => ({
  aiJson: mocks.aiJson,
  aiRespond: vi.fn(),
  aiStream: vi.fn(),
}));
vi.mock('../services/liveFunction', () => ({ streamFunction: mocks.streamFunction }));
vi.mock('../services/webSearchService', () => ({ webSearchService: { searchWithAI: mocks.searchWithAI } }));
vi.mock('../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/supabase')>();
  const { createFakeSupabase } = await import('./helpers/fakeSupabase');
  const fake = createFakeSupabase();
  fake.auth.getSession = async () => ({ data: { session: { access_token: 'test-token' } as unknown }, error: null });
  const channel = () => {
    const ch: Record<string, unknown> = {};
    ch['on'] = () => ch;
    ch['subscribe'] = () => ch;
    ch['track'] = async () => undefined;
    ch['presenceState'] = () => ({});
    ch['unsubscribe'] = () => undefined;
    return ch;
  };
  return {
    ...actual,
    supabase: {
      ...fake,
      auth: { ...fake.auth, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }) },
      channel,
      removeChannel: () => undefined,
    },
  };
});

import { AIEnhancedContactCard } from '../components/contacts/AIEnhancedContactCard';
import { ContactDetailView } from '../components/modals/ContactDetailView';
import { CustomizableAIToolbar } from '../components/ui/CustomizableAIToolbar';
import { AIProvider } from '../contexts/AIContext';
import { aiOrchestrator } from '../services/ai-orchestrator.service';
import { useContactStore } from '../hooks/useContactStore';
import type { Contact } from '../types';

const baseContact = {
  id: 'test-contact-123',
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@techcorp.com',
  company: 'TechCorp Inc',
  title: 'Senior Developer',
  phone: '+1-555-0123',
  industry: 'Technology',
  sources: ['LinkedIn', 'Website'],
  socialProfiles: {},
  customFields: {},
  interestLevel: 'hot',
  status: 'lead',
  createdBy: 'user',
  dataSource: 'imported',
} as unknown as Contact;

const demoContact = { ...baseContact, id: 'demo-contact-456', createdBy: 'demo', dataSource: 'mock', isMockData: true } as unknown as Contact;

const scoreJson = { score: 82.4, breakdown: { fitScore: 80, engagementScore: 70, conversionProbability: 60, urgencyScore: 50 }, reasoning: ['Strong title fit', 'Active buyer'], recommendations: [], nextBestActions: [] };

const updateContact = vi.fn();

function seedStore(...contacts: Contact[]) {
  updateContact.mockReset();
  updateContact.mockImplementation(async (_id: string, updates: Partial<Contact>) => ({ ...contacts[0], ...updates }));
  useContactStore.setState({ contacts, updateContact } as never);
}

function renderCard(contact: Contact, props: Partial<React.ComponentProps<typeof AIEnhancedContactCard>> = {}) {
  return render(
    <AIProvider>
      <AIEnhancedContactCard contact={contact} isSelected={false} onSelect={() => {}} onClick={() => {}} {...props} />
    </AIProvider>
  );
}

function renderToolbar(contact: Contact = baseContact) {
  return render(
    <AIProvider>
      <CustomizableAIToolbar entityType="contact" entityId={contact.id} entityData={contact} location="contactCards" layout="grid" size="sm" />
    </AIProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // a failed AI call is retried after a backoff by default; one attempt keeps the failure tests fast and deterministic
  vi.stubEnv('VITE_AI_MAX_RETRY_ATTEMPTS', '1');
  aiOrchestrator.clearCache();
  mocks.aiJson.mockResolvedValue(scoreJson);
  mocks.searchWithAI.mockResolvedValue({
    content: 'TechCorp is a software company.',
    sources: [{ url: 'https://techcorp.com/about', title: 'About TechCorp', domain: 'techcorp.com' }],
  });
  seedStore(baseContact);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('AIEnhancedContactCard', () => {
  describe('AI score button', () => {
    it('shows "Click to Score" for an unscored contact and the score for a scored one', () => {
      renderCard(baseContact);
      expect(screen.getByText('Click to Score')).toBeInTheDocument();
      expect(screen.getByTestId('ai-score-button')).toBeInTheDocument();
      cleanup();

      seedStore({ ...baseContact, aiScore: 85 } as Contact);
      renderCard({ ...baseContact, aiScore: 85 } as Contact);
      expect(screen.getByTestId('ai-score-display')).toHaveTextContent('85');
      expect(screen.queryByText('Click to Score')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-score-button')).not.toBeInTheDocument();
    });

    it('scores through the AI proxy: disables the button while running, then saves the rounded score and a note', async () => {
      let resolveAi!: (v: unknown) => void;
      mocks.aiJson.mockReturnValueOnce(new Promise((r) => { resolveAi = r; }));
      renderCard(baseContact);

      fireEvent.click(screen.getByTestId('ai-score-button'));
      await waitFor(() => expect(screen.getByText('Analyzing...')).toBeInTheDocument());
      expect(screen.getByTestId('ai-score-button')).toBeDisabled();

      await act(async () => { resolveAi(scoreJson); });

      await waitFor(() => expect(screen.getByTestId('ai-score-display')).toHaveTextContent('82'));
      expect(mocks.aiJson).toHaveBeenCalledTimes(1);
      expect(mocks.aiJson.mock.calls[0]![0]).toMatchObject({ role: 'thinking', schemaName: 'contact_scoring' });
      expect(mocks.aiJson.mock.calls[0]![0].input).toContain('John Doe');
      expect(updateContact).toHaveBeenCalledWith(baseContact.id, {
        aiScore: 82,
        notes: 'AI Analysis: Strong title fit. Active buyer',
      });
    });

    it('scores demo contacts locally without calling the AI proxy', async () => {
      seedStore(demoContact);
      vi.useFakeTimers();
      renderCard(demoContact);

      fireEvent.click(screen.getByTestId('ai-score-button'));
      await act(async () => { await vi.advanceTimersByTimeAsync(1600); });

      expect(mocks.aiJson).not.toHaveBeenCalled();
      expect(updateContact).toHaveBeenCalledTimes(1);
      const [id, updates] = updateContact.mock.calls[0]!;
      expect(id).toBe(demoContact.id);
      expect(updates.aiScore).toBeGreaterThanOrEqual(60);
      expect(updates.aiScore).toBeLessThan(100);
      expect(updates.notes).toContain(`AI Analysis: Demo contact scored at ${updates.aiScore}/100`);
      expect(screen.getByTestId('ai-score-display')).toHaveTextContent(String(updates.aiScore));
    });

    it('delegates to the onAnalyze prop when one is given', async () => {
      const onAnalyze = vi.fn().mockResolvedValue(true);
      renderCard(baseContact, { onAnalyze });

      fireEvent.click(screen.getByTestId('ai-score-button'));

      await waitFor(() => expect(onAnalyze).toHaveBeenCalledWith(baseContact));
      expect(mocks.aiJson).not.toHaveBeenCalled();
    });

    it('disables the score button while the parent reports isAnalyzing', () => {
      renderCard(baseContact, { isAnalyzing: true });
      expect(screen.getByTestId('ai-score-button')).toBeDisabled();
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });
  });

  describe('failures', () => {
    it.each([
      ['a network error', () => new Error('Network error'), 'Network error'],
      ['an API rate limit', () => Object.assign(new Error('Rate limit exceeded'), { status: 429 }), 'Rate limit exceeded'],
    ])('shows %s in the card and lets the user dismiss it', async (_label, makeError, expected) => {
      mocks.aiJson.mockRejectedValue(makeError());
      renderCard(baseContact);

      fireEvent.click(screen.getByTestId('ai-score-button'));

      await waitFor(() => expect(screen.getByText(new RegExp(expected))).toBeInTheDocument());
      expect(updateContact).not.toHaveBeenCalled();
      // the button is usable again so the user can retry
      expect(screen.getByTestId('ai-score-button')).not.toBeDisabled();

      fireEvent.click(screen.getByLabelText('Dismiss error'));
      expect(screen.queryByText(new RegExp(expected))).not.toBeInTheDocument();
    });
  });

  describe('AI feedback buttons', () => {
    it('only appear once the contact has an AI score', () => {
      renderCard(baseContact);
      expect(screen.queryByTitle('Good AI analysis')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Poor AI analysis')).not.toBeInTheDocument();
    });

    it('show for a scored contact and log the feedback when clicked', () => {
      const scored = { ...baseContact, aiScore: 85 } as Contact;
      seedStore(scored);
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      renderCard(scored);

      fireEvent.click(screen.getByTitle('Good AI analysis'));
      expect(log).toHaveBeenCalledWith('positive AI feedback for contact:', scored.id);

      fireEvent.click(screen.getByTitle('Poor AI analysis'));
      expect(log).toHaveBeenCalledWith('negative AI feedback for contact:', scored.id);
    });
  });

  it('analyses several cards independently at the same time', async () => {
    const a = { ...demoContact, id: 'contact-1' } as Contact;
    const b = { ...demoContact, id: 'contact-2' } as Contact;
    seedStore(a, b);
    vi.useFakeTimers();
    render(
      <AIProvider>
        <AIEnhancedContactCard contact={a} isSelected={false} onSelect={() => {}} onClick={() => {}} />
        <AIEnhancedContactCard contact={b} isSelected={false} onSelect={() => {}} onClick={() => {}} />
      </AIProvider>
    );

    screen.getAllByTestId('ai-score-button').forEach((button) => fireEvent.click(button));
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });

    expect(updateContact.mock.calls.map(([id]) => id).sort()).toEqual(['contact-1', 'contact-2']);
    expect(screen.getAllByTestId('ai-score-display')).toHaveLength(2);
  });
});

describe('Contact detail view AI tools', () => {
  const enrichPayload = {
    result: {
      matched: true,
      confidence: 80,
      summary: 'Engineering lead at TechCorp.',
      profile: {},
      company: {},
      recentNews: [],
      talkingPoints: ['Recently shipped a platform migration'],
      evidence: [],
      warnings: [],
    },
    citations: [{ url: 'https://techcorp.com/team', title: 'TechCorp team page' }],
    suggestedUpdates: { industry: 'Software' },
    persisted: false,
  };

  // `industry` is empty so the enrichment has a field to fill (it never overwrites existing data)
  const realContact = { ...baseContact, industry: '' } as unknown as Contact;

  function renderDetail(contact: Contact) {
    seedStore(contact);
    return render(<ContactDetailView contact={contact} isOpen onClose={() => {}} />);
  }

  beforeEach(() => {
    mocks.streamFunction.mockResolvedValue({ result: enrichPayload, outcome: {}, citations: [] });
  });

  it.each([
    ['AI Web Research (header button)', () => screen.getByTitle('AI Web Research')],
    ['Enrich (quick action)', () => screen.getByText('Enrich').closest('button')!],
    ['AI Auto-Enrich', () => screen.getByText('AI Auto-Enrich').closest('button')!],
  ])('%s runs the streamed web enrichment and shows findings with sources', async (_label, getButton) => {
    renderDetail(realContact);

    fireEvent.click(getButton());

    await waitFor(() => expect(screen.getByText('Web research')).toBeInTheDocument());
    expect(mocks.streamFunction).toHaveBeenCalledTimes(1);
    const [url, body] = mocks.streamFunction.mock.calls[0]!;
    expect(url).toBe('/.netlify/functions/contact-enrich');
    expect(body).toMatchObject({ action: 'start', background: true, contact: { name: 'John Doe', company: 'TechCorp Inc' } });

    expect(screen.getByText('Engineering lead at TechCorp.')).toBeInTheDocument();
    expect(screen.getByText('Recently shipped a platform migration')).toBeInTheDocument();
    expect(screen.getByText('Added: industry')).toBeInTheDocument();
    const source = screen.getByText('TechCorp team page');
    expect(source).toHaveAttribute('href', 'https://techcorp.com/team');
    expect(screen.getByText(/Enhanced with AI \(80% confidence\)/)).toBeInTheDocument();

    // only the empty field was written, through the store update path
    expect(updateContact).toHaveBeenCalledWith(realContact.id, { industry: 'Software' });
  });

  it('shows "Researching..." and disables the buttons while a run is in progress', async () => {
    let finish!: (v: unknown) => void;
    mocks.streamFunction.mockReturnValueOnce(new Promise((r) => { finish = r; }));
    renderDetail(realContact);

    fireEvent.click(screen.getByText('AI Auto-Enrich'));

    await waitFor(() => expect(screen.getByText('Researching...')).toBeInTheDocument());
    expect(screen.getByTitle('AI Web Research')).toBeDisabled();
    expect(screen.getByText('Enrich').closest('button')).toBeDisabled();

    await act(async () => { finish({ result: enrichPayload, outcome: {}, citations: [] }); });
    await waitFor(() => expect(screen.getByText('Web research')).toBeInTheDocument());
    expect(screen.getByTitle('AI Web Research')).not.toBeDisabled();
  });

  it('reports an enrichment failure without changing the contact', async () => {
    mocks.streamFunction.mockRejectedValueOnce(new Error('Search provider unavailable'));
    renderDetail(realContact);

    fireEvent.click(screen.getByTitle('AI Web Research'));

    await waitFor(() => expect(screen.getByText('Search provider unavailable')).toBeInTheDocument());
    expect(screen.getByText('Research Error')).toBeInTheDocument();
    expect(updateContact).not.toHaveBeenCalled();
    expect(screen.queryByText('Web research')).not.toBeInTheDocument();

    // the error stays up until dismissed, then the AI buttons work again
    expect(screen.getByTitle('AI Web Research')).toBeDisabled();
    const overlay = screen.getByText('Research Error').closest('.fixed') as HTMLElement;
    fireEvent.click(within(overlay).getByRole('button'));
    expect(screen.queryByText('Research Error')).not.toBeInTheDocument();
    expect(screen.getByTitle('AI Web Research')).not.toBeDisabled();
  });

  it('does not research demo contacts and explains why', async () => {
    renderDetail(demoContact);

    fireEvent.click(screen.getByTitle('AI Web Research'));

    await waitFor(() => expect(screen.getByText(/sample contact, so there is nothing real to research/)).toBeInTheDocument());
    expect(mocks.streamFunction).not.toHaveBeenCalled();
  });

  it('AI Goals opens the external goals app in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderDetail(realContact);

    fireEvent.click(screen.getByText('AI Goals'));

    expect(open).toHaveBeenCalledWith('https://tubular-choux-2a9b3c.netlify.app/', '_blank');
  });
});

describe('CustomizableAIToolbar', () => {
  /** Click a toolbar button and wait for it to finish ("Processing..." -> "Done!"). */
  async function run(label: string) {
    fireEvent.click(screen.getByText(label));
    await waitFor(() => expect(screen.getByText('Done!')).toBeInTheDocument());
  }

  it('Lead Score researches the company, scores through the AI proxy and ends in a success state', async () => {
    let resolveAi!: (v: unknown) => void;
    mocks.aiJson.mockReturnValueOnce(new Promise((r) => { resolveAi = r; }));
    renderToolbar();

    fireEvent.click(screen.getByText('Lead Score'));
    await waitFor(() => expect(screen.getByText('Processing...')).toBeInTheDocument());
    expect(screen.getByTestId('leadscoring-button')).toBeDisabled();
    await waitFor(() => expect(mocks.aiJson).toHaveBeenCalledTimes(1));

    await act(async () => { resolveAi(scoreJson); });
    await waitFor(() => expect(screen.getByText('Done!')).toBeInTheDocument());

    expect(mocks.searchWithAI).toHaveBeenCalledTimes(1);
    expect(mocks.searchWithAI.mock.calls[0]![0]).toContain('TechCorp Inc');
    expect(mocks.aiJson.mock.calls[0]![0]).toMatchObject({ role: 'thinking', schemaName: 'contact_scoring' });
  });

  it('Email AI generates an introduction email through the AI proxy', async () => {
    mocks.aiJson.mockResolvedValueOnce({ subject: 'Hello John', body: 'Hi John, ...', tone: 'friendly', alternatives: [] });
    renderToolbar();

    await run('Email AI');

    expect(mocks.aiJson.mock.calls[0]![0]).toMatchObject({ schemaName: 'email_generation' });
    expect(mocks.aiJson.mock.calls[0]![0].input).toContain('John Doe');
  });

  it('Insights generates business insights through the AI proxy', async () => {
    mocks.aiJson.mockResolvedValueOnce({
      insights: [{ type: 'opportunity', title: 'Expansion', description: 'Growing team', confidence: 80 }],
    });
    renderToolbar();

    await run('Insights');

    expect(mocks.aiJson.mock.calls[0]![0].input).toContain('opportunity, prediction');
  });

  it('Enrich runs the web enrichment through the contact-enrich function', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      const payload = body.action === 'start'
        ? { responseId: 'resp_1' }
        : { status: 'completed', result: { matched: true, confidence: 70, summary: null, profile: {}, company: {}, recentNews: [], talkingPoints: [], evidence: [], warnings: [] }, citations: [], suggestedUpdates: {}, persisted: false };
      return { ok: true, status: 200, json: async () => payload } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    renderToolbar();

    fireEvent.click(screen.getByText('Enrich'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3500); });
    await waitFor(() => expect(screen.getByText('Done!')).toBeInTheDocument());

    const actions = fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(init.body).action]);
    expect(actions).toEqual([
      ['/.netlify/functions/contact-enrich', 'start'],
      ['/.netlify/functions/contact-enrich', 'status'],
    ]);
    vi.unstubAllGlobals();
  });

  it('alerts the user and recovers when an AI call fails', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mocks.aiJson.mockRejectedValue(new Error('AI proxy down'));
    renderToolbar();

    fireEvent.click(screen.getByText('Lead Score'));

    await waitFor(() => expect(alert).toHaveBeenCalledWith('AI feature failed. Please check your internet connection and try again.'));
    await waitFor(() => expect(screen.getByText('Lead Score')).toBeInTheDocument());
    expect(screen.queryByText('Done!')).not.toBeInTheDocument();
  });

  it('AI Goals opens the external goals app in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderToolbar();

    fireEvent.click(screen.getByText('AI Goals'));

    expect(open).toHaveBeenCalledWith('https://tubular-choux-2a9b3c.netlify.app/', '_blank');
  });
});
