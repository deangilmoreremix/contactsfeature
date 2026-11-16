/**
 * useAIStream — one hook for every live AI output (replaces useStreamingAI).
 *
 *   const s = useAIStream<Result>();
 *   await s.run({ role: 'default', input, schema });                    // ai-stream proxy
 *   await s.runFunction('/.netlify/functions/cold-email-sdr', { contactId });  // dual-mode function
 *   s.state.text / s.state.partial / s.state.label / s.state.result …  → render with <StreamingOutput />
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { aiStream, type AIRequest, type AIResponse } from '../services/aiClient';
import { newOutcome, streamSse, type StreamEvent } from '../lib/streaming/streamClient';
import { sdrAuthHeaders } from '../services/sdrClient';

export interface AIStreamState<R = unknown> {
  status: 'idle' | 'streaming' | 'done' | 'error';
  text: string;
  /** Structured output being filled in (partial JSON). */
  partial: unknown;
  /** Current activity label, e.g. "Searching the web…". */
  label: string;
  /** Activity history (deduplicated), newest last. */
  steps: string[];
  reasoning: string;
  /** Final structured payload (`result` event or parsed JSON). */
  result: R | null;
  images: Array<{ index: number; b64: string; partial: boolean }>;
  citations: Array<{ url: string; title?: string }>;
  error: string | null;
}

const initial = <R,>(): AIStreamState<R> => ({
  status: 'idle', text: '', partial: undefined, label: '', steps: [], reasoning: '', result: null, images: [], citations: [], error: null,
});

export function useAIStream<R = unknown>() {
  const [state, setState] = useState<AIStreamState<R>>(initial<R>());
  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; abortRef.current?.abort(); }, []);

  const patch = useCallback((p: Partial<AIStreamState<R>> | ((s: AIStreamState<R>) => Partial<AIStreamState<R>>)) => {
    if (!mounted.current) return;
    setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }));
  }, []);

  const begin = useCallback(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    patch({ ...initial<R>(), status: 'streaming', label: 'Starting…' });
    return ac;
  }, [patch]);

  const handlers = useCallback((signal: AbortSignal) => ({
    signal,
    onStatus: (label: string) => patch((s) => ({ label, steps: s.steps[s.steps.length - 1] === label ? s.steps : [...s.steps, label] })),
    onDelta: (_t: string, full: string) => patch({ text: full, label: '' }),
    onPartial: (json: unknown) => patch({ partial: json }),
    onReasoning: (t: string) => patch((s) => ({ reasoning: s.reasoning + t })),
    onImage: (e: Extract<StreamEvent, { type: 'image' }>) =>
      patch((s) => ({ images: [...s.images.filter((i) => i.index !== e.index), { index: e.index, b64: e.b64, partial: e.partial }] })),
    onResult: (data: unknown) => patch({ result: data as R }),
  }), [patch]);

  /** Stream through the ai-stream proxy. */
  const run = useCallback(async (req: AIRequest, opts: { background?: boolean; reasoningSummary?: boolean } = {}): Promise<AIResponse | null> => {
    const ac = begin();
    try {
      const r = await aiStream(req, { ...handlers(ac.signal), ...opts });
      patch((s) => ({ status: 'done', text: r.text, label: '', citations: r.citations, result: (s.result ?? (r.json as R | null)) }));
      return r;
    } catch (e) {
      if (ac.signal.aborted) { patch({ status: 'idle', label: '' }); return null; }
      patch({ status: 'error', error: e instanceof Error ? e.message : 'AI request failed', label: '' });
      return null;
    }
  }, [begin, handlers, patch]);

  /** Stream from a dual-mode Netlify function (it emits a final `result` event). */
  const runFunction = useCallback(async (url: string, body: Record<string, unknown>): Promise<R | null> => {
    const ac = begin();
    try {
      const outcome = await streamSse(url, { headers: await sdrAuthHeaders(), body: { ...body, stream: true } }, handlers(ac.signal), newOutcome());
      if (outcome.error) throw new Error(outcome.error);
      const result = (outcome.result ?? outcome.done?.json ?? null) as R | null;
      patch({ status: 'done', text: outcome.text, label: '', result, citations: outcome.done?.citations ?? [] });
      return result;
    } catch (e) {
      if (ac.signal.aborted) { patch({ status: 'idle', label: '' }); return null; }
      patch({ status: 'error', error: e instanceof Error ? e.message : 'Request failed', label: '' });
      return null;
    }
  }, [begin, handlers, patch]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => { abortRef.current?.abort(); patch(initial<R>()); }, [patch]);

  return { state, run, runFunction, stop, reset, isStreaming: state.status === 'streaming' };
}
