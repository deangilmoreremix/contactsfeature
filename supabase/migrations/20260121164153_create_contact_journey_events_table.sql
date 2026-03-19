/*
  # Create Contact Journey Events Table
  
  1. New Tables
    - `contact_journey_events`
      - `id` (uuid, primary key) - Unique identifier for the event
      - `contact_id` (uuid, foreign key) - Reference to the contact
      - `user_id` (uuid, foreign key) - User who created the event
      - `event_type` (text) - Type: interaction, milestone, status_change, ai_insight, file_upload
      - `title` (text) - Event title
      - `description` (text) - Event description
      - `status` (text) - Status: completed, pending, in_progress
      - `event_timestamp` (timestamptz) - When the event occurred
      - `channel` (text, nullable) - Communication channel (email, phone, etc.)
      - `sentiment` (text, nullable) - Sentiment: positive, neutral, negative
      - `score` (integer, nullable) - Associated score (e.g., AI score)
      - `file_id` (uuid, nullable) - Reference to uploaded file if applicable
      - `metadata` (jsonb) - Additional event metadata
      - `is_predicted` (boolean) - Whether this is a predicted future event
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `contact_journey_events` table
    - Add policies for users to manage events for their contacts
  
  3. Indexes
    - Index on contact_id for faster lookups
    - Index on event_timestamp for chronological queries
    - Index on event_type for filtering
*/

-- Create contact_journey_events table
CREATE TABLE IF NOT EXISTS contact_journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('interaction', 'milestone', 'status_change', 'ai_insight', 'file_upload')),
  title text NOT NULL,
  description text,
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'in_progress')),
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  channel text,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  score integer CHECK (score >= 0 AND score <= 100),
  file_id uuid REFERENCES contact_files(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  is_predicted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE contact_journey_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view events for contacts they own
CREATE POLICY "Users can view journey events for their contacts"
  ON contact_journey_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_journey_events.contact_id
      AND contacts.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Policy: Users can insert events for contacts they own
CREATE POLICY "Users can create journey events for their contacts"
  ON contact_journey_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_journey_events.contact_id
      AND contacts.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Policy: Users can update their own events
CREATE POLICY "Users can update their own journey events"
  ON contact_journey_events
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete their own journey events"
  ON contact_journey_events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_journey_events_contact_id ON contact_journey_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_journey_events_user_id ON contact_journey_events(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_events_timestamp ON contact_journey_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_journey_events_type ON contact_journey_events(event_type);