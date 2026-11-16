/*
  # Bring-your-own email / SMS providers

  ## messaging_providers
  One row per provider a user connects (email: resend | sendgrid | postmark | mailgun,
  sms: twilio). Credentials are encrypted server-side (AES-256-GCM, key in Netlify env) and are
  never selectable from the browser: the table exposes only non-secret columns through RLS-guarded
  views would be overkill, so the browser never queries this table directly — all access goes
  through the `messaging-providers` Netlify function which uses the service role and returns masked
  values. RLS is still enabled (owner-only) as defence in depth.

  ## emails
  Adds the columns the queue processor already relies on (scheduled_for, send_attempts, ...).
*/

CREATE TABLE IF NOT EXISTS messaging_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  provider TEXT NOT NULL CHECK (provider IN ('resend', 'sendgrid', 'postmark', 'mailgun', 'twilio')),
  display_name TEXT,
  from_address TEXT NOT NULL,
  from_name TEXT,
  credentials_encrypted TEXT NOT NULL,
  credentials_hint JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  last_tested_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((channel = 'email' AND provider <> 'twilio') OR (channel = 'sms' AND provider = 'twilio'))
);

CREATE INDEX IF NOT EXISTS messaging_providers_user_channel_idx ON messaging_providers (user_id, channel);
CREATE UNIQUE INDEX IF NOT EXISTS messaging_providers_one_default_idx
  ON messaging_providers (user_id, channel) WHERE is_default;

ALTER TABLE messaging_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messaging_providers_select_own" ON messaging_providers;
CREATE POLICY "messaging_providers_select_own" ON messaging_providers
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "messaging_providers_insert_own" ON messaging_providers;
CREATE POLICY "messaging_providers_insert_own" ON messaging_providers
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "messaging_providers_update_own" ON messaging_providers;
CREATE POLICY "messaging_providers_update_own" ON messaging_providers
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "messaging_providers_delete_own" ON messaging_providers;
CREATE POLICY "messaging_providers_delete_own" ON messaging_providers
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- Never let the browser read ciphertext: column-level revoke for the API roles.
REVOKE SELECT (credentials_encrypted) ON messaging_providers FROM anon, authenticated;

-- Columns used by the email queue processor / tracking
ALTER TABLE emails ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS body_text TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS send_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE emails ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS emails_queue_idx ON emails (status, scheduled_for) WHERE status = 'queued';

COMMENT ON TABLE messaging_providers IS 'User-supplied email/SMS provider credentials (encrypted). Per-user provider credentials for outbound email and SMS.';

-- SMS delivery log (the original send-sms function wrote to this table, but it was never created)
CREATE TABLE IF NOT EXISTS sms_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  provider TEXT,
  message_sid TEXT,
  to_number TEXT NOT NULL,
  from_number TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  automation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_events_user_created_idx ON sms_events (user_id, created_at DESC);
ALTER TABLE sms_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sms_events_select_own" ON sms_events;
CREATE POLICY "sms_events_select_own" ON sms_events FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "sms_events_insert_own" ON sms_events;
CREATE POLICY "sms_events_insert_own" ON sms_events FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
