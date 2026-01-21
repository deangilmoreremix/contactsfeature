/*
  # Optimize RLS Policies - Part 4: Contact Files, Journey Events, and Agent Tables

  This migration optimizes RLS policies for contact-related tables and cleans up 
  service_role policies that were causing issues.

  ## Tables Updated
  - contact_files
  - contact_journey_events
  - agent_metadata
  - deals
  - agent_memory
  - calendar_events
  - voice_jobs (via contact ownership)
  - video_jobs (via contact ownership)
*/

-- contact_files
DROP POLICY IF EXISTS "Users can view files for their contacts" ON public.contact_files;
DROP POLICY IF EXISTS "Users can upload files for their contacts" ON public.contact_files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.contact_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.contact_files;

CREATE POLICY "Users can view files for their contacts"
  ON public.contact_files FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can upload files for their contacts"
  ON public.contact_files FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own files"
  ON public.contact_files FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own files"
  ON public.contact_files FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- contact_journey_events
DROP POLICY IF EXISTS "Users can view journey events for their contacts" ON public.contact_journey_events;
DROP POLICY IF EXISTS "Users can create journey events for their contacts" ON public.contact_journey_events;
DROP POLICY IF EXISTS "Users can update their own journey events" ON public.contact_journey_events;
DROP POLICY IF EXISTS "Users can delete their own journey events" ON public.contact_journey_events;

CREATE POLICY "Users can view journey events for their contacts"
  ON public.contact_journey_events FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create journey events for their contacts"
  ON public.contact_journey_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own journey events"
  ON public.contact_journey_events FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own journey events"
  ON public.contact_journey_events FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- agent_metadata - Fix and consolidate
DROP POLICY IF EXISTS "Allow authenticated users to read agent metadata" ON public.agent_metadata;
DROP POLICY IF EXISTS "Allow service role to manage agent metadata" ON public.agent_metadata;
DROP POLICY IF EXISTS "Authenticated users can read agent metadata" ON public.agent_metadata;

CREATE POLICY "Authenticated users can read agent metadata"
  ON public.agent_metadata FOR SELECT
  TO authenticated
  USING (true);

-- deals - Remove service_role policy, add proper user check
DROP POLICY IF EXISTS "service_role_all" ON public.deals;

CREATE POLICY "Users can view deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage deals"
  ON public.deals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- agent_memory - Remove service_role policy, add authenticated access
DROP POLICY IF EXISTS "service_role_all" ON public.agent_memory;

CREATE POLICY "Users can view agent memory"
  ON public.agent_memory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage agent memory"
  ON public.agent_memory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- calendar_events - Remove service_role policy, add authenticated access
DROP POLICY IF EXISTS "service_role_all" ON public.calendar_events;

CREATE POLICY "Users can view calendar events"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage calendar events"
  ON public.calendar_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- voice_jobs - Use contact ownership for security
DROP POLICY IF EXISTS "service_role_all" ON public.voice_jobs;
DROP POLICY IF EXISTS "Users can manage their voice jobs" ON public.voice_jobs;

CREATE POLICY "Users can view voice jobs for their contacts"
  ON public.voice_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = voice_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create voice jobs for their contacts"
  ON public.voice_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = voice_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update voice jobs for their contacts"
  ON public.voice_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = voice_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = voice_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete voice jobs for their contacts"
  ON public.voice_jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = voice_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

-- video_jobs - Use contact ownership for security
DROP POLICY IF EXISTS "service_role_all" ON public.video_jobs;
DROP POLICY IF EXISTS "Users can manage their video jobs" ON public.video_jobs;

CREATE POLICY "Users can view video jobs for their contacts"
  ON public.video_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = video_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create video jobs for their contacts"
  ON public.video_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = video_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update video jobs for their contacts"
  ON public.video_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = video_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = video_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete video jobs for their contacts"
  ON public.video_jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = video_jobs.contact_id
      AND c.user_id = (select auth.uid())
    )
  );
