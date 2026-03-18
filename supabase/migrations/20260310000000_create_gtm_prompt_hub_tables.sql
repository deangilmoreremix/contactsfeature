-- GTM Prompt Hub Database Tables
-- Custom prompts and generation logs for the Prompt Hub feature

-- Create custom_prompts table for user-created prompts
CREATE TABLE IF NOT EXISTS custom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  category TEXT DEFAULT 'outreach',
  role TEXT DEFAULT 'sdr',
  industry TEXT,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create prompt_generation_logs table for analytics
CREATE TABLE IF NOT EXISTS prompt_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE custom_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_prompts
DROP POLICY IF EXISTS "Users can view own custom prompts" ON custom_prompts;
CREATE POLICY "Users can view own custom prompts" ON custom_prompts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own custom prompts" ON custom_prompts;
CREATE POLICY "Users can insert own custom prompts" ON custom_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own custom prompts" ON custom_prompts;
CREATE POLICY "Users can update own custom prompts" ON custom_prompts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own custom prompts" ON custom_prompts;
CREATE POLICY "Users can delete own custom prompts" ON custom_prompts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for prompt_generation_logs
DROP POLICY IF EXISTS "Users can view own prompt logs" ON prompt_generation_logs;
CREATE POLICY "Users can view own prompt logs" ON prompt_generation_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own prompt logs" ON prompt_generation_logs;
CREATE POLICY "Users can insert own prompt logs" ON prompt_generation_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_prompts_user_id ON custom_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_prompts_category ON custom_prompts(category);
CREATE INDEX IF NOT EXISTS idx_custom_prompts_featured ON custom_prompts(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_prompt_logs_user_id ON prompt_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_logs_created_at ON prompt_generation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_logs_prompt_id ON prompt_generation_logs(prompt_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for custom_prompts
DROP TRIGGER IF EXISTS update_custom_prompts_updated_at ON custom_prompts;
CREATE TRIGGER update_custom_prompts_updated_at
  BEFORE UPDATE ON custom_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE custom_prompts IS 'User-created custom prompts for AI content generation';
COMMENT ON TABLE prompt_generation_logs IS 'Log of AI content generations for analytics';
