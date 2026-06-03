export const up = async (sql: any) => {
  await sql`
    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      field_type TEXT NOT NULL,
      options JSONB,
      is_required BOOLEAN DEFAULT false,
      default_value JSONB,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      description TEXT,
      placeholder TEXT,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_field_values (
      id TEXT PRIMARY KEY,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      field_id TEXT NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
      value JSONB,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE(contact_id, field_id)
    );

    CREATE TABLE IF NOT EXISTS contact_attachments (
      id TEXT PRIMARY KEY,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_timeline (
      id TEXT PRIMARY KEY,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata JSONB,
      user_name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_user ON custom_field_definitions(user_id);
    CREATE INDEX IF NOT EXISTS idx_custom_field_values_contact ON custom_field_values(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_attachments_contact ON contact_attachments(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_timeline_contact ON contact_timeline(contact_id);
  `;
};
