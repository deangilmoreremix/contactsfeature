/*
  # Contact duplicate detection and merge

  ## find_contact_duplicates(p_contact_ids uuid[] DEFAULT NULL)
  Returns groups of the caller's contacts that share a normalized email, a normalized phone
  (last 10 digits, min 7 digits) or the same name + company. Runs as the caller (SECURITY
  INVOKER) so RLS limits it to their own contacts. When p_contact_ids is given, only groups
  that contain one of those contacts are returned.

  ## merge_contacts(p_winner, p_losers, p_overrides, p_dry_run)
  Merges 2-9 contacts into the winner, as the caller (RLS applies; every id must be visible):
  - empty winner fields are filled from the first loser that has a value
  - tags / sources are unioned; socialprofiles / customfields are merged (winner wins);
    notes are concatenated; isfavorite is OR-ed
  - p_overrides {"field": "<record id>"} forces a field's value from a specific record
  - related rows (timeline, attachments, custom field values, enrichments, deals, ...) are
    re-pointed to the winner; rows that would violate a uniqueness rule are dropped
  - the losers are deleted, the winner updated, and a 'merged' timeline entry records the
    merged ids and snapshots of the removed contacts (so nothing is silently lost)
  - p_dry_run = true returns the merged record without writing anything
  Works against either contacts column naming (camelCase/lowercase or snake_case) because it
  reads rows through to_jsonb().
*/

