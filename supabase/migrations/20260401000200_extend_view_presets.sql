/*
  # Extend view_presets for full saved contact views

  Saved views now capture everything the Contacts screen can be configured with:
  nested filter groups, quick filters, the view type, column widths and grouping.

  ## Changes
  - view_presets: add filter_groups, quick_filters, view_type, column_widths,
    visibility ('personal' | 'team')
  - RLS from 20260401000000 is unchanged (per-user). 'team' visibility is stored but
    only the owner can read a preset until an organization/team model exists.
*/

ALTER TABLE view_presets ADD COLUMN IF NOT EXISTS filter_groups JSONB;
ALTER TABLE view_presets ADD COLUMN IF NOT EXISTS quick_filters JSONB;
ALTER TABLE view_presets ADD COLUMN IF NOT EXISTS view_type TEXT;
ALTER TABLE view_presets ADD COLUMN IF NOT EXISTS column_widths JSONB;
ALTER TABLE view_presets ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'personal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'view_presets_visibility_check'
  ) THEN
    ALTER TABLE view_presets
      ADD CONSTRAINT view_presets_visibility_check CHECK (visibility IN ('personal', 'team'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_view_presets_user_object ON view_presets(user_id, object_type);
