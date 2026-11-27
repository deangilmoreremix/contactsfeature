/*
  # Contact card ordering for Kanban

  Adds `position` (double precision) to contacts so cards keep their order inside a
  Kanban column. Fractional positions let a drop write a single row (midpoint insertion).
  NULL = never manually ordered (falls back to the list's sort order).
*/

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS position DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_contacts_user_position ON contacts(user_id, position);
