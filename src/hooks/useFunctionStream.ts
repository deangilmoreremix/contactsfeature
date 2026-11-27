/**
 * useFunctionStream — live state for dual-mode functions (Supabase Edge by name, or a Netlify URL).
 * Same state shape as useAIStream so <StreamingOutput/> works unchanged.
 *   const s = useFunctionStream<Result>();
 *   const data = await s.run('email-composer', { contact, purpose });   // null when stopped / failed
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { streamFunction } from '../services/functionStream';
import type { StreamHandlers } from '../lib/streaming/streamClient';
import type { AIStreamState } from './useAIStream';

const initial = <R,>(): AIStreamState<R> => ({
  status: 'idle', text: '', partial: undefined, label: '', steps: [], reasoning: '', result: null, images: [], citations: [], error: null,
});

export function useFunctionStream<R = unknown>() {
  const [state, setState] = useState<AIStreamState<R>>(initial<R>());
  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; abortRef.current?.abort(); };
  }, []);
  const patch = useCallback((p: Partial<AIStreamState<R>> | ((s: AIStreamState<R>) => Partial<AIStreamState<R>>)) => {
    if (mounted.current) setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }));
  }, []);

  /**
   * Track any live call. `task` receives stream handlers to pass straight into a service / aiStream / aiJson
   * (`(h) => someService(args, h)`); resolves with the task's value, or null when stopped / failed.
   */
  const runLive = useCallback(async <T,>(task: (h: StreamHandlers) => Promise<T>, opts: { keepResult?: boolean } = {}): Promise<T | null> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    patch({ ...initial<R>(), status: 'streaming', label: 'Starting…' });
    try {
      const value = await task({
        signal: ac.signal,
        onStatus: (label) => patch((s) => ({ label, steps: s.steps[s.steps.length - 1] === label ? s.steps : [...s.steps, label] })),
        onDelta: (_t, full) => patch({ text: full, label: '' }),
        onPartial: (json) => patch({ partial: json }),
        onReasoning: (t) => patch((s) => ({ reasoning: s.reasoning + t })),
        onResult: (data) => patch({ result: data as R }),
      });
      patch((s) => ({ status: 'done', label: '', result: opts.keepResult ? s.result : ((value as unknown as R) ?? s.result) }));
      return value;
    } catch (e) {
      if (ac.signal.aborted) { patch({ status: 'idle', label: '' }); return null; }
      patch({ status: 'error', error: e instanceof Error ? e.message : 'Request failed', label: '' });
      return null;
    }
  }, [patch]);

  /**
   * Manual form of runLive for long imperative handlers: `const t = start(); … service(args, t.h); t.finish(value)`;
   * on error call `t.fail(err)` (a Stop is detected via `t.h.signal.aborted` and reported as idle).
   */
  const start = useCallback(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    patch({ ...initial<R>(), status: 'streaming', label: 'Starting…' });
    const h: StreamHandlers = {
      signal: ac.signal,
      onStatus: (label) => patch((s) => ({ label, steps: s.steps[s.steps.length - 1] === label ? s.steps : [...s.steps, label] })),
      onDelta: (_t, full) => patch({ text: full, label: '' }),
      onPartial: (json) => patch({ partial: json }),
      onReasoning: (t) => patch((s) => ({ reasoning: s.reasoning + t })),
    };
    return {
      h,
      finish: (value?: R) => patch((s) => ({ status: 'done', label: '', result: value ?? s.result })),
      fail: (e: unknown) => (ac.signal.aborted
        ? patch({ status: 'idle', label: '' })
        : patch({ status: 'error', error: e instanceof Error ? e.message : 'Request failed', label: '' })),
    };
  }, [patch]);

  /** Stream a dual-mode function (Supabase Edge by name or a URL). */
  const run = useCallback(async (target: string, body: Record<string, unknown>): Promise<R | null> => {
    const r = await runLive((h) => streamFunction<R>(target, body, h), { keepResult: true });
    if (!r) return null;
    patch((s) => ({ text: r.text || s.text, citations: r.citations, result: r.result ?? s.result }));
    return r.result;
  }, [runLive, patch]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => { abortRef.current?.abort(); patch(initial<R>()); }, [patch]);
  return { state, run, runLive, start, stop, reset, isStreaming: state.status === 'streaming' };
}
