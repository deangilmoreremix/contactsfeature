/**
 * Live calls to dual-mode functions (docs/STREAMING.md): Supabase Edge Functions by name or any URL.
 * The function answers with SSE when the body has `stream:true`; if it still answers with plain JSON
 * (older deploy) the JSON is returned as the final result, so callers behave identically either way.
 */
import { supabase } from '../lib/supabase';
import { applyEvent, newOutcome, readSse, type StreamEvent, type StreamHandlers } from '../lib/streaming/streamClient';

export function functionUrl(target: string): string {
  if (target.startsWith('/') || /^https?:\/\//.test(target)) return target;
  const base = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  return `${base}/functions/v1/${target}`;
}

async function headersFor(target: string): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to use this feature');
  const h: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
  if (!target.startsWith('/') && !/^https?:\/\//.test(target)) {
    h['X-Client-Info'] = 'supabase-js-web';
    const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    if (key) h['apikey'] = key;
  }
  return h;
}

export interface FunctionStreamResult<R> { result: R | null; text: string; citations: Array<{ url: string; title?: string }> }

export async function streamFunction<R = unknown>(target: string, body: Record<string, unknown>, handlers: StreamHandlers = {}): Promise<FunctionStreamResult<R>> {
  const res = await fetch(functionUrl(target), {
    method: 'POST',
    headers: { ...(await headersFor(target)), Accept: 'text/event-stream' },
    body: JSON.stringify({ ...body, stream: true }),
    signal: handlers.signal ?? null,
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || b.details || b.message || `Request failed (${res.status})`);
  }
  if (!ct.includes('text/event-stream') || !res.body) {
    const json = (await res.json().catch(() => null)) as R | null;
    if (json != null) handlers.onResult?.(json);
    return { result: json, text: '', citations: [] };
  }
  const outcome = newOutcome();
  await readSse(res.body, (data, id) => {
    if (data === '[DONE]') return;
    let ev: StreamEvent;
    try { ev = JSON.parse(data) as StreamEvent; } catch { return; }
    if (id !== null && ev.seq === undefined) (ev as { seq?: number }).seq = id;
    applyEvent(ev, handlers, outcome);
  });
  if (outcome.error) throw new Error(outcome.error);
  return { result: ((outcome.result ?? outcome.done?.json ?? null) as R | null), text: outcome.text, citations: outcome.done?.citations ?? [] };
}
