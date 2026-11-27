import React, { StrictMode } from 'react';
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLiveCall } from '../hooks/useLiveCall';

// StrictMode runs effect -> cleanup -> effect on mount; state updates must still land afterwards.
describe('mounted ref survives StrictMode remount', () => {
  it('useLiveCall applies updates after the simulated remount', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <StrictMode>{children}</StrictMode>;
    const { result } = renderHook(() => useLiveCall(), { wrapper });
    let release!: () => void;
    let pending: Promise<unknown>;
    act(() => {
      pending = result.current.run(() => new Promise<void>((r) => { release = r; }));
    });
    expect(result.current.state.active).toBe(true);
    await act(async () => { release(); await pending; });
    expect(result.current.state.active).toBe(false);
  });
});
