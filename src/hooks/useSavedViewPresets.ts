import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../services/logger.service';

export interface SavedViewPreset {
  id: string;
  name: string;
  objectType: string;
  filters: any[];
  sorts: any[];
  groupBy?: string;
  columnOrder?: string[];
  visibleColumns?: string[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

const fromRow = (row: any): SavedViewPreset => ({
  id: row.id,
  name: row.name,
  objectType: row.object_type,
  filters: row.filters ?? [],
  sorts: row.sorts ?? [],
  ...(row.group_by ? { groupBy: row.group_by } : {}),
  ...(row.column_order ? { columnOrder: row.column_order } : {}),
  ...(row.visible_columns ? { visibleColumns: row.visible_columns } : {}),
  isDefault: !!row.is_default,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const toRow = (preset: Omit<SavedViewPreset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => ({
  ...(preset.id ? { id: preset.id } : {}),
  name: preset.name,
  object_type: preset.objectType,
  filters: preset.filters,
  sorts: preset.sorts,
  group_by: preset.groupBy ?? null,
  column_order: preset.columnOrder ?? null,
  visible_columns: preset.visibleColumns ?? null,
  is_default: preset.isDefault ?? false
});

export function useSavedViewPresets(objectType: string = 'contacts') {
  const [presets, setPresets] = useState<SavedViewPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadPresets = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('view_presets')
        .select('*')
        .eq('user_id', user.id)
        .eq('object_type', objectType)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPresets((data || []).map(fromRow));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to load view presets', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const savePreset = async (preset: Omit<SavedViewPreset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: upsertError } = await supabase
        .from('view_presets')
        .upsert({
          ...toRow(preset),
          user_id: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      const saved = fromRow(data);
      setPresets(prev => prev.some(p => p.id === saved.id)
        ? prev.map(p => p.id === saved.id ? saved : p)
        : [saved, ...prev]);

      return saved;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to save view preset', error);
      throw error;
    }
  };

  const deletePreset = async (presetId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('view_presets')
        .delete()
        .eq('id', presetId);

      if (deleteError) throw deleteError;
      setPresets(prev => prev.filter(p => p.id !== presetId));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to delete view preset', error);
      throw error;
    }
  };

  useEffect(() => {
    loadPresets();
  }, [objectType]);

  return {
    presets,
    loading,
    error,
    savePreset,
    deletePreset,
    refetch: loadPresets
  };
}
