/*
  # SDR Autopilot Tables Migration

  1. New Tables
    - `agent_threads` - Store OpenAI thread references for leads
    - `autopilot_state` - Track SDR campaign progress
    - `emails` - Store email communication records (if not exists)
    - `tasks` - Store CRM tasks (if not exists)
    - `notes` - Store contact notes (if not exists)

  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies for service role and anon access

  3. Indexes
    - Performance indexes for common query patterns
*/

-- Create emails table if not exists
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  from_email text,
  to_email text,
  subject text,
  body_html text,
  body_text text,
  sent_at timestamptz,
  status text DEFAULT 'draft',
  mailbox_key text,
  message_id text,
  thread_id text,
  is_inbound boolean DEFAULT false,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emails_contact_id_idx ON emails(contact_id);
CREATE INDEX IF NOT EXISTS emails_status_idx ON emails(status);
CREATE INDEX IF NOT EXISTS emails_sent_at_idx ON emails(sent_at);

-- Create tasks table if not exists
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  title text,
  description text,
  due_date timestamptz,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to text,
  created_by text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_contact_id_idx ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);

-- Create notes table if not exists
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  content text NOT NULL,
  note_type text DEFAULT 'general',
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_contact_id_idx ON notes(contact_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at);

-- Agent Threads table for storing OpenAI thread references
CREATE TABLE IF NOT EXISTS agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  thread_id text NOT NULL,
  agent_type text NOT NULL DEFAULT 'sdr_autopilot',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, agent_type)
);

CREATE INDEX IF NOT EXISTS agent_threads_lead_id_idx ON agent_threads(lead_id);
CREATE INDEX IF NOT EXISTS agent_threads_agent_type_idx ON agent_threads(agent_type);
CREATE INDEX IF NOT EXISTS agent_threads_thread_id_idx ON agent_threads(thread_id);

-- Autopilot State table for tracking campaign progress
CREATE TABLE IF NOT EXISTS autopilot_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  agent_type text NOT NULL DEFAULT 'sdr_autopilot',
  state_json jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'completed')),
  campaign_goal text,
  mailbox_key text,
  messages_sent int DEFAULT 0,
  last_response_at timestamptz,
  next_action_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, agent_type)
);

CREATE INDEX IF NOT EXISTS autopilot_state_lead_id_idx ON autopilot_state(lead_id);
CREATE INDEX IF NOT EXISTS autopilot_state_agent_type_idx ON autopilot_state(agent_type);
CREATE INDEX IF NOT EXISTS autopilot_state_status_idx ON autopilot_state(status);
CREATE INDEX IF NOT EXISTS autopilot_state_next_action_idx ON autopilot_state(next_action_at);

-- Enable Row Level Security on new tables
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_state ENABLE ROW LEVEL SECURITY;

-- Create policies for emails
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'emails' AND policyname = 'service_role_all_emails') THEN
    CREATE POLICY "service_role_all_emails" ON emails FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'emails' AND policyname = 'anon_read_emails') THEN
    CREATE POLICY "anon_read_emails" ON emails FOR SELECT USING (true);
  END IF;
END $$;

-- Create policies for tasks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'service_role_all_tasks') THEN
    CREATE POLICY "service_role_all_tasks" ON tasks FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'anon_read_tasks') THEN
    CREATE POLICY "anon_read_tasks" ON tasks FOR SELECT USING (true);
  END IF;
END $$;

-- Create policies for notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'service_role_all_notes') THEN
    CREATE POLICY "service_role_all_notes" ON notes FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'anon_read_notes') THEN
    CREATE POLICY "anon_read_notes" ON notes FOR SELECT USING (true);
  END IF;
END $$;

-- Create policies for agent_threads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_threads' AND policyname = 'service_role_all_agent_threads') THEN
    CREATE POLICY "service_role_all_agent_threads" ON agent_threads FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_threads' AND policyname = 'anon_read_agent_threads') THEN
    CREATE POLICY "anon_read_agent_threads" ON agent_threads FOR SELECT USING (true);
  END IF;
END $$;

-- Create policies for autopilot_state
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'autopilot_state' AND policyname = 'service_role_all_autopilot_state') THEN
    CREATE POLICY "service_role_all_autopilot_state" ON autopilot_state FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'autopilot_state' AND policyname = 'anon_read_autopilot_state') THEN
    CREATE POLICY "anon_read_autopilot_state" ON autopilot_state FOR SELECT USING (true);
  END IF;
END $$;

-- Add calendar_events columns for meeting details
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'title') THEN
    ALTER TABLE calendar_events ADD COLUMN title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'description') THEN
    ALTER TABLE calendar_events ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'start_time') THEN
    ALTER TABLE calendar_events ADD COLUMN start_time timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'end_time') THEN
    ALTER TABLE calendar_events ADD COLUMN end_time timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'event_type') THEN
    ALTER TABLE calendar_events ADD COLUMN event_type text DEFAULT 'meeting';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'join_url') THEN
    ALTER TABLE calendar_events ADD COLUMN join_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'created_by') THEN
    ALTER TABLE calendar_events ADD COLUMN created_by text;
  END IF;
END $$;
