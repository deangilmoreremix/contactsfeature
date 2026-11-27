/*
  # Private storage bucket for document analysis uploads

  Large documents (up to 25 MB) are uploaded by the browser straight to Supabase Storage (bypassing the
  ~6 MB Netlify request-body limit), then analysed by the `document-analyze` function, which verifies the
  object path, creates a short-lived signed URL with the service role and (unless `keep: true`) deletes the
  object afterwards.

  1. New bucket
     - `contact-documents` (private), 25 MB limit, pdf / docx / txt / md / csv only
  2. Security
     - Owner-scoped policies on storage.objects: the first path segment must equal auth.uid()
       (`<uid>/<uuid>/<filename>`). Separate SELECT / INSERT / UPDATE / DELETE policies.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-documents',
  'contact-documents',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "contact_documents_select_own" ON storage.objects;
DROP POLICY IF EXISTS "contact_documents_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "contact_documents_update_own" ON storage.objects;
DROP POLICY IF EXISTS "contact_documents_delete_own" ON storage.objects;

CREATE POLICY "contact_documents_select_own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'contact-documents'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
CREATE POLICY "contact_documents_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'contact-documents'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
CREATE POLICY "contact_documents_update_own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'contact-documents'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
CREATE POLICY "contact_documents_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'contact-documents'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
