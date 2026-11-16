/**
 * Contact enrichment using OpenAI Responses `web_search` (via the contact-enrich Netlify function).
 * Finds public professional information, returns cited findings, and fills ONLY empty contact
 * fields (never overwrites user-entered data).
 */
import { supabase } from '../lib/supabase';
import { logger } from './logger.service';
import type { Contact } from '../types/contact';
import { streamFunction } from './liveFunction';

export interface EnrichmentCitation { url: string; title: string }

export interface EnrichmentResult {
  matched: boolean;
  confidence: number;
  summary: string | null;
  profile: Record<string, string | null>;
  company: Record<string, string | null>;
  recentNews: Array<{ headline: string; url: string; date: string | null }>;
  talkingPoints: string[];
  evidence: Array<{ field: string; value: string; sourceUrl: string }>;
  warnings: string[];
}

export interface EnrichmentOutcome {
  result: EnrichmentResult;
  citations: EnrichmentCitation[];
  suggestedUpdates: Partial<Contact>;
  appliedFields: string[];
  persisted: boolean;
}

export type EnrichmentProgress = (status: 'starting' | 'searching' | 'applying') => void;

/** Live callbacks: the run streams ("Searching the web…" status, findings filling in), then fills empty fields. */
export interface EnrichmentLive {
  onStatus?: (label: string) => void;
  /** Structured findings so far (partial JSON of EnrichmentResult). */
  onPartial?: (partial: unknown) => void;
}

const FN = '/.netlify/functions/contact-enrich';
const POLL_MS = 3000;
const MAX_WAIT_MS = 4 * 60 * 1000;

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to enrich contacts');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
}

async function call(body: Record<string, unknown>): Promise<any> {
  const res = await fetch(FN, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Enrichment request failed (${res.status})`);
  return json;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Completed {
  result: EnrichmentResult;
  citations: EnrichmentCitation[];
  suggestedUpdates: Partial<Contact>;
  persisted: boolean;
}

const startBody = (contact: Contact): Record<string, unknown> =>
  UUID.test(contact.id)
    ? { action: 'start', contactId: contact.id }
    : { action: 'start', contact: { name: contact.name, firstName: contact.firstName, lastName: contact.lastName, email: contact.email, company: contact.company, title: contact.title, industry: contact.industry, socialProfiles: contact.socialProfiles } };

const currentFields = (contact: Contact) => ({ title: contact.title, company: contact.company, industry: contact.industry, phone: contact.phone, socialProfiles: contact.socialProfiles });

/** Legacy path: poll `status` until the background run finishes (also the fallback when a stream is cut off). */
async function pollUntilDone(responseId: string, contact: Contact, signal?: AbortSignal): Promise<Completed> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Enrichment cancelled');
    await new Promise((r) => setTimeout(r, POLL_MS));
    const status = await call({ action: 'status', responseId, contact: currentFields(contact) });
    if (status.status === 'failed') throw new Error(status.error || 'Enrichment failed');
    if (status.status !== 'completed') continue;
    return status as Completed;
  }
  throw new Error('Enrichment timed out. Try again in a moment.');
}

/**
 * Stream the research run (background + SSE via contact-enrich). Resolves with the completed payload; if the
 * connection is lost for good it keeps polling the same run so no work is lost.
 */
async function runStreamed(contact: Contact, live: EnrichmentLive, signal?: AbortSignal): Promise<Completed> {
  let responseId: string | null = null;
  try {
    const { result } = await streamFunction<Completed & { status?: string }>(FN, { ...startBody(contact), background: true }, {
      ...(signal ? { signal } : {}),
      onStatus: (label, e) => { if (e.id) responseId = e.id; live.onStatus?.(label); },
      onPartial: (json) => live.onPartial?.(json),
    });
    if (!result || result.status === 'failed') throw new Error('Enrichment failed');
    return result;
  } catch (error) {
    if (signal?.aborted) throw new Error('Enrichment cancelled');
    if (responseId) {
      live.onStatus?.('Reconnecting…');
      return pollUntilDone(responseId, contact, signal);
    }
    throw error;
  }
}

export async function enrichContactWithWebSearch(
  contact: Contact,
  opts: { apply?: boolean; onProgress?: EnrichmentProgress; signal?: AbortSignal; live?: EnrichmentLive } = {}
): Promise<EnrichmentOutcome> {
  const { apply = true, onProgress, signal, live } = opts;
  onProgress?.('starting');

  let done: Completed;
  if (live) {
    onProgress?.('searching');
    done = await runStreamed(contact, live, signal);
  } else {
    // No live UI attached: start the background run and poll (same server bookkeeping).
    const start = await call(startBody(contact));
    onProgress?.('searching');
    done = await pollUntilDone(start.responseId, contact, signal);
  }

  const suggestedUpdates = (done.suggestedUpdates || {}) as Partial<Contact>;
  let appliedFields: string[] = [];
  if (apply && Object.keys(suggestedUpdates).length > 0) {
    onProgress?.('applying');
    appliedFields = await applyUpdates(contact, suggestedUpdates, done.result);
  }
  return {
    result: done.result,
    citations: (done.citations || []) as EnrichmentCitation[],
    suggestedUpdates,
    appliedFields,
    persisted: !!done.persisted,
  };
}

async function applyUpdates(contact: Contact, updates: Partial<Contact>, result: EnrichmentResult): Promise<string[]> {
  try {
    // Dynamic import avoids a services <-> store import cycle.
    const { useContactStore } = await import('../hooks/useContactStore');
    const fresh = useContactStore.getState().contacts.find((c) => c.id === contact.id) ?? contact;
    // Re-check emptiness against the latest copy so a concurrent edit is never clobbered.
    const safe: Partial<Contact> = {};
    for (const [key, value] of Object.entries(updates) as Array<[keyof Contact, unknown]>) {
      if (key === 'socialProfiles') safe.socialProfiles = { ...(value as object), ...(fresh.socialProfiles ?? {}) } as NonNullable<Contact['socialProfiles']>;
      else if (!fresh[key]) (safe as Record<string, unknown>)[key as string] = value;
    }
    if (!Object.keys(safe).length) return [];
    await useContactStore.getState().updateContact(contact.id, safe);
    void recordTimeline(contact.id, safe, result);
    return Object.keys(safe);
  } catch (error) {
    logger.error('Failed to apply enrichment to contact', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

async function recordTimeline(contactId: string, applied: Partial<Contact>, result: EnrichmentResult): Promise<void> {
  if (!UUID.test(contactId)) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('contact_timeline').insert({
      user_id: user.id,
      contact_id: contactId,
      activity_type: 'ai_analysis',
      description: `Web enrichment added: ${Object.keys(applied).join(', ')} (confidence ${result.confidence}%)`,
      metadata: { source: 'web_search', confidence: result.confidence },
      user_name: 'AI Enrichment',
    } as never);
  } catch (error) {
    logger.warn('Could not record enrichment timeline entry', { error });
  }
}
