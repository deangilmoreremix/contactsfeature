/*
  # AI-Enhanced Product Intelligence Schema

  1. New Tables
    - `product_ai_suggestions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `product_id` (uuid, foreign key to user_products)
      - `suggestion_type` (text) - type of AI suggestion (industry, title, pain_point, value_prop, etc.)
      - `suggestion_content` (jsonb) - the AI-generated suggestion data
      - `reasoning` (text) - AI's reasoning for the suggestion
      - `confidence` (numeric) - confidence score 0-100
      - `applied` (boolean) - whether the user applied this suggestion
      - `created_at` (timestamptz)
    
    - `product_ai_enrichments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `match_id` (uuid, foreign key to product_contact_matches)
      - `enrichment_type` (text) - type of enrichment (company_news, funding, leadership, etc.)
      - `enrichment_data` (jsonb) - the web research data
      - `sources` (jsonb) - array of source URLs with citations
      - `expires_at` (timestamptz) - cache expiration
      - `created_at` (timestamptz)

  2. Column Additions
    - Add AI-specific columns to product_contact_matches table

  3. Security
    - Enable RLS on all new tables
    - Users can only access their own data
*/

-- Create product_ai_suggestions table
CREATE TABLE IF NOT EXISTS product_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  suggestion_type text NOT NULL CHECK (suggestion_type IN (
    'target_industry', 'target_title', 'pain_point', 'value_proposition',
    'competitive_advantage', 'ideal_customer_profile', 'pricing_strategy',
    'objection_handler', 'use_case', 'feature_highlight'
  )),
  suggestion_content jsonb NOT NULL DEFAULT '{}',
  reasoning text,
  confidence numeric(5,2) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create product_ai_enrichments table
CREATE TABLE IF NOT EXISTS product_ai_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL,
  enrichment_type text NOT NULL CHECK (enrichment_type IN (
    'company_news', 'funding_rounds', 'leadership_changes', 'industry_trends',
    'competitive_landscape', 'buying_signals', 'technology_stack', 'social_activity'
  )),
  enrichment_data jsonb NOT NULL DEFAULT '{}',
  sources jsonb DEFAULT '[]',
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Add AI-enhanced columns to product_contact_matches if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_contact_matches' AND column_name = 'ai_confidence'
  ) THEN
    ALTER TABLE product_contact_matches ADD COLUMN ai_confidence numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_contact_matches' AND column_name = 'ai_reasoning'
  ) THEN
    ALTER TABLE product_contact_matches ADD COLUMN ai_reasoning text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_contact_matches' AND column_name = 'ai_enrichment_data'
  ) THEN
    ALTER TABLE product_contact_matches ADD COLUMN ai_enrichment_data jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_contact_matches' AND column_name = 'ai_talking_points'
  ) THEN
    ALTER TABLE product_contact_matches ADD COLUMN ai_talking_points jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_contact_matches' AND column_name = 'ai_objections'
  ) THEN
    ALTER TABLE product_contact_matches ADD COLUMN ai_objections jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_contact_matches' AND column_name = 'predicted_conversion'
  ) THEN
    ALTER TABLE product_contact_matches ADD COLUMN predicted_conversion numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_contact_matches' AND column_name = 'optimal_outreach_time'
  ) THEN
    ALTER TABLE product_contact_matches ADD COLUMN optimal_outreach_time text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_contact_matches' AND column_name = 'ai_processed_at'
  ) THEN
    ALTER TABLE product_contact_matches ADD COLUMN ai_processed_at timestamptz;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE product_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ai_enrichments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_ai_suggestions
CREATE POLICY "Users can view own AI suggestions"
  ON product_ai_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI suggestions"
  ON product_ai_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI suggestions"
  ON product_ai_suggestions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI suggestions"
  ON product_ai_suggestions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for product_ai_enrichments
CREATE POLICY "Users can view own AI enrichments"
  ON product_ai_enrichments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI enrichments"
  ON product_ai_enrichments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI enrichments"
  ON product_ai_enrichments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI enrichments"
  ON product_ai_enrichments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_ai_suggestions_user_id ON product_ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_product_ai_suggestions_product_id ON product_ai_suggestions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ai_suggestions_type ON product_ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_product_ai_enrichments_user_id ON product_ai_enrichments(user_id);
CREATE INDEX IF NOT EXISTS idx_product_ai_enrichments_match_id ON product_ai_enrichments(match_id);
CREATE INDEX IF NOT EXISTS idx_product_ai_enrichments_expires ON product_ai_enrichments(expires_at);
