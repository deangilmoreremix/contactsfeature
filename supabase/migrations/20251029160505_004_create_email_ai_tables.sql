/*
  # Create Email AI Tables

  ## Overview
  Creates tables to store AI-generated emails, email analyses, and email templates
  with full AI metadata tracking and citation support.

  ## New Tables
  
  ### email_compositions
  - `id` (uuid, primary key) - Unique identifier for each composition
  - `contact_id` (uuid, nullable) - Reference to contacts table
  - `user_id` (uuid, nullable) - User who generated the email
  - `subject` (text) - Email subject line
  - `body` (text) - Email body content
  - `purpose` (text) - Email purpose (introduction, follow-up, proposal, etc.)
  - `tone` (text) - Tone used (professional, friendly, formal, casual)
  - `length` (text) - Length preference (short, medium, long)
  - `model` (text) - AI model used (gpt-4o, gpt-4o-mini, etc.)
  - `confidence` (integer) - AI confidence score (0-100)
  - `web_research_used` (boolean) - Whether web research was incorporated
  - `sources` (jsonb) - Citation sources from web research
  - `metadata` (jsonb) - Additional AI generation metadata
  - `created_at` (timestamptz) - When the email was generated
  - `updated_at` (timestamptz) - Last modification timestamp

  ### email_analyses
  - `id` (uuid, primary key) - Unique identifier for each analysis
  - `contact_id` (uuid, nullable) - Reference to contacts table
  - `user_id` (uuid, nullable) - User who requested analysis
  - `email_subject` (text) - Subject of analyzed email
  - `email_body` (text) - Body of analyzed email
  - `analysis_type` (text) - Type of analysis (comprehensive, sentiment, engagement)
  - `quality_score` (integer) - Overall quality score (0-100)
  - `response_likelihood` (integer) - Likelihood of response (0-100)
  - `sentiment` (jsonb) - Sentiment analysis results
  - `tone_analysis` (jsonb) - Tone breakdown
  - `metrics` (jsonb) - Email metrics (word count, readability, etc.)
  - `improvements` (jsonb) - Suggested improvements array
  - `assessment` (text) - Overall assessment text
  - `model` (text) - AI model used for analysis
  - `confidence` (integer) - Analysis confidence score (0-100)
  - `created_at` (timestamptz) - When the analysis was performed

  ### email_templates
  - `id` (uuid, primary key) - Unique identifier for template
  - `user_id` (uuid, nullable) - User who created/owns the template
  - `name` (text) - Template name
  - `description` (text, nullable) - Template description
  - `category` (text) - Template category
  - `subject` (text) - Template subject line
  - `body` (text) - Template body content
  - `variables` (jsonb) - Array of variable names used in template
  - `is_default` (boolean) - Whether this is a system default template
  - `is_ai_generated` (boolean) - Whether template was AI-generated
  - `model` (text, nullable) - AI model used if AI-generated
  - `metadata` (jsonb) - Additional template metadata
  - `created_at` (timestamptz) - When the template was created
  - `updated_at` (timestamptz) - Last modification timestamp

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their own data
  - Allow users to read default templates
  - Restrict deletion of default templates

  ## Notes
  - All tables support full AI metadata tracking
  - Supports web research citation storage
  - Enables template versioning and AI generation tracking
*/

-- Create email_compositions table
CREATE TABLE IF NOT EXISTS email_compositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid,
  user_id uuid,
  subject text NOT NULL,
  body text NOT NULL,
  purpose text DEFAULT 'general',
  tone text DEFAULT 'professional',
  length text DEFAULT 'medium',
  model text DEFAULT 'gpt-4o',
  confidence integer DEFAULT 85 CHECK (confidence >= 0 AND confidence <= 100),
  web_research_used boolean DEFAULT false,
  sources jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_analyses table
