/**
 * Call a dual-mode Netlify function (deal-health-analysis, sales-forecasting, contact-enrich …) over SSE.
 * - Sends `stream:true` + `Accept: text/event-stream`; the function answers with SSE (docs/STREAMING.md) or, when it
 *   short-circuits (validation, "not enough data"), with plain JSON — both are handled and resolve the same way.
 * - Fires onStatus / onPartial / onDelta / onResult while the answer is produced.
 * - With `background: true` in the body, a dropped connection is re-attached (`resume:{responseId,startingAfter}`).
 */
import { supabase } from '../lib/supabase';
import { applyEvent, newOutcome, readSse, type StreamEvent, type StreamHandlers, type StreamOutcome } from '../lib/streaming/streamClient';

export interface LiveFunctionResult<T> {
  /** The function's final payload: the `result` event, or the plain JSON reply. */
  result: T | null;
  outcome: StreamOutcome;
  citations: Array<{ url: string; title?: string }>;
}

const MAX_RESUMES = 6;

export async function authJsonHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to use AI features');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
}

async function once<T>(url: string, headers: Record<string, string>, body: unknown, handlers: StreamHandlers, outcome: StreamOutcome): Promise<T | undefined> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal: handlers.signal ?? null,
  });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !res.body || !/text\/event-stream/i.test(type)) {
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string }).error || `Request failed (${res.status})`);
    return json as T;
  }
  await readSse(res.body, (data, id) => {
    if (data === '[DONE]') return;
    let ev: StreamEvent;
    try { ev = JSON.parse(data) as StreamEvent; } catch { return; }
    if (id !== null && ev.seq === undefined) (ev as { seq?: number }).seq = id;
    applyEvent(ev, handlers, outcome);
  });
  return undefined;
}

export async function streamFunction<T = unknown>(
  url: string,
  body: Record<string, unknown>,
  handlers: StreamHandlers = {}
): Promise<LiveFunctionResult<T>> {
  const headers = await authJsonHeaders();
  const outcome = newOutcome();
  const payload = { ...body, stream: true };

  let plain = await once<T>(url, headers, payload, handlers, outcome);
  let resumes = 0;
  while (plain === undefined && !outcome.done && !outcome.error && outcome.result === undefined && body['background'] === true && outcome.responseId && resumes < MAX_RESUMES && !handlers.signal?.aborted) {
    resumes += 1;
    await new Promise((r) => setTimeout(r, Math.min(500 * resumes, 3000)));
    plain = await once<T>(url, headers, { ...payload, resume: { responseId: outcome.responseId, startingAfter: outcome.lastSeq ?? undefined } }, handlers, outcome);
  }

  if (outcome.error) throw new Error(outcome.error);
  if (plain !== undefined) {
    handlers.onResult?.(plain);
    return { result: plain, outcome, citations: [] };
  }
  const result = (outcome.result ?? outcome.done?.json ?? null) as T | null;
  return { result, outcome, citations: outcome.done?.citations ?? [] };
}
