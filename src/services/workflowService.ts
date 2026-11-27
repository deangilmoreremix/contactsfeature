/** Persisted visual workflows (table `workflows`, owner-only RLS). */
import { supabase } from '../lib/supabase';

export interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  isActive: boolean;
  updatedAt: string;
}
type Row = { id: string; name: string; description: string | null; nodes: any[]; edges: any[]; is_active: boolean; updated_at: string };
const map = (r: Row): SavedWorkflow => ({ id: r.id, name: r.name, description: r.description || '', nodes: r.nodes || [], edges: r.edges || [], isActive: r.is_active, updatedAt: r.updated_at });

export const workflowService = {
  async list(): Promise<SavedWorkflow[]> {
    const { data, error } = await supabase.from('workflows').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as Row[]).map(map);
  },

  async get(id: string): Promise<SavedWorkflow | null> {
    const { data, error } = await supabase.from('workflows').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? map(data as unknown as Row) : null;
  },

  /** Insert (no id / not a uuid) or update. Returns the saved workflow. */
  async save(wf: { id?: string; name: string; description?: string; nodes: any[]; edges: any[]; isActive?: boolean }): Promise<SavedWorkflow> {
    const isUuid = !!wf.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wf.id);
    const fields = {
      name: wf.name || 'Untitled workflow', description: wf.description || null, nodes: wf.nodes, edges: wf.edges,
      ...(wf.isActive !== undefined ? { is_active: wf.isActive } : {}), updated_at: new Date().toISOString(),
    };
    if (isUuid) {
      const { data, error } = await supabase.from('workflows').update(fields as never).eq('id', wf.id!).select('*').maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return map(data as unknown as Row);
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Please sign in');
    const { data, error } = await supabase.from('workflows').insert({ ...fields, user_id: auth.user.id } as never).select('*').maybeSingle();
    if (error || !data) throw new Error(error?.message || 'Could not save workflow');
    return map(data as unknown as Row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('workflows').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
