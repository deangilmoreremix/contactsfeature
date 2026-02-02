-- Migration Script: Upgrade SmartCRM Agents to GPT-5.2
-- Run this script to migrate existing agents from GPT-5.1 to GPT-5.2 models
-- Execute in Supabase SQL Editor or via migration tool

-- Backup existing agent metadata (recommended)
CREATE TABLE IF NOT EXISTS agent_metadata_backup_pre_gpt52 AS
SELECT * FROM agent_metadata;

-- Update SDR/AE agents to use GPT-5.2-thinking for deep reasoning
UPDATE agent_metadata
SET model = 'gpt-5.2-thinking'
WHERE model = 'gpt-5.1-thinking'
   OR model IS NULL
   OR model = 'gpt-5.1';

-- Update general-purpose agents to use GPT-5.2
UPDATE agent_metadata
SET model = 'gpt-5.2'
WHERE model = 'gpt-5.1';

-- Update fast/cheap agents to use GPT-5.2-instant
UPDATE agent_metadata
SET model = 'gpt-5.2-instant'
WHERE model = 'gpt-5.1-instant';

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at, description)
VALUES ('gpt-5.2-upgrade', NOW(), 'Migrated agent models from GPT-5.1 to GPT-5.2 variants');

-- Verification query: Check migration results
SELECT
    model,
    COUNT(*) as agent_count,
    STRING_AGG(name, ', ') as agents
FROM agent_metadata
GROUP BY model
ORDER BY model;

-- Optional: Create user settings table for per-user model preferences
CREATE TABLE IF NOT EXISTS user_ai_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    smartcrm_model TEXT DEFAULT 'gpt-5.2',
    smartcrm_fast_model TEXT DEFAULT 'gpt-5.2-instant',
    smartcrm_thinking_model TEXT DEFAULT 'gpt-5.2-thinking',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add RLS policies for user settings
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI settings"
    ON user_ai_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings"
    ON user_ai_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings"
    ON user_ai_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user_id ON user_ai_settings(user_id);

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'GPT-5.2 migration completed successfully!';
    RAISE NOTICE 'All agents have been updated to use GPT-5.2 model variants.';
    RAISE NOTICE 'User-specific model preferences table created.';
END $$;