/*
  # Create View Preferences System

  ## Purpose
  This migration creates a comprehensive system for storing user view preferences,
  configurations, and customizations across all contact view types.

  ## New Tables

  ### 1. user_view_preferences
  Stores the selected view type and general view settings for each user
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References auth.users if multi-user, nullable for single user
  - `view_type` (text) - Current selected view: list, table, kanban, calendar, dashboard, timeline
  - `last_used_view` (text) - Most recently used view type
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### 2. view_filters
  Stores independent filter configurations for each view type
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User reference
  - `view_type` (text) - Which view these filters apply to
  - `filter_config` (jsonb) - Filter settings (search, status, tags, etc.)
  - `sort_config` (jsonb) - Sort settings (field, direction)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### 3. kanban_column_configs
  Stores custom Kanban column configurations and ordering
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User reference
  - `column_field` (text) - Field to group by (status, interestLevel, tags, etc.)
  - `columns` (jsonb) - Array of column definitions with order, title, color
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### 4. table_column_preferences
  Stores table view column visibility, order, and width settings
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User reference
  - `visible_columns` (jsonb) - Array of visible column ids
  - `column_order` (jsonb) - Array defining column order
  - `column_widths` (jsonb) - Object with column id to width mappings
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### 5. dashboard_widget_layouts
  Stores dashboard widget positions and configurations
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User reference
  - `widgets` (jsonb) - Array of widget configurations with position, size, type
  - `date_range` (text) - Default date range for dashboard
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### 6. timeline_view_preferences
  Stores timeline view specific settings
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User reference
  - `time_scale` (text) - day, week, month, quarter
  - `visible_event_types` (jsonb) - Array of visible event types
  - `selected_contacts` (jsonb) - Array of contact ids to show
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their own preferences
  - For single-user setup, allow access where user_id is null

  ## Indexes
  - Index on user_id for all tables
  - Index on view_type for quick lookups
*/

-- 1. Create user_view_preferences table
CREATE TABLE IF NOT EXISTS user_view_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  view_type TEXT NOT NULL DEFAULT 'list' CHECK (view_type IN ('list', 'table', 'kanban', 'calendar', 'dashboard', 'timeline')),
  last_used_view TEXT CHECK (last_used_view IN ('list', 'table', 'kanban', 'calendar', 'dashboard', 'timeline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create view_filters table
CREATE TABLE IF NOT EXISTS view_filters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('list', 'table', 'kanban', 'calendar', 'dashboard', 'timeline')),
  filter_config JSONB DEFAULT '{}',
  sort_config JSONB DEFAULT '{"field": "createdAt", "direction": "desc"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, view_type)
);

-- 3. Create kanban_column_configs table
CREATE TABLE IF NOT EXISTS kanban_column_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  column_field TEXT NOT NULL DEFAULT 'status',
  columns JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create table_column_preferences table
CREATE TABLE IF NOT EXISTS table_column_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  visible_columns JSONB DEFAULT '["name", "email", "company", "title", "status", "interestLevel", "aiScore"]',
  column_order JSONB DEFAULT '["name", "email", "company", "title", "status", "interestLevel", "aiScore", "lastConnected"]',
  column_widths JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create dashboard_widget_layouts table
CREATE TABLE IF NOT EXISTS dashboard_widget_layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  widgets JSONB DEFAULT '[]',
  date_range TEXT DEFAULT 'last_30_days',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create timeline_view_preferences table
CREATE TABLE IF NOT EXISTS timeline_view_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  time_scale TEXT DEFAULT 'week' CHECK (time_scale IN ('day', 'week', 'month', 'quarter')),
  visible_event_types JSONB DEFAULT '["email", "call", "meeting", "note", "status_change", "ai_analysis"]',
  selected_contacts JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_view_preferences_user_id ON user_view_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_view_filters_user_id_view_type ON view_filters(user_id, view_type);
