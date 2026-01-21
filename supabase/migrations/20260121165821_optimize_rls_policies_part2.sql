/*
  # Optimize RLS Policies - Part 2: View Preferences Tables

  This migration optimizes RLS policies for view preferences tables.

  ## Tables Updated
  - user_view_preferences
  - view_filters
  - kanban_column_configs
  - table_column_preferences
  - dashboard_widget_layouts
  - timeline_view_preferences
*/

-- user_view_preferences
DROP POLICY IF EXISTS "Authenticated users can view their own view preferences" ON public.user_view_preferences;
DROP POLICY IF EXISTS "Authenticated users can insert their own view preferences" ON public.user_view_preferences;
DROP POLICY IF EXISTS "Authenticated users can update their own view preferences" ON public.user_view_preferences;
DROP POLICY IF EXISTS "Authenticated users can delete their own view preferences" ON public.user_view_preferences;

CREATE POLICY "Authenticated users can view their own view preferences"
  ON public.user_view_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can insert their own view preferences"
  ON public.user_view_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update their own view preferences"
  ON public.user_view_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete their own view preferences"
  ON public.user_view_preferences FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- view_filters
DROP POLICY IF EXISTS "Authenticated users can view their own view filters" ON public.view_filters;
DROP POLICY IF EXISTS "Authenticated users can insert their own view filters" ON public.view_filters;
DROP POLICY IF EXISTS "Authenticated users can update their own view filters" ON public.view_filters;
DROP POLICY IF EXISTS "Authenticated users can delete their own view filters" ON public.view_filters;

CREATE POLICY "Authenticated users can view their own view filters"
  ON public.view_filters FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can insert their own view filters"
  ON public.view_filters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update their own view filters"
  ON public.view_filters FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete their own view filters"
  ON public.view_filters FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- kanban_column_configs
DROP POLICY IF EXISTS "Authenticated users can view their own kanban configs" ON public.kanban_column_configs;
DROP POLICY IF EXISTS "Authenticated users can insert their own kanban configs" ON public.kanban_column_configs;
DROP POLICY IF EXISTS "Authenticated users can update their own kanban configs" ON public.kanban_column_configs;
DROP POLICY IF EXISTS "Authenticated users can delete their own kanban configs" ON public.kanban_column_configs;

CREATE POLICY "Authenticated users can view their own kanban configs"
  ON public.kanban_column_configs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can insert their own kanban configs"
  ON public.kanban_column_configs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update their own kanban configs"
  ON public.kanban_column_configs FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete their own kanban configs"
  ON public.kanban_column_configs FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- table_column_preferences
DROP POLICY IF EXISTS "Authenticated users can view their own table preferences" ON public.table_column_preferences;
DROP POLICY IF EXISTS "Authenticated users can insert their own table preferences" ON public.table_column_preferences;
DROP POLICY IF EXISTS "Authenticated users can update their own table preferences" ON public.table_column_preferences;
DROP POLICY IF EXISTS "Authenticated users can delete their own table preferences" ON public.table_column_preferences;

CREATE POLICY "Authenticated users can view their own table preferences"
  ON public.table_column_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can insert their own table preferences"
  ON public.table_column_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update their own table preferences"
  ON public.table_column_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete their own table preferences"
  ON public.table_column_preferences FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- dashboard_widget_layouts
DROP POLICY IF EXISTS "Authenticated users can view their own dashboard layouts" ON public.dashboard_widget_layouts;
DROP POLICY IF EXISTS "Authenticated users can insert their own dashboard layouts" ON public.dashboard_widget_layouts;
DROP POLICY IF EXISTS "Authenticated users can update their own dashboard layouts" ON public.dashboard_widget_layouts;
DROP POLICY IF EXISTS "Authenticated users can delete their own dashboard layouts" ON public.dashboard_widget_layouts;

CREATE POLICY "Authenticated users can view their own dashboard layouts"
  ON public.dashboard_widget_layouts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can insert their own dashboard layouts"
  ON public.dashboard_widget_layouts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update their own dashboard layouts"
  ON public.dashboard_widget_layouts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete their own dashboard layouts"
  ON public.dashboard_widget_layouts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- timeline_view_preferences
DROP POLICY IF EXISTS "Authenticated users can view their own timeline preferences" ON public.timeline_view_preferences;
DROP POLICY IF EXISTS "Authenticated users can insert their own timeline preferences" ON public.timeline_view_preferences;
DROP POLICY IF EXISTS "Authenticated users can update their own timeline preferences" ON public.timeline_view_preferences;
DROP POLICY IF EXISTS "Authenticated users can delete their own timeline preferences" ON public.timeline_view_preferences;

CREATE POLICY "Authenticated users can view their own timeline preferences"
  ON public.timeline_view_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can insert their own timeline preferences"
  ON public.timeline_view_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update their own timeline preferences"
  ON public.timeline_view_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete their own timeline preferences"
  ON public.timeline_view_preferences FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));
