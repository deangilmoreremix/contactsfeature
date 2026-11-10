import { supabase } from '../lib/supabase';
import { logger } from './logger.service';
import {
  ViewType,
  UserViewPreferences,
  ViewFilters,
  KanbanColumnConfig,
  TableColumnPreferences,
  DashboardWidgetLayout,
  TimelineViewPreferences,
  ViewFilterConfig,
  ViewSortConfig,
  KanbanColumn,
  DashboardWidget
} from '../types/view';

class ViewPreferencesService {
  private userId: string | null = null;

  private async getUserId(): Promise<string | null> {
    if (this.userId) return this.userId;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.userId = user?.id || null;
      return this.userId;
    } catch (error) {
      logger.error('Failed to get user ID', error as Error);
      return null;
    }
  }

  async getUserViewPreferences(): Promise<UserViewPreferences | null> {
    try {
      const userId = await this.getUserId();

      let query = supabase
        .from('user_view_preferences')
        .select('*');

      if (userId === null) {
        query = query.is('user_id', null);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to fetch user view preferences', error as Error);
      return null;
    }
  }

  async setCurrentView(viewType: ViewType): Promise<void> {
    try {
      const userId = await this.getUserId();
      const existing = await this.getUserViewPreferences();

      if (existing) {
        let query = supabase
          .from('user_view_preferences')
          .update({
            view_type: viewType,
            last_used_view: viewType,
            updated_at: new Date().toISOString()
          });

        if (userId === null) {
          query = query.is('user_id', null);
        } else {
          query = query.eq('user_id', userId);
        }

        const { error } = await query;
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_view_preferences')
          .insert({
            user_id: userId,
            view_type: viewType,
            last_used_view: viewType
          });

        if (error) throw error;
      }

      logger.info('View preference updated', { viewType });
    } catch (error) {
      logger.error('Failed to set current view', error as Error);
      throw error;
    }
  }

  async getViewFilters(viewType: ViewType): Promise<ViewFilters | null> {
    try {
      const userId = await this.getUserId();

      let query = supabase
        .from('view_filters')
        .select('*');

      if (userId === null) {
        query = query.is('user_id', null);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query
        .eq('view_type', viewType)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to fetch view filters', error as Error);
      return null;
    }
  }

  async saveViewFilters(
    viewType: ViewType,
    filterConfig: ViewFilterConfig,
    sortConfig: ViewSortConfig
  ): Promise<void> {
    try {
      const userId = await this.getUserId();

      const { error } = await supabase
        .from('view_filters')
        .upsert({
          user_id: userId,
          view_type: viewType,
          filter_config: filterConfig,
          sort_config: sortConfig,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,view_type'
        });

      if (error) throw error;
      logger.info('View filters saved', { viewType });
    } catch (error) {
      logger.error('Failed to save view filters', error as Error);
      throw error;
    }
  }

  async getKanbanConfig(): Promise<KanbanColumnConfig | null> {
    try {
      const userId = await this.getUserId();

      let query = supabase
        .from('kanban_column_configs')
        .select('*');

      if (userId === null) {
        query = query.is('user_id', null);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to fetch Kanban config', error as Error);
      return null;
    }
  }

  async saveKanbanConfig(columnField: string, columns: KanbanColumn[]): Promise<void> {
    try {
      const userId = await this.getUserId();
      const existing = await this.getKanbanConfig();

      if (existing) {
        let query = supabase
          .from('kanban_column_configs')
          .update({
            column_field: columnField,
            columns: columns,
            updated_at: new Date().toISOString()
          });

        if (userId === null) {
          query = query.is('user_id', null);
        } else {
          query = query.eq('user_id', userId);
        }

        const { error } = await query;
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kanban_column_configs')
          .insert({
            user_id: userId,
            column_field: columnField,
            columns: columns
          });

        if (error) throw error;
      }

      logger.info('Kanban config saved', { columnField, columnsCount: columns.length });
    } catch (error) {
      logger.error('Failed to save Kanban config', error as Error);
      throw error;
    }
  }

  async getTableColumnPreferences(): Promise<TableColumnPreferences | null> {
    try {
      const userId = await this.getUserId();

      let query = supabase
        .from('table_column_preferences')
        .select('*');

      if (userId === null) {
        query = query.is('user_id', null);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to fetch table column preferences', error as Error);
      return null;
    }
  }

  async saveTableColumnPreferences(
    visibleColumns: string[],
    columnOrder: string[],
    columnWidths: Record<string, number>
  ): Promise<void> {
    try {
      const userId = await this.getUserId();
      const existing = await this.getTableColumnPreferences();

      if (existing) {
        let query = supabase
          .from('table_column_preferences')
          .update({
            visible_columns: visibleColumns,
            column_order: columnOrder,
            column_widths: columnWidths,
            updated_at: new Date().toISOString()
          });

        if (userId === null) {
          query = query.is('user_id', null);
        } else {
          query = query.eq('user_id', userId);
        }

        const { error } = await query;
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('table_column_preferences')
          .insert({
            user_id: userId,
            visible_columns: visibleColumns,
            column_order: columnOrder,
            column_widths: columnWidths
          });

        if (error) throw error;
      }

      logger.info('Table column preferences saved');
    } catch (error) {
      logger.error('Failed to save table column preferences', error as Error);
      throw error;
    }
  }

  async getDashboardLayout(): Promise<DashboardWidgetLayout | null> {
    try {
      const userId = await this.getUserId();

      let query = supabase
        .from('dashboard_widget_layouts')
        .select('*');

      if (userId === null) {
        query = query.is('user_id', null);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to fetch dashboard layout', error as Error);
      return null;
    }
  }

  async saveDashboardLayout(widgets: DashboardWidget[], dateRange: string): Promise<void> {
    try {
      const userId = await this.getUserId();
      const existing = await this.getDashboardLayout();

      if (existing) {
        let query = supabase
          .from('dashboard_widget_layouts')
          .update({
            widgets: widgets,
            date_range: dateRange,
            updated_at: new Date().toISOString()
          });

        if (userId === null) {
          query = query.is('user_id', null);
        } else {
          query = query.eq('user_id', userId);
        }

        const { error } = await query;
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dashboard_widget_layouts')
          .insert({
            user_id: userId,
            widgets: widgets,
            date_range: dateRange
          });

        if (error) throw error;
      }

      logger.info('Dashboard layout saved');
    } catch (error) {
      logger.error('Failed to save dashboard layout', error as Error);
      throw error;
    }
  }

  async getTimelinePreferences(): Promise<TimelineViewPreferences | null> {
    try {
      const userId = await this.getUserId();

      let query = supabase
        .from('timeline_view_preferences')
        .select('*');

      if (userId === null) {
        query = query.is('user_id', null);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to fetch timeline preferences', error as Error);
      return null;
    }
  }

  async saveTimelinePreferences(
    timeScale: string,
    visibleEventTypes: string[],
    selectedContacts: string[]
  ): Promise<void> {
    try {
      const userId = await this.getUserId();
      const existing = await this.getTimelinePreferences();

      if (existing) {
        let query = supabase
          .from('timeline_view_preferences')
          .update({
            time_scale: timeScale,
            visible_event_types: visibleEventTypes,
            selected_contacts: selectedContacts,
            updated_at: new Date().toISOString()
          });

        if (userId === null) {
          query = query.is('user_id', null);
        } else {
          query = query.eq('user_id', userId);
        }

        const { error } = await query;
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('timeline_view_preferences')
          .insert({
            user_id: userId,
            time_scale: timeScale,
            visible_event_types: visibleEventTypes,
            selected_contacts: selectedContacts
          });

        if (error) throw error;
      }

      logger.info('Timeline preferences saved');
    } catch (error) {
      logger.error('Failed to save timeline preferences', error as Error);
      throw error;
    }
  }

  async resetViewPreferences(viewType?: ViewType): Promise<void> {
    try {
      const userId = await this.getUserId();

      if (viewType) {
        let query = supabase
          .from('view_filters')
          .delete();

        if (userId === null) {
          query = query.is('user_id', null);
        } else {
          query = query.eq('user_id', userId);
        }

        await query.eq('view_type', viewType);

        logger.info('View preferences reset', { viewType });
      } else {
        const tables = [
          'view_filters',
          'kanban_column_configs',
          'table_column_preferences',
          'dashboard_widget_layouts',
          'timeline_view_preferences'
        ];

        for (const table of tables) {
          let query = supabase.from(table).delete();

          if (userId === null) {
            query = query.is('user_id', null);
          } else {
            query = query.eq('user_id', userId);
          }

          await query;
        }

        logger.info('All view preferences reset');
      }
    } catch (error) {
      logger.error('Failed to reset view preferences', error as Error);
      throw error;
    }
  }
}

export const viewPreferencesService = new ViewPreferencesService();