CREATE OR REPLACE FUNCTION public._merge_jsonb_empty(v jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT v IS NULL
      OR v = 'null'::jsonb
      OR v = '""'::jsonb
      OR v = '[]'::jsonb
      OR v = '{}'::jsonb
$$;

CREATE OR REPLACE FUNCTION public.find_contact_duplicates(p_contact_ids uuid[] DEFAULT NULL)
RETURNS TABLE (reason text, match_key text, contact_ids uuid[])
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT c.id, to_jsonb(c) AS j FROM contacts c
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

CREATE OR REPLACE FUNCTION public.merge_contacts(
  p_winner uuid,
  p_losers uuid[],
  p_overrides jsonb DEFAULT '{}'::jsonb,
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c_skip constant text[] := ARRAY['id', 'createdat', 'created_at', 'updatedat', 'updated_at', 'user_id', 'position'];
  c_child_tables constant text[] := ARRAY[
    'contact_timeline', 'contact_attachments', 'custom_field_values', 'contact_enrichments',
    'deals', 'contact_agent_settings', 'emails', 'agent_logs', 'agent_threads', 'agent_runs',
    'autopilot_state', 'calendar_events', 'contact_notes', 'contact_tasks'
  ];
  v_loser_count int := coalesce(array_length(p_losers, 1), 0);
  v_win jsonb;
  v_merged jsonb;
  v_rows jsonb := '{}'::jsonb;        -- id -> row snapshot
  v_row jsonb;
  v_loser uuid;
  v_key text;
  v_lkey text;
  v_cur jsonb;
  v_val jsonb;
  v_set text := '';
  v_tbl text;
  v_n int;
  v_total int;
  v_repointed jsonb := '{}'::jsonb;
  v_tid tid;
  v_snapshots jsonb := '[]'::jsonb;
  v_result jsonb;
  v_user uuid;
BEGIN
  IF p_winner IS NULL OR v_loser_count < 1 OR v_loser_count > 8 THEN
    RAISE EXCEPTION 'merge_contacts needs a winner and 1 to 8 other contacts';
  END IF;
  IF p_winner = ANY (p_losers) THEN
    RAISE EXCEPTION 'The winner cannot also be merged into itself';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_losers) x) <> v_loser_count THEN
    RAISE EXCEPTION 'Duplicate ids in the contacts to merge';
  END IF;

  SELECT to_jsonb(c) INTO v_win FROM contacts c WHERE c.id = p_winner;
  IF v_win IS NULL THEN
    RAISE EXCEPTION 'Winner contact not found or not accessible';
  END IF;
  v_rows := jsonb_build_object(p_winner::text, v_win);
  v_merged := v_win;

  FOREACH v_loser IN ARRAY p_losers LOOP
    SELECT to_jsonb(c) INTO v_row FROM contacts c WHERE c.id = v_loser;
    IF v_row IS NULL THEN
      RAISE EXCEPTION 'Contact % not found or not accessible', v_loser;
    END IF;
    v_rows := v_rows || jsonb_build_object(v_loser::text, v_row);
    v_snapshots := v_snapshots || jsonb_build_array(v_row);

    FOR v_key IN SELECT jsonb_object_keys(v_row) LOOP
      v_lkey := lower(v_key);
      CONTINUE WHEN v_lkey = ANY (c_skip);
      v_cur := v_merged -> v_key;
      v_val := v_row -> v_key;
      CONTINUE WHEN public._merge_jsonb_empty(v_val);

      IF v_lkey IN ('tags', 'sources') AND jsonb_typeof(v_val) = 'array' THEN
        IF public._merge_jsonb_empty(v_cur) OR jsonb_typeof(v_cur) <> 'array' THEN
          v_merged := jsonb_set(v_merged, ARRAY[v_key], v_val);
        ELSE
          v_merged := jsonb_set(v_merged, ARRAY[v_key], (
            SELECT coalesce(jsonb_agg(e ORDER BY first_pos), '[]'::jsonb)
              FROM (
                SELECT e, min(pos) AS first_pos
                  FROM jsonb_array_elements(v_cur || v_val) WITH ORDINALITY AS t(e, pos)
                 GROUP BY e
              ) s
          ));
        END IF;
      ELSIF v_lkey IN ('socialprofiles', 'customfields', 'social_profiles', 'custom_fields')
            AND jsonb_typeof(v_val) = 'object' THEN
        IF jsonb_typeof(v_cur) = 'object' THEN
          v_merged := jsonb_set(v_merged, ARRAY[v_key], v_val || v_cur);  -- existing keys win
        ELSE
          v_merged := jsonb_set(v_merged, ARRAY[v_key], v_val);
        END IF;
      ELSIF v_lkey = 'notes' AND jsonb_typeof(v_val) = 'string' THEN
        IF public._merge_jsonb_empty(v_cur) THEN
          v_merged := jsonb_set(v_merged, ARRAY[v_key], v_val);
        ELSIF v_cur <> v_val THEN
          v_merged := jsonb_set(v_merged, ARRAY[v_key], to_jsonb((v_cur #>> '{}') || E'\n\n' || (v_val #>> '{}')));
        END IF;
      ELSIF v_lkey IN ('isfavorite', 'is_favorite') THEN
        IF v_val = 'true'::jsonb THEN
          v_merged := jsonb_set(v_merged, ARRAY[v_key], v_val);
        END IF;
      ELSIF public._merge_jsonb_empty(v_cur) THEN
        v_merged := jsonb_set(v_merged, ARRAY[v_key], v_val);
      END IF;
    END LOOP;
  END LOOP;

  -- Explicit per-field choices: {"field": "<record id>"}
  FOR v_key, v_cur IN SELECT key, value FROM jsonb_each(coalesce(p_overrides, '{}'::jsonb)) LOOP
    CONTINUE WHEN lower(v_key) = ANY (c_skip);
    v_row := v_rows -> (v_cur #>> '{}');
    IF v_row IS NOT NULL AND v_row ? v_key THEN
      v_merged := jsonb_set(v_merged, ARRAY[v_key], v_row -> v_key);
    END IF;
  END LOOP;

  IF p_dry_run THEN
    RETURN jsonb_build_object('dry_run', true, 'winner_id', p_winner, 'merged', v_merged);
  END IF;

  -- 1. Re-point related rows (before deleting the losers so ON DELETE CASCADE can't remove them).
  FOREACH v_tbl IN ARRAY c_child_tables LOOP
    CONTINUE WHEN to_regclass(format('public.%I', v_tbl)) IS NULL;
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = v_tbl
         AND column_name = 'contact_id' AND data_type = 'uuid'
    );
    v_n := 0;
    FOR v_tid IN EXECUTE format('SELECT ctid FROM public.%I WHERE contact_id = ANY ($1)', v_tbl) USING p_losers LOOP
      BEGIN
        EXECUTE format('UPDATE public.%I SET contact_id = $1 WHERE ctid = $2', v_tbl) USING p_winner, v_tid;
        v_n := v_n + 1;
      EXCEPTION WHEN unique_violation THEN
        -- the winner already has an equivalent row: keep the winner's, drop the loser's
        EXECUTE format('DELETE FROM public.%I WHERE ctid = $1', v_tbl) USING v_tid;
      END;
    END LOOP;
    IF v_n > 0 THEN
      v_repointed := v_repointed || jsonb_build_object(v_tbl, v_n);
    END IF;
  END LOOP;

  -- 2. Remove the merged contacts (frees unique values such as email for the winner).
  DELETE FROM contacts WHERE id = ANY (p_losers);
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total <> v_loser_count THEN
    RAISE EXCEPTION 'Could not remove all merged contacts (%/% removed)', v_total, v_loser_count;
  END IF;

  -- 3. Write the merged values onto the winner (only real columns that changed).
  FOR v_key IN SELECT jsonb_object_keys(v_merged) LOOP
    CONTINUE WHEN lower(v_key) = ANY (c_skip);
    CONTINUE WHEN (v_merged -> v_key) IS NOT DISTINCT FROM (v_win -> v_key);
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = v_key
    );
    v_set := v_set || CASE WHEN v_set = '' THEN '' ELSE ', ' END
             || format('%I = (jsonb_populate_record(NULL::public.contacts, $2)).%I', v_key, v_key);
  END LOOP;
  IF v_set <> '' THEN
    EXECUTE 'UPDATE public.contacts SET ' || v_set || ' WHERE id = $1' USING p_winner, v_merged;
  END IF;

  -- 4. Audit trail on the winner.
  v_user := coalesce(auth.uid(), nullif(v_win ->> 'user_id', '')::uuid);
  IF to_regclass('public.contact_timeline') IS NOT NULL AND v_user IS NOT NULL THEN
    EXECUTE 'INSERT INTO public.contact_timeline (contact_id, user_id, activity_type, description, metadata, user_name)
             VALUES ($1, $2, ''merged'', $3, $4, ''Merge'')'
      USING p_winner, v_user,
            format('Merged %s contact(s) into this record', v_loser_count),
            jsonb_build_object('merged_ids', to_jsonb(p_losers), 'snapshots', v_snapshots, 'repointed', v_repointed);
  END IF;

  SELECT jsonb_build_object(
           'dry_run', false,
           'winner_id', p_winner,
           'merged_count', v_loser_count,
           'repointed', v_repointed,
           'merged', to_jsonb(c))
    INTO v_result FROM contacts c WHERE c.id = p_winner;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_contacts(uuid, uuid[], jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_contact_duplicates(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_contacts(uuid, uuid[], jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_contact_duplicates(uuid[]) TO authenticated;
