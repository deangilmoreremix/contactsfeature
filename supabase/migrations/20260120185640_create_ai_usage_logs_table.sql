/*
  # Create AI Usage Logs Table

  1. New Tables
    - `ai_usage_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `feature` (text) - The AI feature being used
      - `model` (text) - The AI model used
      - `tokens_used` (integer) - Number of tokens consumed
      - `cost` (numeric) - Estimated cost of the API call
      - `request_type` (text) - Type of request (e.g., 'completion', 'embedding')
      - `response_time_ms` (integer) - Response time in milliseconds
      - `success` (boolean) - Whether the request succeeded
      - `error_message` (text) - Error message if failed
      - `metadata` (jsonb) - Additional metadata
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `ai_usage_logs` table
    - Add policy for authenticated users to insert their own logs
    - Add policy for authenticated users to read their own logs

  3. Indexes
    - Index on user_id for faster lookups
    - Index on created_at for time-based queries
    - Index on feature for analytics
*/

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  model text,
  tokens_used integer DEFAULT 0,
  cost numeric(10, 6) DEFAULT 0,
  request_type text,
  response_time_ms integer,
  success boolean DEFAULT true,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own AI usage logs"
  ON ai_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own AI usage logs"
  ON ai_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature);