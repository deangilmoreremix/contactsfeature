/*
  # Optimize RLS Policies - Part 1: Core Tables

  This migration optimizes RLS policies by replacing auth.uid() with (select auth.uid())
  for better query performance at scale.

  ## Tables Updated
  - generated_images
  - email_compositions
  - email_analyses
  - email_templates
  - contacts
  - ai_usage_logs
  - adaptive_playbooks
*/

-- generated_images
DROP POLICY IF EXISTS "Users can only access their own generated images" ON public.generated_images;
CREATE POLICY "Users can only access their own generated images"
  ON public.generated_images FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- email_compositions
DROP POLICY IF EXISTS "Users can view own email compositions" ON public.email_compositions;
DROP POLICY IF EXISTS "Users can insert own email compositions" ON public.email_compositions;
DROP POLICY IF EXISTS "Users can update own email compositions" ON public.email_compositions;
DROP POLICY IF EXISTS "Users can delete own email compositions" ON public.email_compositions;

CREATE POLICY "Users can view own email compositions"
  ON public.email_compositions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own email compositions"
  ON public.email_compositions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own email compositions"
  ON public.email_compositions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own email compositions"
  ON public.email_compositions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- email_analyses
DROP POLICY IF EXISTS "Users can view own email analyses" ON public.email_analyses;
DROP POLICY IF EXISTS "Users can insert own email analyses" ON public.email_analyses;
DROP POLICY IF EXISTS "Users can delete own email analyses" ON public.email_analyses;

CREATE POLICY "Users can view own email analyses"
  ON public.email_analyses FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own email analyses"
  ON public.email_analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own email analyses"
  ON public.email_analyses FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- email_templates
DROP POLICY IF EXISTS "Users can view own and default templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can update own non-default templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can delete own non-default templates" ON public.email_templates;

CREATE POLICY "Users can view own and default templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR is_default = true);

CREATE POLICY "Users can insert own templates"
  ON public.email_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own non-default templates"
  ON public.email_templates FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()) AND is_default = false)
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own non-default templates"
  ON public.email_templates FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()) AND is_default = false);

-- contacts
DROP POLICY IF EXISTS "Authenticated users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can insert their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete their own contacts" ON public.contacts;

CREATE POLICY "Authenticated users can view their own contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can insert their own contacts"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update their own contacts"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete their own contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ai_usage_logs
DROP POLICY IF EXISTS "Users can insert their own AI usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users can read their own AI usage logs" ON public.ai_usage_logs;

CREATE POLICY "Users can insert their own AI usage logs"
  ON public.ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can read their own AI usage logs"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- adaptive_playbooks
DROP POLICY IF EXISTS "Users can insert their own playbooks" ON public.adaptive_playbooks;
DROP POLICY IF EXISTS "Users can read their own playbooks" ON public.adaptive_playbooks;
DROP POLICY IF EXISTS "Users can update their own playbooks" ON public.adaptive_playbooks;
DROP POLICY IF EXISTS "Users can delete their own playbooks" ON public.adaptive_playbooks;

CREATE POLICY "Users can insert their own playbooks"
  ON public.adaptive_playbooks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can read their own playbooks"
  ON public.adaptive_playbooks FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own playbooks"
  ON public.adaptive_playbooks FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own playbooks"
  ON public.adaptive_playbooks FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));
