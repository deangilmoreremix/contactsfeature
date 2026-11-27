/*
  # Contact composite fields (extra emails, extra phones, links, address)

  Twenty-style composite record fields. The primary email/phone stay in the existing `email` /
  `phone` columns; the new columns hold everything else.

  ## Changes to `contacts`
  - `additional_emails` jsonb  DEFAULT '[]'  -- array of {label, value}
  - `additional_phones` jsonb  DEFAULT '[]'  -- array of {label, value}
  - `links`             jsonb  DEFAULT '[]'  -- array of {label, url} (http/https only, enforced in the app)
  - `address`           jsonb  DEFAULT '{}'  -- object {street, city, state, postalCode, country}

  CHECK constraints keep the JSON shape sane (array vs object) and cap list sizes.
  A GIN index on `additional_emails` supports "find contact by any email" lookups.

  ## Security
  - No RLS changes: existing policies on `contacts` already cover every column, so the new columns
    are protected by the same ownership policies. RLS stays enabled (re-asserted below, idempotent).
*/

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS additional_emails jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS additional_phones jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_additional_emails_is_array' AND conrelid = 'contacts'::regclass) THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_additional_emails_is_array
      CHECK (jsonb_typeof(additional_emails) = 'array' AND jsonb_array_length(additional_emails) <= 20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_additional_phones_is_array' AND conrelid = 'contacts'::regclass) THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_additional_phones_is_array
      CHECK (jsonb_typeof(additional_phones) = 'array' AND jsonb_array_length(additional_phones) <= 20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_links_is_array' AND conrelid = 'contacts'::regclass) THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_links_is_array
      CHECK (jsonb_typeof(links) = 'array' AND jsonb_array_length(links) <= 20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_address_is_object' AND conrelid = 'contacts'::regclass) THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_address_is_object
      CHECK (jsonb_typeof(address) = 'object');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS contacts_additional_emails_gin_idx ON contacts USING gin (additional_emails jsonb_path_ops);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
