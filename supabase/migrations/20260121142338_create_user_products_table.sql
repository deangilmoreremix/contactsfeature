/*
  # Create User Products Table

  1. New Tables
    - `user_products`
      - `id` (uuid, primary key) - Unique product identifier
      - `user_id` (uuid, references auth.users) - Owner of the product
      - `name` (text) - Product name
      - `tagline` (text) - Short product description
      - `description` (text) - Detailed product description
      - `category` (text) - Product category
      - `pricing_model` (text) - subscription/one-time/freemium/custom
      - `pricing_tiers` (jsonb) - Pricing tier details
      - `features` (text[]) - List of key features
      - `target_industries` (text[]) - Target industry verticals
      - `target_company_sizes` (text[]) - startup/SMB/mid-market/enterprise
      - `target_titles` (text[]) - Target job titles
      - `target_departments` (text[]) - Target departments
      - `ideal_customer_profile` (text) - Detailed ICP description
      - `value_propositions` (jsonb) - Key value props with descriptions
      - `pain_points_addressed` (text[]) - Problems the product solves
      - `competitive_advantages` (text[]) - Differentiators
      - `use_cases` (text[]) - Example use cases
      - `collateral_urls` (text[]) - Links to sales materials
      - `is_active` (boolean) - Whether product is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `user_products` table
    - Add policies for authenticated users to manage their own products
*/

CREATE TABLE IF NOT EXISTS user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  tagline text,
  description text,
  category text,
  pricing_model text DEFAULT 'custom',
  pricing_tiers jsonb DEFAULT '[]'::jsonb,
  features text[] DEFAULT '{}',
  target_industries text[] DEFAULT '{}',
  target_company_sizes text[] DEFAULT '{}',
  target_titles text[] DEFAULT '{}',
  target_departments text[] DEFAULT '{}',
  ideal_customer_profile text,
  value_propositions jsonb DEFAULT '[]'::jsonb,
  pain_points_addressed text[] DEFAULT '{}',
  competitive_advantages text[] DEFAULT '{}',
  use_cases text[] DEFAULT '{}',
  collateral_urls text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_is_active ON user_products(is_active);
CREATE INDEX IF NOT EXISTS idx_user_products_category ON user_products(category);

ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own products"
  ON user_products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products"
  ON user_products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON user_products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON user_products
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);