import type { StreamHandlers } from './streamClient';

/** Forward every stream callback to both the hook's own live state and the caller's handlers. */
export function tee(a: StreamHandlers, b?: StreamHandlers): StreamHandlers {
  if (!b) return a;
  return {
    signal: a.signal,
    onEvent: (e) => { a.onEvent?.(e); b.onEvent?.(e); },
    onDelta: (t, f) => { a.onDelta?.(t, f); b.onDelta?.(t, f); },
    onStatus: (l, e) => { a.onStatus?.(l, e); b.onStatus?.(l, e); },
    onPartial: (j) => { a.onPartial?.(j); b.onPartial?.(j); },
    onReasoning: (t) => { a.onReasoning?.(t); b.onReasoning?.(t); },
    onImage: (e) => { a.onImage?.(e); b.onImage?.(e); },
    onResult: (d) => { a.onResult?.(d); b.onResult?.(d); },
  };
}
