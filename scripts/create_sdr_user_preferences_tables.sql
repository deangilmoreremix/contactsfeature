-- SDR Agent User Controls - Database Schema
-- Migration script to create tables for user-customizable SDR agent preferences

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SDR User Preferences Table
-- Stores user-specific configuration for each SDR agent
CREATE TABLE IF NOT EXISTS sdr_user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Agent identification
  agent_id TEXT NOT NULL,

  -- Campaign Configuration
  campaign_length INTEGER NOT NULL DEFAULT 5 CHECK (campaign_length >= 1 AND campaign_length <= 20),
  message_delay INTEGER NOT NULL DEFAULT 48 CHECK (message_delay >= 1), -- hours
  tone TEXT NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'friendly', 'enthusiastic')),
  personalization_level TEXT NOT NULL DEFAULT 'medium' CHECK (personalization_level IN ('low', 'medium', 'high')),

  -- Channel Preferences (stored as JSON array)
  channels JSONB NOT NULL DEFAULT '["email"]',
  primary_channel TEXT NOT NULL DEFAULT 'email' CHECK (primary_channel IN ('email', 'linkedin', 'whatsapp', 'phone')),

  -- Success Criteria (stored as JSON)
  success_criteria JSONB NOT NULL DEFAULT '{
    "opened": {"weight": 0.3, "action": "continue"},
    "clicked": {"weight": 0.5, "action": "escalate"},
    "replied": {"weight": 1.0, "action": "handover"},
    "unsubscribed": {"weight": -1.0, "action": "stop"}
  }',

  -- Custom Prompts and Content (stored as JSON)
  custom_prompts JSONB NOT NULL DEFAULT '{}',
  follow_up_rules JSONB NOT NULL DEFAULT '[]',

  -- Branding (stored as JSON)
  branding JSONB NOT NULL DEFAULT '{
    "companyName": "",
    "signature": ""
  }',

  -- Advanced AI Settings (stored as JSON)
  ai_settings JSONB NOT NULL DEFAULT '{
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 1000
  }',

  -- Timing Rules (stored as JSON)
  timing_rules JSONB NOT NULL DEFAULT '{
    "businessHoursOnly": true,
    "timezone": "America/New_York",
    "maxPerDay": 2,
    "maxPerWeek": 5,
    "respectWeekends": true
  }',

  -- Objection Handling (stored as JSON)
  objection_handling JSONB NOT NULL DEFAULT '[]',

  -- Competitor Strategy (stored as JSON)
  competitor_strategy JSONB NOT NULL DEFAULT '{
    "mentionCompetitors": false,
    "positioning": "differentiation",
    "keyAdvantages": []
  }',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, agent_id)
);

-- SDR Campaign Templates Table
-- Stores reusable campaign templates created by users
CREATE TABLE IF NOT EXISTS sdr_campaign_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  agent_id TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,

  -- Campaign structure (stored as JSON)
  sequence JSONB NOT NULL DEFAULT '[]',

  -- Template settings (stored as JSON)
  settings JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER NOT NULL DEFAULT 0,

  -- Constraints
  CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  CHECK (char_length(description) <= 500)
);

-- SDR Agent Performance Tracking Table
-- Stores performance metrics for SDR agent campaigns
CREATE TABLE IF NOT EXISTS sdr_agent_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Agent and campaign identification
  agent_id TEXT NOT NULL,
  campaign_id TEXT,
  template_id UUID REFERENCES sdr_campaign_templates(id) ON DELETE SET NULL,

  -- Performance Metrics (stored as JSON)
  metrics JSONB NOT NULL DEFAULT '{
    "sent": 0,
    "delivered": 0,
    "opened": 0,
    "clicked": 0,
    "replied": 0,
    "bounced": 0,
    "unsubscribed": 0,
    "converted": 0
  }',

  -- Timing Metrics (stored as JSON)
  timing JSONB NOT NULL DEFAULT '{
    "averageResponseTime": 0,
    "campaignDuration": 0,
    "messagesPerDay": 0
  }',

  -- Success Rates (stored as JSON)
  rates JSONB NOT NULL DEFAULT '{
    "openRate": 0,
    "clickRate": 0,
    "replyRate": 0,
    "conversionRate": 0,
    "unsubscribeRate": 0
  }',

  -- Channel Performance (stored as JSON)
  channel_performance JSONB NOT NULL DEFAULT '{}',

  -- Time-based Analytics (stored as JSON)
  time_analytics JSONB NOT NULL DEFAULT '{
    "bestDayOfWeek": "",
    "bestTimeOfDay": "",
    "responsePatterns": []
  }',

  -- Date range for this performance period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CHECK (period_end > period_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sdr_user_preferences_user_id ON sdr_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_sdr_user_preferences_agent_id ON sdr_user_preferences(agent_id);
CREATE INDEX IF NOT EXISTS idx_sdr_user_preferences_user_agent ON sdr_user_preferences(user_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_sdr_campaign_templates_user_id ON sdr_campaign_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sdr_campaign_templates_agent_id ON sdr_campaign_templates(agent_id);
CREATE INDEX IF NOT EXISTS idx_sdr_campaign_templates_public ON sdr_campaign_templates(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_sdr_agent_performance_user_id ON sdr_agent_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_sdr_agent_performance_agent_id ON sdr_agent_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_sdr_agent_performance_period ON sdr_agent_performance(period_start, period_end);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_sdr_user_preferences_updated_at
  BEFORE UPDATE ON sdr_user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sdr_campaign_templates_updated_at
  BEFORE UPDATE ON sdr_campaign_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE sdr_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_agent_performance ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view own SDR preferences" ON sdr_user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SDR preferences" ON sdr_user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SDR preferences" ON sdr_user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own SDR preferences" ON sdr_user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Users can access their own templates and public templates
CREATE POLICY "Users can view own and public templates" ON sdr_campaign_templates
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own templates" ON sdr_campaign_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON sdr_campaign_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON sdr_campaign_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only access their own performance data
CREATE POLICY "Users can view own performance data" ON sdr_agent_performance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own performance data" ON sdr_agent_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE sdr_user_preferences IS 'User-specific configuration preferences for SDR agents';
COMMENT ON TABLE sdr_campaign_templates IS 'Reusable campaign templates created by users';
COMMENT ON TABLE sdr_agent_performance IS 'Performance metrics and analytics for SDR agent campaigns';

COMMENT ON COLUMN sdr_user_preferences.channels IS 'Array of enabled communication channels';
COMMENT ON COLUMN sdr_user_preferences.success_criteria IS 'Rules for what constitutes success and follow-up actions';
COMMENT ON COLUMN sdr_user_preferences.ai_settings IS 'AI model configuration and parameters';
COMMENT ON COLUMN sdr_user_preferences.timing_rules IS 'Rules for when and how often to send messages';

-- Insert default preferences for common agents (optional seeding)
-- This would typically be done through the application when a user first configures an agent

-- Example default preferences (uncomment to seed)
/*
INSERT INTO sdr_user_preferences (user_id, agent_id, campaign_length, message_delay, tone, personalization_level, channels, primary_channel)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual user ID
  'sdr-follow-up',
  5, 48, 'professional', 'medium',
  '["email"]'::jsonb, 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM sdr_user_preferences
  WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND agent_id = 'sdr-follow-up'
);
*/