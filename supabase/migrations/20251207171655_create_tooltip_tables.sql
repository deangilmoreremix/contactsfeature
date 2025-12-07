-- Create Tooltip System Tables
-- 
-- 1. New Tables
--    - tooltip_categories: Categories for organizing tooltips
--    - tooltip_configurations: Individual tooltip configurations
-- 
-- 2. Security
--    - Enable RLS on both tables
--    - Add policies for public read access

-- Create tooltip_categories table
CREATE TABLE IF NOT EXISTS tooltip_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create tooltip_configurations table
CREATE TABLE IF NOT EXISTS tooltip_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES tooltip_categories(id) ON DELETE CASCADE,
  element_id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  placement text NOT NULL DEFAULT 'top',
  trigger_type text NOT NULL DEFAULT 'hover',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE tooltip_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooltip_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (allows anon users to read)
CREATE POLICY "Allow public read access to tooltip categories"
  ON tooltip_categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Allow public read access to tooltip configurations"
  ON tooltip_configurations
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);