/*
  # Sequences, automation rules/runs, workflows, webhook endpoints, owner-only emails

  ## New tables (all owner-only RLS, separate SELECT/INSERT/UPDATE/DELETE policies)
  - `sequences`            : an email sequence definition (name, is_active)
  - `sequence_steps`       : ordered steps (position, delay_days after the previous step, subject, body, condition)
  - `sequence_enrollments` : one row per contact enrolled. ONE step tracker: `current_step` = number of steps
                             already queued; `completed_at` is set when current_step reaches the step count
                             (or the contact replied). `next_run_at` = when the next step is due.
  - `automation_rules`     : contact automation rules (trigger / conditions / actions as jsonb)
  - `automation_runs`      : execution history for rules and workflows
  - `workflows`            : visual workflow graphs (nodes / edges jsonb), evaluated by the condition evaluator
  - `webhook_endpoints`    : outbound (url + optional signing secret) and inbound (secret stored only as a
                             SHA-256 hash; the plaintext is shown once at creation) webhooks

  ## Security fix: `emails`
  The existing policy "Authenticated users can access emails" was USING (true) for every authenticated user.
  It is replaced by owner-only policies on `emails.user_id`. Server code uses the service role (bypasses RLS).
  Legacy rows with a NULL user_id are no longer visible to browser clients.

  Note: `lib/events/scheduledJobs.ts` queries a per-contact `sequence_steps` shape (contact_id, scheduled_for,
  status) that never existed; sequence progress now lives in `sequence_enrollments`.
*/


CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  position INT NOT NULL CHECK (position >= 0),
  name TEXT,
  delay_days INT NOT NULL DEFAULT 0 CHECK (delay_days >= 0),
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  condition TEXT NOT NULL DEFAULT 'no_response' CHECK (condition IN ('no_response', 'opened', 'clicked', 'always')),
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, position)
);

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 0 CHECK (current_step >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'failed')),
  next_run_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_seq ON sequence_steps(sequence_id, position);
CREATE INDEX IF NOT EXISTS idx_sequence_enroll_due ON sequence_enrollments(next_run_at) WHERE status = 'active' AND completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sequence_enroll_contact ON sequence_enrollments(user_id, contact_id);

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'followup',
  trigger JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  trigger TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  url TEXT,
  signing_secret TEXT,
  secret_hash TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (direction <> 'outbound' OR url ~* '^https://'),
  CHECK (direction <> 'inbound' OR secret_hash IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_automation_rules_user ON automation_rules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_runs_user ON automation_runs(user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints(user_id);

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sequences_select_own" ON sequences;
DROP POLICY IF EXISTS "sequences_insert_own" ON sequences;
DROP POLICY IF EXISTS "sequences_update_own" ON sequences;
DROP POLICY IF EXISTS "sequences_delete_own" ON sequences;
CREATE POLICY "sequences_select_own" ON sequences FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "sequences_insert_own" ON sequences FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "sequences_update_own" ON sequences FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "sequences_delete_own" ON sequences FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sequence_steps_select_own" ON sequence_steps;
DROP POLICY IF EXISTS "sequence_steps_insert_own" ON sequence_steps;
DROP POLICY IF EXISTS "sequence_steps_update_own" ON sequence_steps;
DROP POLICY IF EXISTS "sequence_steps_delete_own" ON sequence_steps;
CREATE POLICY "sequence_steps_select_own" ON sequence_steps FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "sequence_steps_insert_own" ON sequence_steps FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "sequence_steps_update_own" ON sequence_steps FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "sequence_steps_delete_own" ON sequence_steps FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sequence_enrollments_select_own" ON sequence_enrollments;
DROP POLICY IF EXISTS "sequence_enrollments_insert_own" ON sequence_enrollments;
DROP POLICY IF EXISTS "sequence_enrollments_update_own" ON sequence_enrollments;
DROP POLICY IF EXISTS "sequence_enrollments_delete_own" ON sequence_enrollments;
CREATE POLICY "sequence_enrollments_select_own" ON sequence_enrollments FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "sequence_enrollments_insert_own" ON sequence_enrollments FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "sequence_enrollments_update_own" ON sequence_enrollments FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "sequence_enrollments_delete_own" ON sequence_enrollments FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "automation_rules_select_own" ON automation_rules;
DROP POLICY IF EXISTS "automation_rules_insert_own" ON automation_rules;
DROP POLICY IF EXISTS "automation_rules_update_own" ON automation_rules;
DROP POLICY IF EXISTS "automation_rules_delete_own" ON automation_rules;
CREATE POLICY "automation_rules_select_own" ON automation_rules FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "automation_rules_insert_own" ON automation_rules FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "automation_rules_update_own" ON automation_rules FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "automation_rules_delete_own" ON automation_rules FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "automation_runs_select_own" ON automation_runs;
DROP POLICY IF EXISTS "automation_runs_insert_own" ON automation_runs;
DROP POLICY IF EXISTS "automation_runs_update_own" ON automation_runs;
DROP POLICY IF EXISTS "automation_runs_delete_own" ON automation_runs;
CREATE POLICY "automation_runs_select_own" ON automation_runs FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "automation_runs_insert_own" ON automation_runs FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "automation_runs_update_own" ON automation_runs FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "automation_runs_delete_own" ON automation_runs FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflows_select_own" ON workflows;
DROP POLICY IF EXISTS "workflows_insert_own" ON workflows;
DROP POLICY IF EXISTS "workflows_update_own" ON workflows;
DROP POLICY IF EXISTS "workflows_delete_own" ON workflows;
CREATE POLICY "workflows_select_own" ON workflows FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "workflows_insert_own" ON workflows FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "workflows_update_own" ON workflows FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "workflows_delete_own" ON workflows FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_endpoints_select_own" ON webhook_endpoints;
DROP POLICY IF EXISTS "webhook_endpoints_insert_own" ON webhook_endpoints;
DROP POLICY IF EXISTS "webhook_endpoints_update_own" ON webhook_endpoints;
DROP POLICY IF EXISTS "webhook_endpoints_delete_own" ON webhook_endpoints;
CREATE POLICY "webhook_endpoints_select_own" ON webhook_endpoints FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "webhook_endpoints_insert_own" ON webhook_endpoints FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "webhook_endpoints_update_own" ON webhook_endpoints FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "webhook_endpoints_delete_own" ON webhook_endpoints FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- emails: replace the USING (true) policy with owner-only policies
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can access emails" ON emails;
DROP POLICY IF EXISTS "emails_select_own" ON emails;
DROP POLICY IF EXISTS "emails_insert_own" ON emails;
DROP POLICY IF EXISTS "emails_update_own" ON emails;
DROP POLICY IF EXISTS "emails_delete_own" ON emails;
CREATE POLICY "emails_select_own" ON emails FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "emails_insert_own" ON emails FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "emails_update_own" ON emails FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
-- Only queued/draft rows can be removed (cancel a scheduled send); sent history is kept.
CREATE POLICY "emails_delete_own" ON emails FOR DELETE TO authenticated USING (user_id = (select auth.uid()) AND status IN ('queued', 'draft'));
