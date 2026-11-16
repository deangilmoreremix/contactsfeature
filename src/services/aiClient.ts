/**
 * Browser client for the AI proxy (netlify/functions/ai-respond + ai-stream).
 *
 * The OpenAI API key never reaches the browser: every AI call is authenticated with the user's
 * Supabase session, restricted to configured model roles, and rate limited server-side.
 */
import { supabase } from '../lib/supabase';
import { newOutcome, streamSse, type StreamHandlers } from '../lib/streaming/streamClient';

export type AIRole = 'default' | 'thinking' | 'fast' | 'pro';
export type AIEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high';

export interface AIWebSearchTool {
  type: 'web_search';
  search_context_size?: 'low' | 'medium' | 'high';
  user_location?: Record<string, string>;
  filters?: { allowed_domains: string[] };
}
export interface AIFileSearchTool { type: 'file_search' }

export interface AIRequest {
  /** Model role: default (balanced), thinking (deep reasoning), fast (UI helpers), pro (heavy analytics). */
  role?: AIRole;
  effort?: AIEffort;
  instructions?: string;
  input: string | Array<{ role: 'user' | 'assistant'; content: string }>;
  /** JSON Schema => Structured Outputs; the parsed object is returned as `json`. */
  schema?: Record<string, unknown>;
  schemaName?: string;
  tools?: Array<AIWebSearchTool | AIFileSearchTool>;
  toolChoice?: 'required';
  maxOutputTokens?: number;
  /** Chain onto a previous response (multi-turn). */
  previousResponseId?: string;
  /** Server-side OpenAI conversation id (`conv_...`); takes precedence over previousResponseId. */
  conversationId?: string;
  store?: boolean;
}

export interface AICitation { url: string; title?: string }

export interface AIResponse<T = unknown> {
  id: string;
  text: string;
  json: T | null;
  citations: AICitation[];
  usage: { input_tokens?: number; output_tokens?: number } | null;
}

export class AIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AIError';
    this.status = status;
    // Surface every AI failure to the user (see AIErrorToaster) so buttons never fail silently.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartcrm:ai-error', { detail: { message, status } }));
    }
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new AIError('Please sign in to use AI features', 401);
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
}

/** One-shot request. Resolves with text (and parsed `json` when a schema was given). */
export async function aiRespond<T = unknown>(req: AIRequest): Promise<AIResponse<T>> {
  const res = await fetch('/.netlify/functions/ai-respond', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify(req),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new AIError(body.error || `AI request failed (${res.status})`, res.status);
  return body as AIResponse<T>;
}

export interface AIStreamHandlers extends StreamHandlers {
  /** Legacy shorthand: called with each text chunk. */
  onDelta?: (text: string, fullText: string) => void;
  /** Keep the run alive past the serverless time limit and resume if the connection drops. */
  background?: boolean;
  /** Ask for reasoning-summary events (shown as an optional "Thinking" panel). */
  reasoningSummary?: boolean;
}

const MAX_RESUMES = 6;

/**
 * Streaming request (SSE). Fires status / delta / partial-JSON / reasoning / image callbacks while the
 * answer is produced and resolves with the final text (+ parsed `json` for structured output).
 * With `background: true` the run survives Netlify's function time limit: if the connection ends
 * before `done`, the stream is re-attached with `starting_after` (up to 6 times).
 */
export async function aiStream(req: AIRequest, handlers: AIStreamHandlers = {}): Promise<AIResponse> {
  const headers = await authHeader();
  const outcome = newOutcome();
  const makeError = (m: string, status: number) => new AIError(m, status);
  const payload: Record<string, unknown> = { ...req, ...(handlers.background ? { background: true } : {}), ...(handlers.reasoningSummary ? { reasoningSummary: true } : {}) };

  await streamSse('/.netlify/functions/ai-stream', { headers, body: payload }, handlers, outcome, makeError);

  let resumes = 0;
  while (!outcome.done && !outcome.error && handlers.background && outcome.responseId && resumes < MAX_RESUMES && !handlers.signal?.aborted) {
    resumes += 1;
    await new Promise((r) => setTimeout(r, Math.min(500 * resumes, 3000)));
    await streamSse(
      '/.netlify/functions/ai-stream',
      { headers, body: { ...payload, resume: { responseId: outcome.responseId, startingAfter: outcome.lastSeq ?? undefined } } },
      handlers,
      outcome,
      makeError
    );
  }

  if (outcome.error) throw new AIError(outcome.error, 502);
  const d = outcome.done;
  return {
    id: d?.id ?? outcome.responseId ?? '',
    text: d?.text ?? outcome.text,
    json: (d?.json as AIResponse['json']) ?? null,
    citations: d?.citations ?? [],
    usage: d?.usage ?? null,
  };
}

/**
 * Ask for JSON matching `schema` and get the typed object back.
 * Pass stream handlers (onPartial / onStatus / onDelta …) to watch the object fill in live — the call then
 * runs over the streaming endpoint. Without handlers it is a plain request (for non-visible pipelines).
 */
export async function aiJson<T>(
  req: Omit<AIRequest, 'schema'> & { schema: Record<string, unknown> },
  handlers?: AIStreamHandlers
): Promise<T> {
  const live = handlers && Object.keys(handlers).some((k) => k !== 'signal' && handlers[k as keyof AIStreamHandlers] !== undefined);
  const r = live || handlers?.signal ? await aiStream(req, handlers) : await aiRespond<T>(req);
  if (r.json == null) {
    // Fallback: some models return the JSON only as text
    try {
      return JSON.parse(r.text) as T;
    } catch {
      throw new AIError('AI did not return valid JSON', 502);
    }
  }
  return r.json as T;
}
