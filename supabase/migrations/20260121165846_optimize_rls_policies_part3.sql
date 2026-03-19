/*
  # Optimize RLS Policies - Part 3: Agent and Product Tables

  This migration optimizes RLS policies for agent runs, products, and related tables.

  ## Tables Updated
  - agent_runs
  - outbound_agents
  - contact_agent_settings
  - user_products
  - product_contact_matches
  - product_drafts
  - product_ai_suggestions
  - product_ai_enrichments
*/

-- agent_runs - Fix and consolidate
DROP POLICY IF EXISTS "Users can read their own agent runs" ON public.agent_runs;
DROP POLICY IF EXISTS "Users can insert their own agent runs" ON public.agent_runs;
DROP POLICY IF EXISTS "Users can update their own agent runs" ON public.agent_runs;
DROP POLICY IF EXISTS "Service role can manage all agent runs" ON public.agent_runs;

CREATE POLICY "Users can read their own agent runs"
  ON public.agent_runs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own agent runs"
  ON public.agent_runs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own agent runs"
  ON public.agent_runs FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- outbound_agents - Clean up duplicate policies
DROP POLICY IF EXISTS "Users can view outbound agents" ON public.outbound_agents;
DROP POLICY IF EXISTS "Users can manage outbound agents" ON public.outbound_agents;

CREATE POLICY "Authenticated users can view outbound agents"
  ON public.outbound_agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert outbound agents"
  ON public.outbound_agents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update outbound agents"
  ON public.outbound_agents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete outbound agents"
  ON public.outbound_agents FOR DELETE
  TO authenticated
  USING (true);

-- contact_agent_settings - Use contact ownership check
DROP POLICY IF EXISTS "Users can view contact agent settings" ON public.contact_agent_settings;
DROP POLICY IF EXISTS "Users can manage contact agent settings" ON public.contact_agent_settings;

CREATE POLICY "Users can view contact agent settings"
  ON public.contact_agent_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_agent_settings.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert contact agent settings"
  ON public.contact_agent_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_agent_settings.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update contact agent settings"
  ON public.contact_agent_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_agent_settings.contact_id
      AND c.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_agent_settings.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete contact agent settings"
  ON public.contact_agent_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_agent_settings.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

-- user_products
DROP POLICY IF EXISTS "Users can view their own products" ON public.user_products;
DROP POLICY IF EXISTS "Users can create their own products" ON public.user_products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.user_products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.user_products;

CREATE POLICY "Users can view their own products"
  ON public.user_products FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own products"
  ON public.user_products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own products"
  ON public.user_products FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own products"
  ON public.user_products FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- product_contact_matches
DROP POLICY IF EXISTS "Users can view their own matches" ON public.product_contact_matches;
DROP POLICY IF EXISTS "Users can create their own matches" ON public.product_contact_matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.product_contact_matches;
DROP POLICY IF EXISTS "Users can delete their own matches" ON public.product_contact_matches;

CREATE POLICY "Users can view their own matches"
  ON public.product_contact_matches FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own matches"
  ON public.product_contact_matches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own matches"
  ON public.product_contact_matches FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own matches"
  ON public.product_contact_matches FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- product_drafts
DROP POLICY IF EXISTS "Users can view their own drafts" ON public.product_drafts;
DROP POLICY IF EXISTS "Users can create their own drafts" ON public.product_drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON public.product_drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON public.product_drafts;

CREATE POLICY "Users can view their own drafts"
  ON public.product_drafts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own drafts"
  ON public.product_drafts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own drafts"
  ON public.product_drafts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own drafts"
  ON public.product_drafts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- product_ai_suggestions
DROP POLICY IF EXISTS "Users can view own AI suggestions" ON public.product_ai_suggestions;
DROP POLICY IF EXISTS "Users can insert own AI suggestions" ON public.product_ai_suggestions;
DROP POLICY IF EXISTS "Users can update own AI suggestions" ON public.product_ai_suggestions;
DROP POLICY IF EXISTS "Users can delete own AI suggestions" ON public.product_ai_suggestions;

CREATE POLICY "Users can view own AI suggestions"
  ON public.product_ai_suggestions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own AI suggestions"
  ON public.product_ai_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own AI suggestions"
  ON public.product_ai_suggestions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own AI suggestions"
  ON public.product_ai_suggestions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- product_ai_enrichments
DROP POLICY IF EXISTS "Users can view own AI enrichments" ON public.product_ai_enrichments;
DROP POLICY IF EXISTS "Users can insert own AI enrichments" ON public.product_ai_enrichments;
DROP POLICY IF EXISTS "Users can update own AI enrichments" ON public.product_ai_enrichments;
DROP POLICY IF EXISTS "Users can delete own AI enrichments" ON public.product_ai_enrichments;

CREATE POLICY "Users can view own AI enrichments"
  ON public.product_ai_enrichments FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own AI enrichments"
  ON public.product_ai_enrichments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own AI enrichments"
  ON public.product_ai_enrichments FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own AI enrichments"
  ON public.product_ai_enrichments FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));
