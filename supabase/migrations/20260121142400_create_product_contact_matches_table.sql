/*
  # Create Product Contact Matches Table

  1. New Tables
    - `product_contact_matches`
      - `id` (uuid, primary key) - Unique match identifier
      - `product_id` (uuid, references user_products) - The product being matched
      - `contact_id` (uuid, references contacts) - The contact being scored
      - `user_id` (uuid, references auth.users) - Owner for RLS
      - `match_score` (integer) - Score from 0-100
      - `match_reasons` (jsonb) - Array of reasons explaining the match
      - `recommended_approach` (text) - AI-suggested outreach approach
      - `personalized_pitch` (text) - Custom pitch for this contact
      - `why_buy_reasons` (text[]) - Personalized reasons to buy
      - `objections_anticipated` (text[]) - Expected objections
      - `industry_score` (integer) - Sub-score for industry match
      - `company_size_score` (integer) - Sub-score for company size fit
      - `title_score` (integer) - Sub-score for title relevance
      - `tags_score` (integer) - Sub-score for tags alignment
      - `status_score` (integer) - Sub-score for status qualification
      - `calculated_at` (timestamptz) - When match was calculated

  2. Security
    - Enable RLS on `product_contact_matches` table
    - Add policies for authenticated users to manage their own matches

  3. Indexes
    - Composite index on product_id and match_score for efficient queries
    - Index on contact_id for contact-centric lookups
*/

CREATE TABLE IF NOT EXISTS product_contact_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES user_products(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score integer NOT NULL DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons jsonb DEFAULT '[]'::jsonb,
  recommended_approach text,
  personalized_pitch text,
  why_buy_reasons text[] DEFAULT '{}',
  objections_anticipated text[] DEFAULT '{}',
  industry_score integer DEFAULT 0,
  company_size_score integer DEFAULT 0,
  title_score integer DEFAULT 0,
  tags_score integer DEFAULT 0,
  status_score integer DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_product_matches_product_score 
  ON product_contact_matches(product_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_matches_contact 
  ON product_contact_matches(contact_id);
CREATE INDEX IF NOT EXISTS idx_product_matches_user 
  ON product_contact_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_product_matches_score 
  ON product_contact_matches(match_score DESC);

ALTER TABLE product_contact_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own matches"
  ON product_contact_matches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own matches"
  ON product_contact_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches"
  ON product_contact_matches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matches"
  ON product_contact_matches
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);