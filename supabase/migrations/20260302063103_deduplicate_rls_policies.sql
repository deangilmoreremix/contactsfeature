/*
  # Deduplicate RLS policies

  1. Changes
    - Remove duplicate INSERT, SELECT, UPDATE policies on:
      - `agent_threads` (3 duplicates)
      - `autopilot_state` (3 duplicates)
      - `emails` (3 duplicates)
      - `notes` (3 duplicates)
      - `tasks` (3 duplicates)
    - Keeps the newer, consistently-named policies
    - All remaining policies still enforce ownership via auth.uid() through contacts FK

  2. Security
    - No change to security posture -- duplicate policies had identical conditions
    - All tables retain full CRUD ownership-based RLS
*/

DO $$ BEGIN
  -- agent_threads: drop older duplicates
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert agent threads for their contacts' AND tablename = 'agent_threads') THEN
    DROP POLICY "Users can insert agent threads for their contacts" ON agent_threads;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their contacts'' agent threads' AND tablename = 'agent_threads') THEN
    DROP POLICY "Users can view their contacts' agent threads" ON agent_threads;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their contacts'' agent threads' AND tablename = 'agent_threads') THEN
    DROP POLICY "Users can update their contacts' agent threads" ON agent_threads;
  END IF;

  -- autopilot_state: drop older duplicates
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert autopilot for their contacts' AND tablename = 'autopilot_state') THEN
    DROP POLICY "Users can insert autopilot for their contacts" ON autopilot_state;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view autopilot for their contacts' AND tablename = 'autopilot_state') THEN
    DROP POLICY "Users can view autopilot for their contacts" ON autopilot_state;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update autopilot for their contacts' AND tablename = 'autopilot_state') THEN
    DROP POLICY "Users can update autopilot for their contacts" ON autopilot_state;
  END IF;

  -- emails: drop older duplicates
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert emails for their contacts' AND tablename = 'emails') THEN
    DROP POLICY "Users can insert emails for their contacts" ON emails;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view emails for their contacts' AND tablename = 'emails') THEN
    DROP POLICY "Users can view emails for their contacts" ON emails;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update emails for their contacts' AND tablename = 'emails') THEN
    DROP POLICY "Users can update emails for their contacts" ON emails;
  END IF;

  -- notes: drop older duplicates
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert notes for their contacts' AND tablename = 'notes') THEN
    DROP POLICY "Users can insert notes for their contacts" ON notes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view notes for their contacts' AND tablename = 'notes') THEN
    DROP POLICY "Users can view notes for their contacts" ON notes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update notes for their contacts' AND tablename = 'notes') THEN
    DROP POLICY "Users can update notes for their contacts" ON notes;
  END IF;

  -- tasks: drop older duplicates
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert tasks for their contacts' AND tablename = 'tasks') THEN
    DROP POLICY "Users can insert tasks for their contacts" ON tasks;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view tasks for their contacts' AND tablename = 'tasks') THEN
    DROP POLICY "Users can view tasks for their contacts" ON tasks;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update tasks for their contacts' AND tablename = 'tasks') THEN
    DROP POLICY "Users can update tasks for their contacts" ON tasks;
  END IF;
END $$;