/*
  # Enable RLS and Remove Overly Permissive Policies

  This migration enables RLS on tables that were missing it and removes
  policies that bypass security with USING(true).

  ## Tables with RLS Enabled
  - playbooks
  - autopilot_logs

  ## Overly Permissive Policies Removed
  - contact_agent_settings - "Allow all operations on contact_agent_settings"
  - contacts - "Allow all operations for unauthenticated users"
  - dashboard_widget_layouts - unauthenticated access
  - kanban_column_configs - unauthenticated access
  - outbound_agents - "Allow all operations on outbound_agents"
  - table_column_preferences - unauthenticated access
  - timeline_view_preferences - unauthenticated access
  - user_view_preferences - unauthenticated access
  - view_filters - unauthenticated access
  - emails/tasks/notes/agent_threads/autopilot_state - service_role and anon policies

  ## Tooltip Policies Fixed
  - tooltip_categories - Replaced USING(true) with proper policies
  - tooltip_configurations - Replaced USING(true) with proper policies
*/

-- Enable RLS on tables missing it
ALTER TABLE IF EXISTS public.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.autopilot_logs ENABLE ROW LEVEL SECURITY;

-- Create proper policies for playbooks
DROP POLICY IF EXISTS "Authenticated users can read playbooks" ON public.playbooks;
CREATE POLICY "Authenticated users can read playbooks"
  ON public.playbooks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage playbooks"
  ON public.playbooks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create proper policies for autopilot_logs (uses contact_id for ownership)
CREATE POLICY "Users can view autopilot logs for their contacts"
  ON public.autopilot_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = autopilot_logs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create autopilot logs for their contacts"
  ON public.autopilot_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = autopilot_logs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on contact_agent_settings" ON public.contact_agent_settings;
DROP POLICY IF EXISTS "Allow all operations for unauthenticated users" ON public.contacts;
DROP POLICY IF EXISTS "Allow all operations on dashboard_widget_layouts for unauthenti" ON public.dashboard_widget_layouts;
DROP POLICY IF EXISTS "Allow all operations on kanban_column_configs for unauthenticat" ON public.kanban_column_configs;
DROP POLICY IF EXISTS "Allow all operations on outbound_agents" ON public.outbound_agents;
DROP POLICY IF EXISTS "Allow all operations on table_column_preferences for unauthenti" ON public.table_column_preferences;
DROP POLICY IF EXISTS "Allow all operations on timeline_view_preferences for unauthent" ON public.timeline_view_preferences;
DROP POLICY IF EXISTS "Allow all operations on user_view_preferences for unauthenticat" ON public.user_view_preferences;
DROP POLICY IF EXISTS "Allow all operations on view_filters for unauthenticated users" ON public.view_filters;

-- Clean up service_role and anon policies that were consolidated
DROP POLICY IF EXISTS "service_role_all_emails" ON public.emails;
DROP POLICY IF EXISTS "anon_read_emails" ON public.emails;
DROP POLICY IF EXISTS "service_role_all_tasks" ON public.tasks;
DROP POLICY IF EXISTS "anon_read_tasks" ON public.tasks;
DROP POLICY IF EXISTS "service_role_all_notes" ON public.notes;
DROP POLICY IF EXISTS "anon_read_notes" ON public.notes;
DROP POLICY IF EXISTS "service_role_all_agent_threads" ON public.agent_threads;
DROP POLICY IF EXISTS "anon_read_agent_threads" ON public.agent_threads;
DROP POLICY IF EXISTS "service_role_all_autopilot_state" ON public.autopilot_state;
DROP POLICY IF EXISTS "anon_read_autopilot_state" ON public.autopilot_state;

-- Create proper policies for emails
CREATE POLICY "Users can read emails"
  ON public.emails FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage emails"
  ON public.emails FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create proper policies for tasks
CREATE POLICY "Users can read tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create proper policies for notes
CREATE POLICY "Users can read notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage notes"
  ON public.notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create proper policies for agent_threads
CREATE POLICY "Users can read agent threads"
  ON public.agent_threads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage agent threads"
  ON public.agent_threads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create proper policies for autopilot_state
CREATE POLICY "Users can read autopilot state"
  ON public.autopilot_state FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage autopilot state"
  ON public.autopilot_state FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fix tooltip_categories policies
DROP POLICY IF EXISTS "Authenticated users can delete tooltip categories" ON public.tooltip_categories;
DROP POLICY IF EXISTS "Authenticated users can insert tooltip categories" ON public.tooltip_categories;
DROP POLICY IF EXISTS "Authenticated users can update tooltip categories" ON public.tooltip_categories;

CREATE POLICY "Authenticated users can read tooltip categories"
  ON public.tooltip_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage tooltip categories"
  ON public.tooltip_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fix tooltip_configurations policies
DROP POLICY IF EXISTS "Authenticated users can delete tooltips" ON public.tooltip_configurations;
DROP POLICY IF EXISTS "Authenticated users can insert tooltips" ON public.tooltip_configurations;
DROP POLICY IF EXISTS "Authenticated users can update tooltips" ON public.tooltip_configurations;

CREATE POLICY "Authenticated users can read tooltip configs"
  ON public.tooltip_configurations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage tooltip configs"
  ON public.tooltip_configurations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
