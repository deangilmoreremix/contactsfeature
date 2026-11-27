import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../services/logger.service';
import {
  ContactViewSnapshot,
  rowToSnapshot,
  snapshotToRow,
} from '../lib/views/contactViewSnapshot';

export interface SavedContactView {
  id: string;
  name: string;
  snapshot: ContactViewSnapshot;
  updatedAt: string;
}

/** CRUD for the current user's saved Contacts views (table: view_presets). */
export function useContactViews() {
  const [views, setViews] = useState<SavedContactView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setViews([]); return; }
      const { data, error: err } = await supabase
        .from('view_presets')
        .select('*')
        .eq('user_id', user.id)
        .eq('object_type', 'contacts')
        .order('updated_at', { ascending: false });
      if (err) throw err;
      setViews((data ?? []).map((r: any) => ({ id: r.id, name: r.name, snapshot: rowToSnapshot(r), updatedAt: r.updated_at })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('Failed to load saved views', e instanceof Error ? e : new Error(msg));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async (name: string, snapshot: ContactViewSnapshot): Promise<SavedContactView> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sign in to save views');
    const { data, error: err } = await supabase
      .from('view_presets')
      .insert({ ...snapshotToRow(name, snapshot), user_id: user.id } as never)
      .select()
      .maybeSingle();
    if (err || !data) throw err ?? new Error('Could not save view');
    const row: any = data;
    const saved = { id: row.id, name: row.name, snapshot: rowToSnapshot(row), updatedAt: row.updated_at };
    setViews((prev) => [saved, ...prev]);
    return saved;
  };

  const update = async (id: string, snapshot: ContactViewSnapshot, name?: string): Promise<void> => {
    const current = views.find((v) => v.id === id);
    const row = { ...snapshotToRow(name ?? current?.name ?? 'View', snapshot), updated_at: new Date().toISOString() };
    const { error: err } = await supabase.from('view_presets').update(row as never).eq('id', id);
    if (err) throw err;
    setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name: row.name, snapshot, updatedAt: row.updated_at } : v)));
  };

  const remove = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('view_presets').delete().eq('id', id);
    if (err) throw err;
    setViews((prev) => prev.filter((v) => v.id !== id));
  };

  return { views, loading, error, create, update, remove, refetch: load };
}
