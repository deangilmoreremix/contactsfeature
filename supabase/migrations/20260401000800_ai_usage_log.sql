/*
  # AI usage log (rate limiting + cost visibility for the browser AI proxy)

  `ai-respond` / `ai-stream` Netlify functions write one row per request using the service role and
  count recent rows per user to enforce a per-minute limit. Users can read their own usage.
*/

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  role TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  status TEXT NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_log_user_created_idx ON ai_usage_log (user_id, created_at DESC);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_log_select_own" ON ai_usage_log;
CREATE POLICY "ai_usage_log_select_own" ON ai_usage_log
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
-- No INSERT/UPDATE/DELETE policies: only the service role (Netlify functions) writes.
