/*
  # Create Adaptive Playbooks Table

  1. New Tables
    - `adaptive_playbooks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - Name of the playbook
      - `description` (text) - Description of the playbook
      - `deal_type` (text) - Type of deal this playbook targets
      - `industry` (text) - Target industry
      - `deal_size` (text) - Deal size category (small, medium, large, enterprise)
      - `phases` (jsonb) - Array of playbook phases with steps
      - `triggers` (jsonb) - Conditions that trigger this playbook
      - `success_metrics` (jsonb) - Metrics to measure playbook success
      - `ai_generated` (boolean) - Whether AI generated this playbook
      - `effectiveness_score` (numeric) - Historical effectiveness score
      - `times_used` (integer) - Number of times playbook was used
      - `active` (boolean) - Whether playbook is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `adaptive_playbooks` table
    - Add policies for authenticated users to manage their own playbooks

  3. Indexes
    - Index on user_id for faster lookups
    - Index on deal_type and industry for filtering
*/

CREATE TABLE IF NOT EXISTS adaptive_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  deal_type text,
  industry text,
  deal_size text,
  phases jsonb DEFAULT '[]',
  triggers jsonb DEFAULT '{}',
  success_metrics jsonb DEFAULT '{}',
  ai_generated boolean DEFAULT false,
  effectiveness_score numeric(5, 2) DEFAULT 0,
  times_used integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE adaptive_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own playbooks"
  ON adaptive_playbooks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own playbooks"
  ON adaptive_playbooks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own playbooks"
  ON adaptive_playbooks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playbooks"
  ON adaptive_playbooks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_adaptive_playbooks_user_id ON adaptive_playbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_playbooks_deal_type ON adaptive_playbooks(deal_type);
CREATE INDEX IF NOT EXISTS idx_adaptive_playbooks_industry ON adaptive_playbooks(industry);
CREATE INDEX IF NOT EXISTS idx_adaptive_playbooks_active ON adaptive_playbooks(active);