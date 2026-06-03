import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../services/logger.service';

export interface ViewPreset {
  id?: string;
  user_id?: string;
  name: string;
  object_type: string;
  filters: any[];
  sorts: any[];
  group_by?: string;
  column_order?: string[];
  visible_columns?: string[];
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const viewPreferencesService = {
  async getTableColumnPreferences() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('view_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('object_type', 'contacts')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to load table preferences', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  },

  async saveTableColumnPreferences(
    visibleColumns: string[],
    columnOrder: string[],
    columnWidths: Record<string, number>
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('view_preferences')
        .upsert({
          user_id: user.id,
          object_type: 'contacts',
          visible_columns: visibleColumns,
          column_order: columnOrder,
          column_widths: columnWidths,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,object_type'
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to save table preferences', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  },

  async getKanbanConfig() {
    try {
      const { data, error } = await supabase
        .from('kanban_configs')
        .select('*')
        .eq('object_type', 'contacts')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to load kanban config', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  },

  async saveKanbanConfig(columnField: string, columns: any[]) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('kanban_configs')
        .upsert({
          user_id: user.id,
          object_type: 'contacts',
          column_field: columnField,
          columns,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,object_type'
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to save kanban config', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};
