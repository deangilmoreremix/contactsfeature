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
      setPresets((data || []) as SavedViewPreset[]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to load view presets', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const savePreset = async (preset: Omit<SavedViewPreset, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: upsertError } = await supabase
        .from('view_presets')
        .upsert({
          ...preset,
          user_id: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setPresets(prev => {
        const exists = prev.find(p => p.id === data.id);
        if (exists) {
          return prev.map(p => p.id === data.id ? data as SavedViewPreset : p);
        }
        return [data as SavedViewPreset, ...prev];
      });

      return data as SavedViewPreset;
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
