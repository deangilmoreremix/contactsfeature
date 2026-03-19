/*
  # Create Contact Files Table
  
  1. New Tables
    - `contact_files`
      - `id` (uuid, primary key) - Unique identifier for the file
      - `contact_id` (uuid, foreign key) - Reference to the contact
      - `user_id` (uuid, foreign key) - User who uploaded the file
      - `file_name` (text) - Original filename
      - `file_size` (bigint) - File size in bytes
      - `file_type` (text) - MIME type of the file
      - `file_path` (text) - Storage path in Supabase Storage
      - `public_url` (text) - Public URL for accessing the file
      - `checksum` (text) - SHA-256 checksum for integrity verification
      - `thumbnail_url` (text, nullable) - Thumbnail URL for images
      - `description` (text, nullable) - Optional description
      - `tags` (text[], nullable) - Optional tags for categorization
      - `metadata` (jsonb) - Additional metadata
      - `created_at` (timestamptz) - Upload timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `contact_files` table
    - Add policy for users to manage their own files
    - Add policy for users to view files of contacts they own
  
  3. Indexes
    - Index on contact_id for faster lookups
    - Index on user_id for user-specific queries
*/

-- Create contact_files table
CREATE TABLE IF NOT EXISTS contact_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  file_path text NOT NULL,
  public_url text NOT NULL,
  checksum text,
  thumbnail_url text,
  description text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE contact_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view files for contacts they own
CREATE POLICY "Users can view files for their contacts"
  ON contact_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_files.contact_id
      AND contacts.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Policy: Users can insert files for contacts they own
CREATE POLICY "Users can upload files for their contacts"
  ON contact_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_files.contact_id
      AND contacts.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own files"
  ON contact_files
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own files"
  ON contact_files
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_files_contact_id ON contact_files(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_files_user_id ON contact_files(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_files_created_at ON contact_files(created_at DESC);