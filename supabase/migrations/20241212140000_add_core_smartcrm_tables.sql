--
-- Add missing core SmartCRM tables
--

----------------------------------------------------
-- DEALS TABLE
----------------------------------------------------

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  stage text DEFAULT 'lead',
  value numeric DEFAULT 0,
  risk_score int DEFAULT 0,
  objection_level int DEFAULT 0,
  stage_stagnation int DEFAULT 0,
  days_since_reply int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deals_contact_idx ON deals(contact_id);
CREATE INDEX IF NOT EXISTS deals_stage_idx ON deals(stage);

----------------------------------------------------
-- AGENT MEMORY TABLE
----------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  memory_type text CHECK (memory_type IN ('short', 'mid', 'long')),
  data jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_memory_contact_idx ON agent_memory(contact_id);
CREATE INDEX IF NOT EXISTS agent_memory_type_idx ON agent_memory(memory_type);

----------------------------------------------------
-- CALENDAR EVENTS
----------------------------------------------------

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_events_contact_idx ON calendar_events(contact_id);

----------------------------------------------------
-- VOICE JOB QUEUE
----------------------------------------------------

CREATE TABLE IF NOT EXISTS voice_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  script text,
  audio_base64 text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_jobs_status_idx ON voice_jobs(status);

----------------------------------------------------
-- VIDEO JOB QUEUE
----------------------------------------------------

CREATE TABLE IF NOT EXISTS video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  template text,
  props jsonb,
  video_base64 text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_jobs_status_idx ON video_jobs(status);

----------------------------------------------------
-- PLAYBOOKS TABLE
----------------------------------------------------

CREATE TABLE IF NOT EXISTS playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

----------------------------------------------------
-- AUTOPILOT LOG TABLE
----------------------------------------------------

CREATE TABLE IF NOT EXISTS autopilot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  state text,
  event text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

----------------------------------------------------
-- TRIGGERS
----------------------------------------------------

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_update_timestamp
BEFORE UPDATE ON deals
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER voice_jobs_update_timestamp
BEFORE UPDATE ON voice_jobs
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER video_jobs_update_timestamp
BEFORE UPDATE ON video_jobs
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

----------------------------------------------------
-- RPC FUNCTIONS
----------------------------------------------------

CREATE OR REPLACE FUNCTION save_activity(
  contact_id uuid,
  activity jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO autopilot_logs(contact_id, state, event, details)
  VALUES (contact_id, 'activity', 'saved', activity);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_contact_status(
  cid uuid,
  new_status text
)
RETURNS void AS $$
BEGIN
  UPDATE contacts
  SET status = new_status
  WHERE id = cid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION write_score(
  cid uuid,
  score int
)
RETURNS void AS $$
BEGIN
  UPDATE contacts
  SET lead_score = score
  WHERE id = cid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rpc_compute_deal_risk(did uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT json_build_object(
    'risk_score', risk_score,
    'updated_at', now()
  )
  INTO result
  FROM deals
  WHERE id = did;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

----------------------------------------------------
-- ROW LEVEL SECURITY
----------------------------------------------------

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- POLICIES
----------------------------------------------------

CREATE POLICY "service_role_all" ON deals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON agent_memory
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON calendar_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON voice_jobs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON video_jobs
  FOR ALL USING (auth.role() = 'service_role');