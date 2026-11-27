/*
  # AI background jobs (OpenAI Responses background mode + webhooks)

  1. New table `ai_jobs`
    - One row per background Responses run started by a Netlify function (contact enrichment,
      deal health, sales forecast). `response_id` is the OpenAI response id (unique).
    - `status`: queued | in_progress | completed | failed | cancelled | incomplete
    - `result`: kind-specific JSON. At creation it may hold `context` (inputs needed to finish the job);
      on completion it holds the final result.
    - `openai-webhook` (service role, signature-verified) finishes rows when OpenAI sends
      response.completed / failed / cancelled / incomplete. Status endpoints fall back to polling
      the response when no webhook has arrived yet.

  2. Security
    - RLS enabled. Users may SELECT and DELETE their own rows.
    - INSERT and UPDATE are intentionally service-role only (no policies): users must not be able to
      forge job results. The service role bypasses RLS.
*/

CREATE TABLE IF NOT EXISTS ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  response_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'in_progress', 'completed', 'failed', 'cancelled', 'incomplete')),
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT ai_jobs_response_id_key UNIQUE (response_id)
);

CREATE INDEX IF NOT EXISTS ai_jobs_user_created_idx ON ai_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_jobs_user_kind_idx ON ai_jobs (user_id, kind);

ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_jobs_select_own" ON ai_jobs;
CREATE POLICY "ai_jobs_select_own" ON ai_jobs
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "ai_jobs_delete_own" ON ai_jobs;
CREATE POLICY "ai_jobs_delete_own" ON ai_jobs
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- No INSERT / UPDATE policies on purpose: only the service role (Netlify functions) writes rows.
