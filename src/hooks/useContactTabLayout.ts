import { useEffect } from 'react';
import { create } from 'zustand';
import { contactTabs } from '../constants/contactConstants';
import {
  defaultTabLayout, normalizeTabLayout, resolveOrderedTabs, resolveVisibleTabs, tabLayoutReducer,
  type TabLayout, type TabLayoutAction,
} from '../lib/tabs/tabLayout';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const KEY_PREFIX = 'smartcrm.contactTabLayout.v1';
const allIds = () => contactTabs.map((t) => t.id);

const storageKey = (userId: string) => `${KEY_PREFIX}.${userId}`;

function read(userId: string): TabLayout {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return normalizeTabLayout(JSON.parse(raw), allIds());
  } catch { /* storage unavailable or corrupt: use defaults */ }
  return defaultTabLayout(allIds());
}

function write(userId: string, layout: TabLayout) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(layout)); } catch { /* ignore */ }
}

interface TabLayoutStore {
  userId: string;
  layout: TabLayout;
  setUser: (userId: string) => void;
  dispatch: (action: TabLayoutAction) => void;
}

const useTabLayoutStore = create<TabLayoutStore>((set, get) => ({
  userId: 'anon',
  layout: read('anon'),
  setUser: (userId) => {
    if (userId !== get().userId) set({ userId, layout: read(userId) });
  },
  dispatch: (action) => {
    const next = tabLayoutReducer(get().layout, action, allIds());
    write(get().userId, next);
    set({ layout: next });
  },
}));

/**
 * Per-user tab layout for the contact detail view (stored in localStorage, keyed by the signed-in
 * user id). `visibleTabs` feeds the tab bar; `orderedTabs` (incl. hidden ones) feeds the customize popover.
 */
export function useContactTabLayout() {
  const layout = useTabLayoutStore((s) => s.layout);
  const dispatch = useTabLayoutStore((s) => s.dispatch);
  const setUser = useTabLayoutStore((s) => s.setUser);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!cancelled && uid) setUser(uid);
    }).catch(() => { /* stay on the anonymous layout */ });
    return () => { cancelled = true; };
  }, [setUser]);

  return {
    layout,
    visibleTabs: resolveVisibleTabs(contactTabs, layout),
    orderedTabs: resolveOrderedTabs(contactTabs, layout),
    hiddenIds: layout.hidden,
    toggleTab: (id: string) => dispatch({ type: 'toggle', id }),
    moveTab: (id: string, direction: -1 | 1) => dispatch({ type: 'move', id, direction }),
    resetTabs: () => dispatch({ type: 'reset' }),
  };
}
