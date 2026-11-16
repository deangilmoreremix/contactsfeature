/**
 * Browser SSE reader for every streaming AI endpoint (ai-stream and the dual-mode functions).
 * Event contract: docs/STREAMING.md (status | delta | partial | reasoning | image | result | done | error).
 */

export type StreamEvent =
  | { type: 'status'; phase: string; label: string; tool?: string; id?: string; seq?: number }
  | { type: 'delta'; text: string; seq?: number }
  | { type: 'partial'; json: unknown; seq?: number }
  | { type: 'reasoning'; text: string; seq?: number }
  | { type: 'image'; index: number; b64: string; partial: boolean; seq?: number }
  | { type: 'result'; data: unknown; seq?: number }
  | {
      type: 'done';
      id: string | null;
      text: string;
      usage?: { input_tokens?: number; output_tokens?: number } | null;
      citations?: Array<{ url: string; title?: string }>;
      json?: unknown;
      incomplete?: unknown;
      seq?: number;
    }
  | { type: 'error'; message: string; seq?: number };

export interface StreamHandlers {
  onEvent?: (e: StreamEvent) => void;
  onDelta?: (text: string, fullText: string) => void;
  onStatus?: (label: string, e: Extract<StreamEvent, { type: 'status' }>) => void;
  onPartial?: (json: unknown) => void;
  onReasoning?: (text: string) => void;
  onImage?: (e: Extract<StreamEvent, { type: 'image' }>) => void;
  onResult?: (data: unknown) => void;
  signal?: AbortSignal;
}

export interface StreamOutcome {
  text: string;
  done: Extract<StreamEvent, { type: 'done' }> | null;
  result: unknown;
  error: string | null;
  responseId: string | null;
  lastSeq: number | null;
}

/** Parse SSE frames out of a byte stream. Heartbeat comments (": ping") are ignored. */
export async function readSse(body: ReadableStream<Uint8Array>, onFrame: (data: string, id: number | null) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let id: number | null = null;
      const data: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith(':')) continue;
        if (line.startsWith('id:')) {
          const n = Number(line.slice(3).trim());
          id = Number.isFinite(n) ? n : null;
        } else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (data.length) onFrame(data.join('\n'), id);
    }
  }
}

/** Dispatch one parsed event to the handlers and fold it into the running outcome. */
export function applyEvent(e: StreamEvent, h: StreamHandlers, o: StreamOutcome): void {
  h.onEvent?.(e);
  if (typeof e.seq === 'number') o.lastSeq = e.seq;
  switch (e.type) {
    case 'status':
      if (e.id) o.responseId = e.id;
      h.onStatus?.(e.label, e);
      break;
    case 'delta':
      o.text += e.text;
      h.onDelta?.(e.text, o.text);
      break;
    case 'partial':
      h.onPartial?.(e.json);
      break;
    case 'reasoning':
      h.onReasoning?.(e.text);
      break;
    case 'image':
      h.onImage?.(e);
      break;
    case 'result':
      o.result = e.data;
      h.onResult?.(e.data);
      break;
    case 'done':
      o.done = e;
      if (e.id) o.responseId = e.id;
      if (e.text) o.text = e.text;
      break;
    case 'error':
      o.error = e.message;
      break;
  }
}

export function newOutcome(): StreamOutcome {
  return { text: '', done: null, result: undefined, error: null, responseId: null, lastSeq: null };
}

/** POST to a streaming endpoint and feed every event to the handlers. Throws on HTTP errors. */
export async function streamSse(
  url: string,
  init: { headers: Record<string, string>; body: unknown },
  handlers: StreamHandlers = {},
  outcome: StreamOutcome = newOutcome(),
  makeError: (message: string, status: number) => Error = (m) => new Error(m)
): Promise<StreamOutcome> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...init.headers, Accept: 'text/event-stream' },
    body: JSON.stringify(init.body),
    signal: handlers.signal ?? null,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw makeError(body.error || `Stream failed (${res.status})`, res.status);
  }
  await readSse(res.body, (data, id) => {
    if (data === '[DONE]') return;
    let ev: StreamEvent;
    try {
      ev = JSON.parse(data) as StreamEvent;
    } catch {
      return;
    }
    if (id !== null && ev.seq === undefined) (ev as { seq?: number }).seq = id;
    applyEvent(ev, handlers, outcome);
  });
  return outcome;
}
