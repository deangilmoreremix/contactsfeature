import { describe, it, expect, vi } from 'vitest';
import { tee } from '../src/lib/streaming/tee';

describe('tee', () => {
  it('returns the primary handlers untouched when there is no second set', () => {
    const a = { onDelta: vi.fn() };
    expect(tee(a)).toBe(a);
  });

  it('forwards every callback to both handler sets and keeps the primary signal', () => {
    const ac = new AbortController();
    const a = { signal: ac.signal, onDelta: vi.fn(), onStatus: vi.fn(), onPartial: vi.fn(), onResult: vi.fn() };
    const b = { onDelta: vi.fn(), onStatus: vi.fn(), onPartial: vi.fn(), onResult: vi.fn() };
    const t = tee(a, b);
    t.onDelta!('x', 'xy');
    t.onPartial!({ k: 1 });
    t.onResult!({ ok: true });
    expect(a.onDelta).toHaveBeenCalledWith('x', 'xy');
    expect(b.onDelta).toHaveBeenCalledWith('x', 'xy');
    expect(a.onPartial).toHaveBeenCalledWith({ k: 1 });
    expect(b.onResult).toHaveBeenCalledWith({ ok: true });
    expect(t.signal).toBe(ac.signal);
  });

  it('tolerates handlers that only implement some callbacks', () => {
    const t = tee({ onDelta: vi.fn() }, { onStatus: vi.fn() });
    expect(() => { t.onDelta!('a', 'a'); t.onStatus!('s', {} as never); t.onReasoning!('r'); }).not.toThrow();
  });
});
