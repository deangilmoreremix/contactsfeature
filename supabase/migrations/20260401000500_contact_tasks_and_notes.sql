/*
  # Contact tasks and notes

  ## contact_tasks
  Follow-ups attached to a contact: title, type (todo | call | email | meeting | note), optional
  due date, open/done status. Tasks with a due date also appear on the Contacts calendar.

  ## contact_notes
  Free-text notes attached to a contact (pinnable).

  ## Security
  RLS on both tables with separate SELECT / INSERT / UPDATE / DELETE policies. Rows belong to
  `user_id`; inserts additionally require that the contact belongs to the caller.
*/

CREATE TABLE IF NOT EXISTS contact_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'todo' CHECK (task_type IN ('todo', 'call', 'email', 'meeting', 'note')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_tasks_contact ON contact_tasks(contact_id, status);
CREATE INDEX IF NOT EXISTS idx_contact_tasks_user_due ON contact_tasks(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id, created_at DESC);

ALTER TABLE contact_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_tasks_select_own" ON contact_tasks;
DROP POLICY IF EXISTS "contact_tasks_insert_own" ON contact_tasks;
DROP POLICY IF EXISTS "contact_tasks_update_own" ON contact_tasks;
DROP POLICY IF EXISTS "contact_tasks_delete_own" ON contact_tasks;
DROP POLICY IF EXISTS "contact_notes_select_own" ON contact_notes;
DROP POLICY IF EXISTS "contact_notes_insert_own" ON contact_notes;
DROP POLICY IF EXISTS "contact_notes_update_own" ON contact_notes;
DROP POLICY IF EXISTS "contact_notes_delete_own" ON contact_notes;

CREATE POLICY "contact_tasks_select_own" ON contact_tasks
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "contact_tasks_insert_own" ON contact_tasks
  FOR INSERT TO authenticated WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_id AND c.user_id = (select auth.uid()))
  );
CREATE POLICY "contact_tasks_update_own" ON contact_tasks
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "contact_tasks_delete_own" ON contact_tasks
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

CREATE POLICY "contact_notes_select_own" ON contact_notes
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "contact_notes_insert_own" ON contact_notes
  FOR INSERT TO authenticated WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_id AND c.user_id = (select auth.uid()))
  );
CREATE POLICY "contact_notes_update_own" ON contact_notes
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "contact_notes_delete_own" ON contact_notes
  FOR DELETE TO authenticated USING (user_id = (select auth.uid()));
