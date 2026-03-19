/*
  # SDR Preferences Tables and Column Fixes

  1. New Tables
    - `sdr_user_preferences` - User-specific SDR agent configuration
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `agent_id` (text) - identifies which SDR agent
      - `campaign_length` (int) - number of emails in sequence
      - `message_delay` (int) - hours between messages
      - `tone` (text) - communication tone
      - `personalization_level` (text)
      - `channels` (jsonb) - array of channels
      - `primary_channel` (text)
      - `success_criteria` (jsonb)
      - `custom_prompts` (jsonb)
      - `follow_up_rules` (jsonb)
      - `branding` (jsonb)
      - `ai_settings` (jsonb)
      - `timing_rules` (jsonb)
      - `objection_handling` (jsonb)
      - `competitor_strategy` (jsonb)
      - UNIQUE(user_id, agent_id) for upsert support

    - `sdr_campaign_templates` - Reusable campaign templates
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text)
      - `agent_id` (text)
      - `tags` (jsonb)
      - `is_public` (boolean)
      - `sequence` (jsonb)
      - `settings` (jsonb)
      - `usage_count` (int)

    - `sdr_agent_performance` - Performance tracking metrics
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `agent_id` (text)
      - `campaign_id` (text)
      - `template_id` (text)
      - `metrics` (jsonb)
      - `timing` (jsonb)
      - `rates` (jsonb)
      - `channel_performance` (jsonb)
      - `time_analytics` (jsonb)
      - `period_start` (timestamptz)
      - `period_end` (timestamptz)

  2. Modified Tables
    - `contact_agent_settings` - Added `escalated_to_ae` column (boolean)
    - `contacts` - Renamed `autopilot_state` to `pipeline_stage` to avoid naming collision with `autopilot_state` table

  3. Security
    - RLS enabled on all new tables
    - Ownership-based policies: users can only access their own data
    - Separate SELECT, INSERT, UPDATE, DELETE policies

  4. Important Notes
    - The `sdr_user_preferences` table uses UNIQUE(user_id, agent_id) to support upsert operations
    - The `contacts.autopilot_state` column is renamed to `pipeline_stage` to eliminate confusion with the `autopilot_state` table
    - The `escalated_to_ae` column defaults to false
*/

-- 1. Create sdr_user_preferences table
CREATE TABLE IF NOT EXISTS sdr_user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  campaign_length int DEFAULT 5,
  message_delay int DEFAULT 48,
  tone text DEFAULT 'professional',
  personalization_level text DEFAULT 'medium',
  channels jsonb DEFAULT '["email"]'::jsonb,
  primary_channel text DEFAULT 'email',
  success_criteria jsonb DEFAULT '{}'::jsonb,
  custom_prompts jsonb DEFAULT '{}'::jsonb,
  follow_up_rules jsonb DEFAULT '[]'::jsonb,
  branding jsonb DEFAULT '{}'::jsonb,
  ai_settings jsonb DEFAULT '{}'::jsonb,
  timing_rules jsonb DEFAULT '{}'::jsonb,
  objection_handling jsonb DEFAULT '[]'::jsonb,
  competitor_strategy jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_sdr_user_prefs_user_id ON sdr_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_sdr_user_prefs_agent_id ON sdr_user_preferences(agent_id);

ALTER TABLE sdr_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own sdr_user_preferences"
  ON sdr_user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sdr_user_preferences"
  ON sdr_user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sdr_user_preferences"
  ON sdr_user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sdr_user_preferences"
  ON sdr_user_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. Create sdr_campaign_templates table
CREATE TABLE IF NOT EXISTS sdr_campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  agent_id text NOT NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  is_public boolean DEFAULT false,
  sequence jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  usage_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdr_campaign_templates_user_id ON sdr_campaign_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sdr_campaign_templates_agent_id ON sdr_campaign_templates(agent_id);
CREATE INDEX IF NOT EXISTS idx_sdr_campaign_templates_public ON sdr_campaign_templates(is_public) WHERE is_public = true;

ALTER TABLE sdr_campaign_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own sdr_campaign_templates"
  ON sdr_campaign_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own sdr_campaign_templates"
  ON sdr_campaign_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sdr_campaign_templates"
  ON sdr_campaign_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sdr_campaign_templates"
  ON sdr_campaign_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Create sdr_agent_performance table
CREATE TABLE IF NOT EXISTS sdr_agent_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  campaign_id text,
  template_id text,
  metrics jsonb DEFAULT '{}'::jsonb,
  timing jsonb DEFAULT '{}'::jsonb,
  rates jsonb DEFAULT '{}'::jsonb,
  channel_performance jsonb DEFAULT '{}'::jsonb,
  time_analytics jsonb DEFAULT '{}'::jsonb,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdr_agent_perf_user_id ON sdr_agent_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_sdr_agent_perf_agent_id ON sdr_agent_performance(agent_id);

ALTER TABLE sdr_agent_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own sdr_agent_performance"
  ON sdr_agent_performance FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sdr_agent_performance"
  ON sdr_agent_performance FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sdr_agent_performance"
  ON sdr_agent_performance FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sdr_agent_performance"
  ON sdr_agent_performance FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Add escalated_to_ae column to contact_agent_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_agent_settings' AND column_name = 'escalated_to_ae'
  ) THEN
    ALTER TABLE contact_agent_settings ADD COLUMN escalated_to_ae boolean DEFAULT false;
  END IF;
END $$;

-- 5. Make persona_id nullable on contact_agent_settings so inserts without it don't fail
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_agent_settings' AND column_name = 'persona_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE contact_agent_settings ALTER COLUMN persona_id DROP NOT NULL;
  END IF;
END $$;

-- 6. Rename contacts.autopilot_state to pipeline_stage to avoid naming collision
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'autopilot_state'
  ) THEN
    ALTER TABLE contacts RENAME COLUMN autopilot_state TO pipeline_stage;
  END IF;
END $$;
