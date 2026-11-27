/**
 * useLiveCall — live progress for any service call that accepts `LiveOptions` (see services/liveOptions.ts).
 *
 *   const live = useLiveCall();
 *   const rules = await live.run((opts) => generateAutomationSuggestions(input, opts));
 *   live.state.partial   // structured output so far (partial JSON) -> render list items as they arrive
 *   <LiveRunStatus live={live} />   // status chip ("Searching the web…") + Stop
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveOptions } from '../services/liveOptions';

export interface LiveCallState {
  active: boolean;
  label: string;
  steps: string[];
  /** Structured output so far (tolerant partial JSON), undefined until the first field arrives. */
  partial: unknown;
  /** Text streamed so far (text-only calls). */
  text: string;
}

const idle: LiveCallState = { active: false, label: '', steps: [], partial: undefined, text: '' };

export function useLiveCall() {
  const [state, setState] = useState<LiveCallState>(idle);
  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; abortRef.current?.abort(); };
  }, []);

  const patch = useCallback((p: Partial<LiveCallState> | ((s: LiveCallState) => Partial<LiveCallState>)) => {
    if (!mounted.current) return;
    setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }));
  }, []);

  const options = useCallback((signal: AbortSignal): LiveOptions => ({
    signal,
    onStatus: (label) => patch((s) => ({ label, steps: s.steps[s.steps.length - 1] === label ? s.steps : [...s.steps, label] })),
    onPartial: (partial) => patch({ partial }),
    onDelta: (_t, full) => patch({ text: full, label: '' }),
  }), [patch]);

  /** Run `fn` with live callbacks. Resolves undefined when the user pressed Stop; other errors are re-thrown. */
  const run = useCallback(async <T,>(fn: (live: LiveOptions) => Promise<T>): Promise<T | undefined> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    patch({ ...idle, active: true, label: 'Starting…' });
    try {
      return await fn(options(ac.signal));
    } catch (e) {
      if (ac.signal.aborted) return undefined;
      throw e;
    } finally {
      if (abortRef.current === ac) { abortRef.current = null; patch({ active: false, label: '' }); }
    }
  }, [options, patch]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  return { state, run, stop };
}

export type LiveCall = ReturnType<typeof useLiveCall>;