CREATE TABLE IF NOT EXISTS email_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid,
  user_id uuid,
  email_subject text NOT NULL,
  email_body text NOT NULL,
  analysis_type text DEFAULT 'comprehensive',
  quality_score integer DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  response_likelihood integer DEFAULT 0 CHECK (response_likelihood >= 0 AND response_likelihood <= 100),
  sentiment jsonb DEFAULT '{}'::jsonb,
  tone_analysis jsonb DEFAULT '{}'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  improvements jsonb DEFAULT '[]'::jsonb,
  assessment text,
  model text DEFAULT 'gpt-4o',
  confidence integer DEFAULT 85 CHECK (confidence >= 0 AND confidence <= 100),
  created_at timestamptz DEFAULT now()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  is_ai_generated boolean DEFAULT false,
  model text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_compositions_contact_id ON email_compositions(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_compositions_user_id ON email_compositions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_compositions_created_at ON email_compositions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_analyses_contact_id ON email_analyses(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_analyses_user_id ON email_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_email_analyses_created_at ON email_analyses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_default ON email_templates(is_default);

-- Enable Row Level Security
ALTER TABLE email_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_compositions

-- Users can view their own email compositions
CREATE POLICY "Users can view own email compositions"
  ON email_compositions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own email compositions
CREATE POLICY "Users can insert own email compositions"
  ON email_compositions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own email compositions
CREATE POLICY "Users can update own email compositions"
  ON email_compositions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own email compositions
CREATE POLICY "Users can delete own email compositions"
  ON email_compositions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for email_analyses

-- Users can view their own email analyses
CREATE POLICY "Users can view own email analyses"
  ON email_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own email analyses
CREATE POLICY "Users can insert own email analyses"
  ON email_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own email analyses
CREATE POLICY "Users can delete own email analyses"
  ON email_analyses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for email_templates

-- Users can view their own templates and default templates
CREATE POLICY "Users can view own and default templates"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_default = true);

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON email_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own non-default templates
CREATE POLICY "Users can update own non-default templates"
  ON email_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false)
  WITH CHECK (auth.uid() = user_id AND is_default = false);

-- Users can delete their own non-default templates
CREATE POLICY "Users can delete own non-default templates"
  ON email_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false);

-- Insert some default email templates
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES
  (
    'Introduction Email',
    'First outreach to a new prospect',
    'prospecting',
    'Introduction from {{company_name}}',
    'Hi {{first_name}},

I hope this email finds you well. I''m reaching out because I believe our solutions at {{company_name}} could help address the challenges you might be facing at {{client_company}}.

{{value_proposition}}

Would you be open to a brief call to discuss how we might be able to help?

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}',
    '["first_name", "company_name", "client_company", "value_proposition", "sender_name", "sender_title"]'::jsonb,
    true,
    false
  ),
  (
    'Follow-up After Meeting',
    'Send after initial sales call or meeting',
    'follow-up',
    'Thank you for your time, {{first_name}}',
    'Hi {{first_name}},

Thank you for taking the time to meet with me today. I really enjoyed learning more about {{client_company}} and your role there.

As promised, I''m sending over the additional information about our {{product_name}} that we discussed. I''ve also included a case study that I think you''ll find relevant.

Please let me know if you have any questions. I''m looking forward to our next conversation.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}',
    '["first_name", "client_company", "product_name", "sender_name", "sender_title", "company_name"]'::jsonb,
    true,
    false
  ),
  (
    'Proposal Email',
    'Email to accompany a formal proposal',
    'proposal',
    '{{client_company}} - Proposal for {{solution_type}}',
    'Dear {{first_name}},

Thank you for the opportunity to present this proposal for {{client_company}}.

Based on our discussions, I''ve attached a comprehensive proposal that addresses your needs regarding {{pain_point}}. Our solution will help you {{benefit_1}} while ensuring {{benefit_2}}.

The proposal includes detailed pricing information, implementation timeline, and expected outcomes. I''d be happy to schedule a call to walk through the details and answer any questions you might have.

I look forward to your feedback.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}',
    '["first_name", "client_company", "solution_type", "pain_point", "benefit_1", "benefit_2", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
    true,
    false
  )
ON CONFLICT DO NOTHING;