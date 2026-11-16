import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { applyRowChange, type RealtimeEventType } from '../lib/realtimeApply';

/** A row of the `deals` table (see migrations 20251212145131 + 20260401001200). */
export interface DealRow {
  id: string;
  user_id: string | null;
  contact_id: string | null;
  title: string | null;
  stage: string | null;
  value: number | string | null;
  risk_score: number | null;
  objection_level: number | null;
  stage_stagnation: number | null;
  days_since_reply: number | null;
  expected_close_date: string | null;
  closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DealStore {
  deals: DealRow[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  userId: string | null;
  fetchDeals: () => Promise<void>;
  applyRealtime: (eventType: RealtimeEventType, newRow: Partial<DealRow> | null, oldRow: Partial<DealRow> | null) => void;
  reset: () => void;
}

export const useDealStore = create<DealStore>((set, get) => ({
  deals: [],
  loaded: false,
  loading: false,
  error: null,
  userId: null,

  fetchDeals: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        set({ deals: [], loaded: true, loading: false, userId: null, error: 'Sign in to see your deals.' });
        return;
      }
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      set({ deals: (data ?? []) as DealRow[], loaded: true, loading: false, userId: uid });
    } catch (e) {
      set({ loading: false, loaded: true, error: e instanceof Error ? e.message : 'Could not load deals' });
    }
  },

  applyRealtime: (eventType, newRow, oldRow) => {
    const uid = get().userId;
    // Ignore rows that belong to someone else (RLS already filters, this is defence in depth).
    if (uid && newRow?.user_id && newRow.user_id !== uid) return;
    set((s) => ({ deals: applyRowChange(s.deals, eventType, newRow, oldRow) }));
  },

  reset: () => set({ deals: [], loaded: false, loading: false, error: null, userId: null }),
}));
