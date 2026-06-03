-- Twenty CRM Feature Port: Contact Enhancements
-- Creates tables for custom fields, attachments, timeline, and view presets
-- Compatible with Supabase + SmartCRM stack

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom field definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'date', 'select', 'multiselect', 'url', 'email', 'phone')),
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  default_value JSONB,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  placeholder TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Custom field values per contact
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value JSONB,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(contact_id, field_id)
);

-- Contact attachments (polymorphic storage)
CREATE TABLE IF NOT EXISTS contact_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Contact activity timeline
CREATE TABLE IF NOT EXISTS contact_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Saved view presets
CREATE TABLE IF NOT EXISTS view_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  object_type TEXT NOT NULL DEFAULT 'contacts',
  filters JSONB,
  sorts JSONB,
  group_by TEXT,
  column_order JSONB,
  visible_columns JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kanban view configurations
CREATE TABLE IF NOT EXISTS kanban_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL DEFAULT 'contacts',
  column_field TEXT NOT NULL,
  columns JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, object_type)
);

-- View preferences (table columns, etc.)
CREATE TABLE IF NOT EXISTS view_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL DEFAULT 'contacts',
  visible_columns JSONB,
  column_order JSONB,
  column_widths JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, object_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_user ON custom_field_definitions(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_contact ON custom_field_values(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_attachments_contact ON contact_attachments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_timeline_contact ON contact_timeline(contact_id);
CREATE INDEX IF NOT EXISTS idx_view_presets_user ON view_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_configs_user ON kanban_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_view_preferences_user ON view_preferences(user_id);

-- Row Level Security policies
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own custom field definitions" ON custom_field_definitions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own custom field values" ON custom_field_values
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own attachments" ON contact_attachments
  FOR ALL USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can view timeline for their contacts" ON contact_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_timeline.contact_id
    )
  );

CREATE POLICY "Users can manage their own view presets" ON view_presets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own kanban configs" ON kanban_configs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own view preferences" ON view_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for contact attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contact-attachments', 'contact-attachments', true, 52428800, ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view contact attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'contact-attachments');

CREATE POLICY "Authenticated users can upload contact attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contact-attachments' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contact-attachments' 
    AND auth.uid()::text = (storage.objects.metadata->>'uploaded_by')::text
  );
