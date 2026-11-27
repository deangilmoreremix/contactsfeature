/*
  # Fix RLS for contact enhancement tables (supersedes 20260101000001 policies)

  ## Why
  The original migration used `FOR ALL` policies without WITH CHECK, a SELECT-only
  timeline policy with no ownership check (and no INSERT, so timeline writes were
  denied), a public attachments bucket, and no guards for re-runs.

  ## Changes
  1. contact_timeline: add `user_id` (backfilled from the owning contact), ownership
     SELECT / INSERT / UPDATE / DELETE policies.
  2. custom_field_definitions, custom_field_values, contact_attachments, view_presets,
     kanban_configs, view_preferences: replace `FOR ALL` with separate per-command
     policies using `(select auth.uid())`; child-table writes additionally require the
     parent contact to belong to the caller.
  3. contact-attachments bucket becomes private; storage policies are scoped to the
     first path segment == caller's user id (objects are uploaded as `{user_id}/...`).

  ## Notes
  - `kanban_configs` and `view_preferences` duplicate the older
    `kanban_column_configs` / `table_column_preferences` tables; the app uses the
    older tables, these are kept (empty) and only have their policies corrected.
*/

-- 1. contact_timeline.user_id -------------------------------------------------
ALTER TABLE contact_timeline
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE contact_timeline t
SET user_id = c.user_id
FROM contacts c
WHERE t.contact_id = c.id AND t.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_contact_timeline_user ON contact_timeline(user_id);

-- 2. Drop old policies --------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own custom field definitions" ON custom_field_definitions;
DROP POLICY IF EXISTS "Users can manage their own custom field values" ON custom_field_values;
DROP POLICY IF EXISTS "Users can manage their own attachments" ON contact_attachments;
DROP POLICY IF EXISTS "Users can view timeline for their contacts" ON contact_timeline;
DROP POLICY IF EXISTS "Users can manage their own view presets" ON view_presets;
DROP POLICY IF EXISTS "Users can manage their own kanban configs" ON kanban_configs;
DROP POLICY IF EXISTS "Users can manage their own view preferences" ON view_preferences;

-- 3. custom_field_definitions -------------------------------------------------
CREATE POLICY "cfd_select_own" ON custom_field_definitions
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "cfd_insert_own" ON custom_field_definitions
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "cfd_update_own" ON custom_field_definitions
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "cfd_delete_own" ON custom_field_definitions
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- 4. custom_field_values (parent contact must be owned) ----------------------
CREATE POLICY "cfv_select_own" ON custom_field_values
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "cfv_insert_own" ON custom_field_values
  FOR INSERT TO authenticated WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_id AND c.user_id = (select auth.uid()))
  );
CREATE POLICY "cfv_update_own" ON custom_field_values
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid()))
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_id AND c.user_id = (select auth.uid()))
  );
CREATE POLICY "cfv_delete_own" ON custom_field_values
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- 5. contact_attachments ------------------------------------------------------
CREATE POLICY "ca_select_own" ON contact_attachments
  FOR SELECT TO authenticated USING (uploaded_by = (select auth.uid()));
CREATE POLICY "ca_insert_own" ON contact_attachments
  FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = (select auth.uid())
    AND EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_id AND c.user_id = (select auth.uid()))
  );
CREATE POLICY "ca_update_own" ON contact_attachments
  FOR UPDATE TO authenticated USING (uploaded_by = (select auth.uid()))
  WITH CHECK (uploaded_by = (select auth.uid()));
CREATE POLICY "ca_delete_own" ON contact_attachments
  FOR DELETE TO authenticated USING (uploaded_by = (select auth.uid()));

-- 6. contact_timeline ---------------------------------------------------------
CREATE POLICY "ct_select_own" ON contact_timeline
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "ct_insert_own" ON contact_timeline
  FOR INSERT TO authenticated WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_id AND c.user_id = (select auth.uid()))
  );
CREATE POLICY "ct_update_own" ON contact_timeline
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "ct_delete_own" ON contact_timeline
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- 7. view_presets / kanban_configs / view_preferences -------------------------
CREATE POLICY "vp_select_own" ON view_presets
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "vp_insert_own" ON view_presets
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "vp_update_own" ON view_presets
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "vp_delete_own" ON view_presets
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

CREATE POLICY "kc_select_own" ON kanban_configs
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "kc_insert_own" ON kanban_configs
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "kc_update_own" ON kanban_configs
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "kc_delete_own" ON kanban_configs
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

CREATE POLICY "vpref_select_own" ON view_preferences
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "vpref_insert_own" ON view_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "vpref_update_own" ON view_preferences
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "vpref_delete_own" ON view_preferences
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- 8. Private attachments bucket + owner-scoped storage policies ---------------
UPDATE storage.buckets SET public = false WHERE id = 'contact-attachments';

DROP POLICY IF EXISTS "Public can view contact attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contact attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

CREATE POLICY "contact_attachments_select_own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'contact-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
CREATE POLICY "contact_attachments_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'contact-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
CREATE POLICY "contact_attachments_update_own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'contact-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
CREATE POLICY "contact_attachments_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'contact-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
