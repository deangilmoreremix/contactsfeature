/*
  # Contact enrichments (web-search backed)

  Stores the result of OpenAI Responses `web_search` enrichment runs per contact:
  structured findings, cited sources and confidence, so results are auditable and
  re-appliable. One row per OpenAI response id.

  Security: RLS enabled; separate SELECT/INSERT/UPDATE/DELETE policies; writes also
  require that the contact belongs to the caller.
*/

CREATE TABLE IF NOT EXISTS contact_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  matched BOOLEAN NOT NULL DEFAULT false,
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  applied_fields TEXT[] NOT NULL DEFAULT '{}',
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (response_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_enrichments_contact ON contact_enrichments(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_enrichments_user ON contact_enrichments(user_id);

ALTER TABLE contact_enrichments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ce_select_own" ON contact_enrichments;
DROP POLICY IF EXISTS "ce_insert_own" ON contact_enrichments;
DROP POLICY IF EXISTS "ce_update_own" ON contact_enrichments;
DROP POLICY IF EXISTS "ce_delete_own" ON contact_enrichments;

CREATE POLICY "ce_select_own" ON contact_enrichments
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "ce_insert_own" ON contact_enrichments
  FOR INSERT TO authenticated WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_id AND c.user_id = (select auth.uid()))
  );
CREATE POLICY "ce_update_own" ON contact_enrichments
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "ce_delete_own" ON contact_enrichments
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));