CREATE INDEX IF NOT EXISTS idx_kanban_column_configs_user_id ON kanban_column_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_table_column_preferences_user_id ON table_column_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widget_layouts_user_id ON dashboard_widget_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_view_preferences_user_id ON timeline_view_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_view_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_column_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_column_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widget_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_view_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for single-user setup (user_id is null)
-- In production with auth, you would check auth.uid() = user_id

CREATE POLICY "Allow all operations on user_view_preferences"
  ON user_view_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on view_filters"
  ON view_filters
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on kanban_column_configs"
  ON kanban_column_configs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on table_column_preferences"
  ON table_column_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on dashboard_widget_layouts"
  ON dashboard_widget_layouts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on timeline_view_preferences"
  ON timeline_view_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_view_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_user_view_preferences_updated_at
  BEFORE UPDATE ON user_view_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_view_preferences_updated_at();

CREATE TRIGGER update_view_filters_updated_at
  BEFORE UPDATE ON view_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_view_preferences_updated_at();

CREATE TRIGGER update_kanban_column_configs_updated_at
  BEFORE UPDATE ON kanban_column_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_view_preferences_updated_at();

CREATE TRIGGER update_table_column_preferences_updated_at
  BEFORE UPDATE ON table_column_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_view_preferences_updated_at();

CREATE TRIGGER update_dashboard_widget_layouts_updated_at
  BEFORE UPDATE ON dashboard_widget_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_view_preferences_updated_at();

CREATE TRIGGER update_timeline_view_preferences_updated_at
  BEFORE UPDATE ON timeline_view_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_view_preferences_updated_at();

-- Insert default preferences for single user setup
INSERT INTO user_view_preferences (user_id, view_type, last_used_view)
VALUES (NULL, 'list', 'list')
ON CONFLICT DO NOTHING;

-- Insert default Kanban configuration with status columns
INSERT INTO kanban_column_configs (user_id, column_field, columns)
VALUES (NULL, 'status', '[
  {"id": "lead", "title": "Lead", "order": 0, "color": "#3B82F6"},
  {"id": "prospect", "title": "Prospect", "order": 1, "color": "#8B5CF6"},
  {"id": "customer", "title": "Customer", "order": 2, "color": "#10B981"},
  {"id": "churned", "title": "Churned", "order": 3, "color": "#EF4444"}
]'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert default dashboard widgets
INSERT INTO dashboard_widget_layouts (user_id, widgets, date_range)
VALUES (NULL, '[
  {"id": "kpi-total", "type": "kpi", "title": "Total Contacts", "position": {"x": 0, "y": 0, "w": 3, "h": 2}},
  {"id": "kpi-conversion", "type": "kpi", "title": "Conversion Rate", "position": {"x": 3, "y": 0, "w": 3, "h": 2}},
  {"id": "kpi-score", "type": "kpi", "title": "Avg AI Score", "position": {"x": 6, "y": 0, "w": 3, "h": 2}},
  {"id": "kpi-growth", "type": "kpi", "title": "Growth Rate", "position": {"x": 9, "y": 0, "w": 3, "h": 2}},
  {"id": "funnel", "type": "chart", "title": "Contact Funnel", "position": {"x": 0, "y": 2, "w": 6, "h": 4}},
  {"id": "trend", "type": "chart", "title": "Contact Trend", "position": {"x": 6, "y": 2, "w": 6, "h": 4}},
  {"id": "status-dist", "type": "chart", "title": "Status Distribution", "position": {"x": 0, "y": 6, "w": 4, "h": 3}},
  {"id": "source-breakdown", "type": "chart", "title": "Source Breakdown", "position": {"x": 4, "y": 6, "w": 4, "h": 3}},
  {"id": "top-contacts", "type": "list", "title": "Top Contacts", "position": {"x": 8, "y": 6, "w": 4, "h": 3}}
]'::jsonb, 'last_30_days')
ON CONFLICT DO NOTHING;