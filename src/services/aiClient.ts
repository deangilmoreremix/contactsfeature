/**
 * Browser client for the AI proxy (netlify/functions/ai-respond + ai-stream).
 *
 * The OpenAI API key never reaches the browser: every AI call is authenticated with the user's
 * Supabase session, restricted to configured model roles, and rate limited server-side.
 */
import { supabase } from '../lib/supabase';

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

export interface AIStreamHandlers {
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
}

/** Streaming request (SSE). Resolves with the final text once the stream completes. */
export async function aiStream(req: AIRequest, handlers: AIStreamHandlers = {}): Promise<AIResponse> {
  const res = await fetch('/.netlify/functions/ai-stream', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify(req),
    signal: handlers.signal ?? null,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new AIError(body.error || `AI stream failed (${res.status})`, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let final: AIResponse | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!frame.startsWith('data:')) continue;
      const payload = frame.slice(5).trim();
      if (payload === '[DONE]') continue;
      let ev: { type: string; text?: string; id?: string; message?: string; citations?: AICitation[]; usage?: AIResponse['usage'] };
      try { ev = JSON.parse(payload); } catch { continue; }
      if (ev.type === 'delta' && ev.text) {
        full += ev.text;
        handlers.onDelta?.(ev.text);
      } else if (ev.type === 'done') {
        final = { id: ev.id ?? '', text: ev.text ?? full, json: null, citations: ev.citations ?? [], usage: ev.usage ?? null };
      } else if (ev.type === 'error') {
        throw new AIError(ev.message || 'AI stream error', 502);
      }
    }
  }
  return final ?? { id: '', text: full, json: null, citations: [], usage: null };
}

/** Convenience: ask for JSON matching `schema` and get the typed object back. */
export async function aiJson<T>(req: Omit<AIRequest, 'schema'> & { schema: Record<string, unknown> }): Promise<T> {
  const r = await aiRespond<T>(req);
  if (r.json == null) throw new AIError('AI did not return valid JSON', 502);
  return r.json;
}
