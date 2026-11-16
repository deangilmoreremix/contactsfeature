/*
  # OpenAI Batch API runs (bulk enrichment + embedding indexing)

  `ai_batches` tracks one Batch API job per user request (`/v1/responses` for bulk contact
  enrichment, `/v1/embeddings` for semantic-search indexing). The scheduled poller applies results
  exactly once (`applied_at`). Writes happen with the service role from Netlify functions;
  users can read (and nothing else) their own rows.
*/

CREATE TABLE IF NOT EXISTS ai_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('enrich', 'embed')),
  openai_batch_id TEXT NOT NULL UNIQUE,
  input_file_id TEXT,
  status TEXT NOT NULL DEFAULT 'validating',
  total INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  contact_ids UUID[] NOT NULL DEFAULT '{}',
  error TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_batches_user_created_idx ON ai_batches (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_batches_open_idx ON ai_batches (status) WHERE applied_at IS NULL;

ALTER TABLE ai_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_batches_select_own" ON ai_batches;
CREATE POLICY "ai_batches_select_own" ON ai_batches FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
-- no INSERT/UPDATE/DELETE policies: only the service role (Netlify functions) writes
