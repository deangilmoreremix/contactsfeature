/*
  # Custom field types

  Widens custom_field_definitions.field_type with 'currency', 'rating' and 'datetime', and adds a
  `settings` JSONB column (e.g. { "currency": "USD", "decimals": 0 }).

  Values are stored on the contact in `contacts.customFields` keyed by the field label, so the
  same values drive filters, grouping, kanban, calendar, import/export and merge. The
  custom_field_values table from 20260101000001 is no longer used by the app.
*/

ALTER TABLE custom_field_definitions ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

DO $$
DECLARE
  c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'custom_field_definitions'::regclass AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%field_type%'
  LOOP
    EXECUTE format('ALTER TABLE custom_field_definitions DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_field_type_check CHECK (
      field_type IN ('text', 'number', 'boolean', 'date', 'datetime', 'select', 'multiselect',
                     'url', 'email', 'phone', 'currency', 'rating')
    );
END $$;
