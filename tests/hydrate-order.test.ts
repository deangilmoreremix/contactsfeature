// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useContactStore } from '../src/hooks/useContactStore';

beforeEach(() => localStorage.clear());

describe('saved row order (demo mode)', () => {
  it('reorderContacts stores positions and hydrateContacts re-applies them', async () => {
    const [a, b] = useContactStore.getState().contacts;
    await useContactStore.getState().reorderContacts([
      { id: a!.id, updates: { position: 5 } },
      { id: b!.id, updates: { position: 1 } },
    ]);
    // simulate a fresh page load: positions cleared in memory, saved copy remains
    useContactStore.setState((s) => ({ contacts: s.contacts.map((c) => ({ ...c, position: undefined as never })) }));
    await useContactStore.getState().hydrateContacts();
    const after = useContactStore.getState().contacts;
    expect(after.find((c) => c.id === a!.id)!.position).toBe(5);
    expect(after.find((c) => c.id === b!.id)!.position).toBe(1);
  });
});
