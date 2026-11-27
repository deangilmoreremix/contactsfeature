/*
  # Contact view enhancements

  ## What changes
  - `kanban_column_configs.card_config` (JSONB, default '{}'): per-user Kanban card options
    { "fields": { email, phone, company, aiScore, tags, lastConnected },
      "hideEmptyColumns": boolean, "collapsedColumns": [column ids] }.
    The app falls back to a localStorage copy when this column is missing, so deploying the
    front end before this migration is safe.

  ## What deliberately does NOT change
  - Companies view: derived from contacts in the browser (no table).
  - Custom field editor: `custom_field_definitions` already has `display_order` (field order) and
    `settings` JSONB (option labels/colours live in `settings.optionMeta`), and `options` keeps the
    option values. No columns needed.
  - Rich-text notes: Markdown is stored in the existing `contact_notes.body` column.
  - Pinned dashboard charts: kept per user in the browser (localStorage).

  ## Security
  RLS is already enabled on `kanban_column_configs` with separate per-command ownership policies
  (see 20260121165821_optimize_rls_policies_part2.sql); the new column is covered by them.
  Re-asserting ENABLE ROW LEVEL SECURITY below is idempotent.
*/

ALTER TABLE IF EXISTS kanban_column_configs ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS kanban_column_configs
  ADD COLUMN IF NOT EXISTS card_config JSONB DEFAULT '{}'::jsonb;
