export type ViewType = 'list' | 'table' | 'kanban' | 'calendar' | 'dashboard' | 'timeline';

export type TimeScale = 'day' | 'week' | 'month' | 'quarter';

export interface ViewFilterConfig {
  search?: string;
  status?: string[];
  interestLevel?: string[];
  tags?: string[];
  isFavorite?: boolean;
  aiScoreMin?: number;
  aiScoreMax?: number;
  dateFrom?: string;
  dateTo?: string;
  industry?: string[];
  sources?: string[];
}

export interface ViewSortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface UserViewPreferences {
  id: string;
  user_id: string | null;
  view_type: ViewType;
  last_used_view: ViewType | null;
  created_at: string;
  updated_at: string;
}

export interface ViewFilters {
  id: string;
  user_id: string | null;
  view_type: ViewType;
  filter_config: ViewFilterConfig;
  sort_config: ViewSortConfig;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  color: string;
}

export interface KanbanColumnConfig {
  id: string;
  user_id: string | null;
  column_field: string;
  columns: KanbanColumn[];
  created_at: string;
  updated_at: string;
}

export interface TableColumnPreferences {
  id: string;
  user_id: string | null;
  visible_columns: string[];
  column_order: string[];
  column_widths: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'list' | 'table';
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config?: Record<string, any>;
}

export interface DashboardWidgetLayout {
  id: string;
  user_id: string | null;
  widgets: DashboardWidget[];
  date_range: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineViewPreferences {
  id: string;
  user_id: string | null;
  time_scale: TimeScale;
  visible_event_types: string[];
  selected_contacts: string[];
  created_at: string;
  updated_at: string;
}

export interface ViewDensity {
  type: 'compact' | 'comfortable' | 'spacious';
  cardHeight: number;
  padding: number;
  fontSize: string;
}
