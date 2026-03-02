/*
  # Add Autonomous SDR Support

  1. Modified Tables
    - `contact_agent_settings`
      - `agent_id` (text) - which SDR agent type to use
      - `sequence_length` (int) - total steps in sequence
      - `current_step` (int) - current step in sequence
      - `autopilot_enabled` (boolean) - master toggle for autopilot
      - `max_emails_per_day` (int) - rate limit per contact per day
      - `respect_business_hours` (boolean) - only send during business hours
      - `timezone` (text) - contact's timezone for scheduling
      - `last_sent_at` (timestamptz) - when the last email was sent
    - `autopilot_state`
      - `user_id` (uuid) - owner of this autopilot state
      - `current_stage` (text) - the SDR stage (cold_email, follow_up_1, etc.)
      - `follow_up_count` (int) - how many follow-ups sent
      - `last_email_sent_at` (timestamptz) - last email timestamp
      - `total_emails_sent` (int) - total emails sent in this campaign
      - `last_reply_at` (timestamptz) - when contact last replied
      - `persona_id` (text) - which persona to use
    - `emails`
      - `user_id` (uuid) - owner of this email record
      - `agent_type` (text) - which SDR agent generated this
      - `autopilot_state_id` (uuid) - link to autopilot state
      - `scheduled_for` (timestamptz) - when to send
      - `send_attempts` (int) - number of send attempts
      - `error_message` (text) - last error if send failed

  2. New Tables
    - `sdr_campaigns` - Campaign definitions from CampaignBuilder
    - `agent_logs` - Structured logging for agent activity

  3. Security
    - RLS on all new tables
    - Ownership-based policies
*/

-- Add columns to contact_agent_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'agent_id') THEN
    ALTER TABLE contact_agent_settings ADD COLUMN agent_id text DEFAULT 'cold_email_sdr';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'sequence_length') THEN
    ALTER TABLE contact_agent_settings ADD COLUMN sequence_length int DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'current_step') THEN
    ALTER TABLE contact_agent_settings ADD COLUMN current_step int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'autopilot_enabled') THEN
    ALTER TABLE contact_agent_settings ADD COLUMN autopilot_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'max_emails_per_day') THEN
    ALTER TABLE contact_agent_settings ADD COLUMN max_emails_per_day int DEFAULT 3;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'respect_business_hours') THEN
    ALTER TABLE contact_agent_settings ADD COLUMN respect_business_hours boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'timezone') THEN
    ALTER TABLE contact_agent_settings ADD COLUMN timezone text DEFAULT 'America/New_York';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'last_sent_at') THEN
    ALTER TABLE contact_agent_settings ADD COLUMN last_sent_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'user_id') THEN
    ALTER TABLE contact_agent_settings ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to autopilot_state
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'autopilot_state' AND column_name = 'user_id') THEN
    ALTER TABLE autopilot_state ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'autopilot_state' AND column_name = 'current_stage') THEN
    ALTER TABLE autopilot_state ADD COLUMN current_stage text DEFAULT 'cold_email';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'autopilot_state' AND column_name = 'follow_up_count') THEN
    ALTER TABLE autopilot_state ADD COLUMN follow_up_count int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'autopilot_state' AND column_name = 'last_email_sent_at') THEN
    ALTER TABLE autopilot_state ADD COLUMN last_email_sent_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'autopilot_state' AND column_name = 'total_emails_sent') THEN
    ALTER TABLE autopilot_state ADD COLUMN total_emails_sent int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'autopilot_state' AND column_name = 'last_reply_at') THEN
    ALTER TABLE autopilot_state ADD COLUMN last_reply_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'autopilot_state' AND column_name = 'persona_id') THEN
    ALTER TABLE autopilot_state ADD COLUMN persona_id text;
  END IF;
END $$;

-- Add columns to emails
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'user_id') THEN
    ALTER TABLE emails ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'agent_type') THEN
    ALTER TABLE emails ADD COLUMN agent_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'autopilot_state_id') THEN
    ALTER TABLE emails ADD COLUMN autopilot_state_id uuid REFERENCES autopilot_state(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'scheduled_for') THEN
    ALTER TABLE emails ADD COLUMN scheduled_for timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'send_attempts') THEN
    ALTER TABLE emails ADD COLUMN send_attempts int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'error_message') THEN
    ALTER TABLE emails ADD COLUMN error_message text;
  END IF;
END $$;

-- Add indexes for autonomous query patterns
CREATE INDEX IF NOT EXISTS idx_emails_queued ON emails(status, scheduled_for) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_state_user_id ON autopilot_state(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_active_next ON autopilot_state(status, next_action_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_contact_agent_settings_autopilot ON contact_agent_settings(autopilot_enabled) WHERE autopilot_enabled = true;
CREATE INDEX IF NOT EXISTS idx_contact_agent_settings_user ON contact_agent_settings(user_id);

-- Create sdr_campaigns table
CREATE TABLE IF NOT EXISTS sdr_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  agent_id text NOT NULL DEFAULT 'cold_email_sdr',
  persona_id text,
  sequence jsonb NOT NULL DEFAULT '[]',
  settings jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  is_public boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  contacts_enrolled int DEFAULT 0,
  emails_sent int DEFAULT 0,
  replies_received int DEFAULT 0,
  meetings_booked int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sdr_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns"
  ON sdr_campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns"
  ON sdr_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON sdr_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON sdr_campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create agent_logs table
CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  agent_type text NOT NULL DEFAULT 'sdr',
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  autopilot_state_id uuid REFERENCES autopilot_state(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agent_logs_contact ON agent_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user ON agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at);

CREATE POLICY "Users can view own agent logs"
  ON agent_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agent logs"
  ON agent_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages agent logs"
  ON agent_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role policy for sdr_campaigns (for batch operations)
CREATE POLICY "Service role manages campaigns"
  ON sdr_campaigns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add link from autopilot_state to campaign
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'autopilot_state' AND column_name = 'campaign_id') THEN
    ALTER TABLE autopilot_state ADD COLUMN campaign_id uuid REFERENCES sdr_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;
