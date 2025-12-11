CREATE TABLE IF NOT EXISTS contact_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  autopilot_enabled BOOLEAN DEFAULT FALSE,
  agent_id TEXT,
  persona_id TEXT,
  sequence_length INTEGER,
  channels JSONB,
  skills JSONB,
  inbox TEXT,
  quiet_hours JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (contact_id)
);
ALTER TABLE contact_agent_settings ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0;
