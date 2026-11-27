// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pushUndo, runUndo, dismissUndo, currentUndo, subscribeUndo, resetUndo } from '../src/lib/undo/undoStack';

beforeEach(() => resetUndo());

describe('undo stack', () => {
  it('runs the newest entry first and removes it', async () => {
    const a = vi.fn(); const b = vi.fn();
    pushUndo('a', a); pushUndo('b', b);
    expect(currentUndo()?.label).toBe('b');
    expect(await runUndo()).toBe(true);
    expect(b).toHaveBeenCalledOnce(); expect(a).not.toHaveBeenCalled();
    expect(currentUndo()?.label).toBe('a');
  });
  it('returns false when empty and dismiss does not run', async () => {
    expect(await runUndo()).toBe(false);
    const f = vi.fn(); const e = pushUndo('x', f);
    dismissUndo(e.id);
    expect(f).not.toHaveBeenCalled(); expect(currentUndo()).toBeNull();
  });
  it('notifies subscribers and caps the stack at 20', () => {
    const seen: (string | null)[] = [];
    const off = subscribeUndo((e) => seen.push(e?.label ?? null));
    for (let i = 0; i < 25; i++) pushUndo(`e${i}`, () => {});
    off();
    expect(seen[0]).toBeNull(); expect(seen.at(-1)).toBe('e24');
    let n = 0; while (currentUndo()) { dismissUndo(currentUndo()!.id); n++; }
    expect(n).toBe(20);
  });
  it('propagates a failing undo to the caller after removing the entry', async () => {
    pushUndo('bad', () => { throw new Error('boom'); });
    await expect(runUndo()).rejects.toThrow('boom');
    expect(currentUndo()).toBeNull();
  });
});
