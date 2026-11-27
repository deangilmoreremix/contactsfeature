/*
  # Contact soft delete (Trash)

  ## Changes
  - contacts.deleted_at (timestamptz, NULL = active). "Delete" in the app now stamps this column;
    the Trash lists rows where it is set, Restore clears it, and "Delete permanently" removes the row.
  - Index on (user_id, deleted_at) so both the active list and the Trash list stay cheap.
  - find_contact_duplicates() and match_contacts() (semantic search) ignore deleted rows.

  ## Security
  - RLS is already enabled on contacts with owner-only SELECT / INSERT / UPDATE / DELETE policies
    (20251118160400_add_user_id_columns_and_rls_policies.sql). They are intentionally NOT touched:
    soft delete is an ordinary UPDATE of the owner's own row, permanent delete an ordinary DELETE.

  ## Notes
  - contacts.email keeps its UNIQUE constraint, so a contact in the Trash still reserves its email
    until it is restored or permanently deleted.
*/

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contacts_user_deleted_at ON contacts (user_id, deleted_at);

-- Duplicate finder: deleted contacts are never offered for merge.
CREATE OR REPLACE FUNCTION public.find_contact_duplicates(p_contact_ids uuid[] DEFAULT NULL)
RETURNS TABLE (reason text, match_key text, contact_ids uuid[])
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT c.id, to_jsonb(c) AS j FROM contacts c WHERE c.deleted_at IS NULL
  ),
  keys AS (
    SELECT id, 'email'::text AS kind, lower(btrim(j->>'email')) AS k
      FROM base WHERE nullif(btrim(coalesce(j->>'email', '')), '') IS NOT NULL
    UNION ALL
    SELECT id, 'phone', right(regexp_replace(coalesce(j->>'phone', ''), '\D', '', 'g'), 10)
      FROM base WHERE length(regexp_replace(coalesce(j->>'phone', ''), '\D', '', 'g')) >= 7
    UNION ALL
    SELECT id, 'name_company',
           lower(btrim(coalesce(nullif(btrim(coalesce(j->>'name', '')), ''),
                                btrim(coalesce(j->>'firstname', j->>'first_name', '') || ' ' ||
                                      coalesce(j->>'lastname', j->>'last_name', '')))))
           || '|' || lower(btrim(coalesce(j->>'company', '')))
      FROM base
     WHERE nullif(btrim(coalesce(j->>'company', '')), '') IS NOT NULL
       AND (nullif(btrim(coalesce(j->>'name', '')), '') IS NOT NULL
            OR nullif(btrim(coalesce(j->>'firstname', j->>'first_name', '')), '') IS NOT NULL)
  )
  SELECT kind, k, array_agg(DISTINCT id)
    FROM keys
   GROUP BY kind, k
  HAVING count(DISTINCT id) > 1
     AND (p_contact_ids IS NULL OR array_agg(DISTINCT id) && p_contact_ids)
$$;

-- Semantic search: skip embeddings of deleted contacts.
CREATE OR REPLACE FUNCTION match_contacts(query_embedding vector(1536), match_count int DEFAULT 20)
RETURNS TABLE (contact_id uuid, similarity float)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT ce.contact_id, (1 - (ce.embedding <=> query_embedding))::float AS similarity
  FROM contact_embeddings ce
  JOIN contacts c ON c.id = ce.contact_id
  WHERE ce.user_id = (SELECT auth.uid())
    AND c.deleted_at IS NULL
  ORDER BY ce.embedding <=> query_embedding
  LIMIT least(greatest(match_count, 1), 100);
$$;
