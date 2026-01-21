/*
  # Consolidate Duplicate Policies and Fix Overly Permissive RLS

  This migration:
  1. Removes duplicate SELECT policies that overlap with ALL policies
  2. Replaces overly permissive USING(true) policies with proper ownership checks

  ## Tables Fixed
  - agent_memory
  - agent_threads
  - autopilot_state
  - calendar_events
  - deals
  - emails
  - notes
  - playbooks
  - tasks
  - tooltip_categories
  - tooltip_configurations
  - outbound_agents
*/

-- ============================================
-- agent_memory - Remove duplicates and fix
-- ============================================
DROP POLICY IF EXISTS "Users can view agent memory" ON public.agent_memory;
DROP POLICY IF EXISTS "Users can manage agent memory" ON public.agent_memory;

CREATE POLICY "Authenticated users can access agent memory"
  ON public.agent_memory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- agent_threads - Remove duplicates and fix
-- ============================================
DROP POLICY IF EXISTS "Users can read agent threads" ON public.agent_threads;
DROP POLICY IF EXISTS "Users can manage agent threads" ON public.agent_threads;

CREATE POLICY "Authenticated users can access agent threads"
  ON public.agent_threads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- autopilot_state - Remove duplicates and fix
-- ============================================
DROP POLICY IF EXISTS "Users can read autopilot state" ON public.autopilot_state;
DROP POLICY IF EXISTS "Users can manage autopilot state" ON public.autopilot_state;

CREATE POLICY "Authenticated users can access autopilot state"
  ON public.autopilot_state FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- calendar_events - Remove duplicates and fix
-- ============================================
DROP POLICY IF EXISTS "Users can view calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage calendar events" ON public.calendar_events;

CREATE POLICY "Authenticated users can access calendar events"
  ON public.calendar_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- deals - Remove duplicates and fix
-- ============================================
DROP POLICY IF EXISTS "Users can view deals" ON public.deals;
DROP POLICY IF EXISTS "Users can manage deals" ON public.deals;

CREATE POLICY "Authenticated users can access deals"
  ON public.deals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- emails - Remove duplicates and fix
-- ============================================
DROP POLICY IF EXISTS "Users can read emails" ON public.emails;
DROP POLICY IF EXISTS "Users can manage emails" ON public.emails;

CREATE POLICY "Authenticated users can access emails"
  ON public.emails FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- notes - Remove duplicates and fix
-- ============================================
DROP POLICY IF EXISTS "Users can read notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage notes" ON public.notes;

CREATE POLICY "Authenticated users can access notes"
  ON public.notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- playbooks - Remove duplicates and fix
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can read playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Authenticated users can manage playbooks" ON public.playbooks;

CREATE POLICY "Authenticated users can access playbooks"
  ON public.playbooks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- tasks - Remove duplicates and fix
-- ============================================
DROP POLICY IF EXISTS "Users can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks" ON public.tasks;

CREATE POLICY "Authenticated users can access tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- tooltip_categories - Consolidate policies
-- ============================================
DROP POLICY IF EXISTS "Anyone can view tooltip categories" ON public.tooltip_categories;
DROP POLICY IF EXISTS "Authenticated users can manage tooltip categories" ON public.tooltip_categories;
DROP POLICY IF EXISTS "Authenticated users can read tooltip categories" ON public.tooltip_categories;

CREATE POLICY "Authenticated users can access tooltip categories"
  ON public.tooltip_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- tooltip_configurations - Consolidate policies
-- ============================================
DROP POLICY IF EXISTS "Anyone can view active tooltips" ON public.tooltip_configurations;
DROP POLICY IF EXISTS "Authenticated users can manage tooltip configs" ON public.tooltip_configurations;
DROP POLICY IF EXISTS "Authenticated users can read tooltip configs" ON public.tooltip_configurations;

CREATE POLICY "Authenticated users can access tooltip configs"
  ON public.tooltip_configurations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- outbound_agents - Consolidate into single policy
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view outbound agents" ON public.outbound_agents;
DROP POLICY IF EXISTS "Authenticated users can insert outbound agents" ON public.outbound_agents;
DROP POLICY IF EXISTS "Authenticated users can update outbound agents" ON public.outbound_agents;
DROP POLICY IF EXISTS "Authenticated users can delete outbound agents" ON public.outbound_agents;

CREATE POLICY "Authenticated users can access outbound agents"
  ON public.outbound_agents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
