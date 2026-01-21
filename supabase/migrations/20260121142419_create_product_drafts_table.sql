/*
  # Create Product Drafts Table

  1. New Tables
    - `product_drafts`
      - `id` (uuid, primary key) - Unique draft identifier
      - `product_id` (uuid, references user_products) - Associated product
      - `contact_id` (uuid, references contacts) - Target contact
      - `user_id` (uuid, references auth.users) - Owner for RLS
      - `draft_type` (text) - email/call_script/sms/linkedin
      - `subject` (text) - Email subject line or call opener
      - `body` (text) - Main content body
      - `tone` (text) - formal/casual/urgent/friendly
      - `personalization_tokens` (jsonb) - Tokens used for personalization
      - `is_edited` (boolean) - Whether user has modified the draft
      - `is_sent` (boolean) - Whether user marked as sent
      - `sent_at` (timestamptz) - When marked as sent
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `product_drafts` table
    - Add policies for authenticated users to manage their own drafts

  3. Indexes
    - Index on product_id for product-centric queries
    - Index on contact_id for contact-centric queries
    - Index on draft_type for filtering
*/

CREATE TABLE IF NOT EXISTS product_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES user_products(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_type text NOT NULL CHECK (draft_type IN ('email', 'call_script', 'sms', 'linkedin')),
  subject text,
  body text NOT NULL,
  tone text DEFAULT 'professional',
  personalization_tokens jsonb DEFAULT '{}'::jsonb,
  is_edited boolean DEFAULT false,
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_drafts_product 
  ON product_drafts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_drafts_contact 
  ON product_drafts(contact_id);
CREATE INDEX IF NOT EXISTS idx_product_drafts_user 
  ON product_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_product_drafts_type 
  ON product_drafts(draft_type);
CREATE INDEX IF NOT EXISTS idx_product_drafts_sent 
  ON product_drafts(is_sent);

ALTER TABLE product_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drafts"
  ON product_drafts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts"
  ON product_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON product_drafts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON product_drafts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);