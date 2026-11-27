/**
 * OpenAI Batch API runs (bulk enrichment / semantic-search indexing) via the ai-batch-* functions.
 * Batches finish within 24h at half the cost; a scheduled function applies the results.
 */
import { sdrAuthHeaders } from './sdrClient';

export type AiBatchKind = 'enrich' | 'embed';

export interface AiBatchRun {
  id: string;
  kind: AiBatchKind;
  status: string;
  total: number;
  completed: number;
  failed: number;
  error?: string | null;
  applied_at?: string | null;
  created_at: string;
}

async function call<T>(fn: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/.netlify/functions/${fn}`, { method: 'POST', headers: await sdrAuthHeaders(), body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

export const aiBatchService = {
  submit: (kind: AiBatchKind, contactIds: string[]) =>
    call<{ batch: AiBatchRun; skipped: Array<{ id: string; reason: string }> }>('ai-batch-submit', { kind, contactIds }),
  list: () => call<{ batches: AiBatchRun[] }>('ai-batch-status').then((r) => r.batches),
};
