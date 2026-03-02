/*
  # Tighten RLS Policies on SDR Tables

  1. Changes
    - Replace overly permissive USING(true) policies on autopilot_state, agent_threads, emails, tasks, and notes
    - New policies check ownership via contacts.user_id = auth.uid()
    - Ensures multi-tenant data isolation so users can only access their own SDR data

  2. Tables Modified
    - `autopilot_state` - restrict to owner via contacts FK
    - `agent_threads` - restrict to owner via contacts FK
    - `emails` - restrict to owner via contacts FK
    - `tasks` - restrict to owner via contacts FK
    - `notes` - restrict to owner via contacts FK

  3. Security
    - All policies now require authenticated role AND ownership verification
    - Service role access preserved for backend functions
*/

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can access autopilot_state' AND tablename = 'autopilot_state') THEN
    DROP POLICY "Authenticated users can access autopilot_state" ON autopilot_state;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'autopilot_state_authenticated_access' AND tablename = 'autopilot_state') THEN
    DROP POLICY "autopilot_state_authenticated_access" ON autopilot_state;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own autopilot_state' AND tablename = 'autopilot_state') THEN
    CREATE POLICY "Users can select own autopilot_state"
      ON autopilot_state FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = autopilot_state.lead_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own autopilot_state' AND tablename = 'autopilot_state') THEN
    CREATE POLICY "Users can insert own autopilot_state"
      ON autopilot_state FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = autopilot_state.lead_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own autopilot_state' AND tablename = 'autopilot_state') THEN
    CREATE POLICY "Users can update own autopilot_state"
      ON autopilot_state FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = autopilot_state.lead_id AND c.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = autopilot_state.lead_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own autopilot_state' AND tablename = 'autopilot_state') THEN
    CREATE POLICY "Users can delete own autopilot_state"
      ON autopilot_state FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = autopilot_state.lead_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can access agent_threads' AND tablename = 'agent_threads') THEN
    DROP POLICY "Authenticated users can access agent_threads" ON agent_threads;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_threads_authenticated_access' AND tablename = 'agent_threads') THEN
    DROP POLICY "agent_threads_authenticated_access" ON agent_threads;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own agent_threads' AND tablename = 'agent_threads') THEN
    CREATE POLICY "Users can select own agent_threads"
      ON agent_threads FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = agent_threads.lead_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own agent_threads' AND tablename = 'agent_threads') THEN
    CREATE POLICY "Users can insert own agent_threads"
      ON agent_threads FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = agent_threads.lead_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own agent_threads' AND tablename = 'agent_threads') THEN
    CREATE POLICY "Users can update own agent_threads"
      ON agent_threads FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = agent_threads.lead_id AND c.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = agent_threads.lead_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can access emails' AND tablename = 'emails') THEN
    DROP POLICY "Authenticated users can access emails" ON emails;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'emails_authenticated_access' AND tablename = 'emails') THEN
    DROP POLICY "emails_authenticated_access" ON emails;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own emails' AND tablename = 'emails') THEN
    CREATE POLICY "Users can select own emails"
      ON emails FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = emails.contact_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own emails' AND tablename = 'emails') THEN
    CREATE POLICY "Users can insert own emails"
      ON emails FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = emails.contact_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own emails' AND tablename = 'emails') THEN
    CREATE POLICY "Users can update own emails"
      ON emails FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = emails.contact_id AND c.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = emails.contact_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can access tasks' AND tablename = 'tasks') THEN
    DROP POLICY "Authenticated users can access tasks" ON tasks;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tasks_authenticated_access' AND tablename = 'tasks') THEN
    DROP POLICY "tasks_authenticated_access" ON tasks;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own tasks' AND tablename = 'tasks') THEN
    CREATE POLICY "Users can select own tasks"
      ON tasks FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = tasks.contact_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own tasks' AND tablename = 'tasks') THEN
    CREATE POLICY "Users can insert own tasks"
      ON tasks FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = tasks.contact_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own tasks' AND tablename = 'tasks') THEN
    CREATE POLICY "Users can update own tasks"
      ON tasks FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = tasks.contact_id AND c.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = tasks.contact_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can access notes' AND tablename = 'notes') THEN
    DROP POLICY "Authenticated users can access notes" ON notes;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notes_authenticated_access' AND tablename = 'notes') THEN
    DROP POLICY "notes_authenticated_access" ON notes;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own notes' AND tablename = 'notes') THEN
    CREATE POLICY "Users can select own notes"
      ON notes FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = notes.contact_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own notes' AND tablename = 'notes') THEN
    CREATE POLICY "Users can insert own notes"
      ON notes FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = notes.contact_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own notes' AND tablename = 'notes') THEN
    CREATE POLICY "Users can update own notes"
      ON notes FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = notes.contact_id AND c.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = notes.contact_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;
