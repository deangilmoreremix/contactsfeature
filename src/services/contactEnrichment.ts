/**
 * Contact enrichment using OpenAI Responses `web_search` (via the contact-enrich Netlify function).
 * Finds public professional information, returns cited findings, and fills ONLY empty contact
 * fields (never overwrites user-entered data).
 */
import { supabase } from '../lib/supabase';
import { logger } from './logger.service';
import type { Contact } from '../types/contact';

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

export async function enrichContactWithWebSearch(
  contact: Contact,
  opts: { apply?: boolean; onProgress?: EnrichmentProgress; signal?: AbortSignal } = {}
): Promise<EnrichmentOutcome> {
  const { apply = true, onProgress, signal } = opts;
  onProgress?.('starting');

  const start = await call(
    UUID.test(contact.id)
      ? { action: 'start', contactId: contact.id }
      : { action: 'start', contact: { name: contact.name, firstName: contact.firstName, lastName: contact.lastName, email: contact.email, company: contact.company, title: contact.title, industry: contact.industry, socialProfiles: contact.socialProfiles } }
  );

  onProgress?.('searching');
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Enrichment cancelled');
    await new Promise((r) => setTimeout(r, POLL_MS));
    const status = await call({ action: 'status', responseId: start.responseId, contact: { title: contact.title, company: contact.company, industry: contact.industry, phone: contact.phone, socialProfiles: contact.socialProfiles } });
    if (status.status === 'failed') throw new Error(status.error || 'Enrichment failed');
    if (status.status !== 'completed') continue;

    const suggestedUpdates = (status.suggestedUpdates || {}) as Partial<Contact>;
    let appliedFields: string[] = [];
    if (apply && Object.keys(suggestedUpdates).length > 0) {
      onProgress?.('applying');
      appliedFields = await applyUpdates(contact, suggestedUpdates, status.result as EnrichmentResult);
    }
    return {
      result: status.result as EnrichmentResult,
      citations: (status.citations || []) as EnrichmentCitation[],
      suggestedUpdates,
      appliedFields,
      persisted: !!status.persisted,
    };
  }
  throw new Error('Enrichment timed out. Try again in a moment.');
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
