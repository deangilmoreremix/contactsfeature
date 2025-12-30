-- Unipile Integration and Billing System Tables
-- Run this in Supabase SQL Editor or via CLI
-- This creates all necessary tables for the Unipile API integration with $10/month per account billing

-- ===========================================
-- BILLING SYSTEM TABLES
-- ===========================================

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  monthly_total DECIMAL(10,2) DEFAULT 0.00,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_method_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Account connections with billing
CREATE TABLE IF NOT EXISTS unipile_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('gmail', 'outlook', 'yahoo', 'linkedin', 'whatsapp', 'telegram')),
  account_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  email VARCHAR(255),
  profile_picture_url TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'connecting', 'disconnected', 'error')),
  billing_status VARCHAR(50) DEFAULT 'active' CHECK (billing_status IN ('active', 'suspended', 'cancelled')),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_billed_at TIMESTAMP WITH TIME ZONE,
  monthly_rate DECIMAL(10,2) DEFAULT 10.00,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, account_id)
);

-- Billing history and invoices
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES unipile_accounts(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  stripe_invoice_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- ===========================================
-- UNIFIED COMMUNICATIONS TABLES
-- ===========================================

-- Unified conversations (contact-centric)
CREATE TABLE IF NOT EXISTS unified_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platforms TEXT[] DEFAULT '{}', -- Array of platforms used in this conversation
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  priority_score DECIMAL(3,2) DEFAULT 0.00 CHECK (priority_score >= 0 AND priority_score <= 1),
  tags TEXT[] DEFAULT '{}',
  assigned_to UUID REFERENCES auth.users(id),
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unified messages across all platforms
CREATE TABLE IF NOT EXISTS unified_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES unified_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES unipile_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('gmail', 'outlook', 'yahoo', 'linkedin', 'whatsapp', 'telegram')),
  platform_message_id VARCHAR(255), -- Original message ID from the platform
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_info JSONB NOT NULL, -- {id, name, email, phone, avatar}
  recipient_info JSONB NOT NULL, -- {id, name, email, phone, avatar}
  subject TEXT,
  content TEXT,
  html_content TEXT, -- For email platforms
  attachments JSONB DEFAULT '[]', -- Array of attachment objects
  metadata JSONB DEFAULT '{}', -- Platform-specific data
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  thread_id VARCHAR(255), -- For email threading
  message_type VARCHAR(50) DEFAULT 'message' CHECK (message_type IN ('message', 'reply', 'forward', 'draft')),
  is_scheduled BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message attachments storage
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES unified_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL, -- Path in storage (Supabase Storage or external)
  storage_url TEXT, -- Public URL for access
  thumbnail_url TEXT, -- For image attachments
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- AUTOMATION AND SEQUENCES
-- ===========================================

-- Communication sequences (automated campaigns)
CREATE TABLE IF NOT EXISTS communication_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_platforms TEXT[] DEFAULT '{}',
  target_contacts UUID[] DEFAULT '{}', -- Contact IDs
  target_filters JSONB DEFAULT '{}', -- Dynamic contact filtering
  is_active BOOLEAN DEFAULT false,
  total_steps INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  delay_between_steps INTEGER DEFAULT 1440, -- Minutes (default 1 day)
  max_steps_per_day INTEGER DEFAULT 5,
  respect_quiet_hours BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sequence steps
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES communication_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('gmail', 'outlook', 'yahoo', 'linkedin', 'whatsapp', 'telegram')),
  account_id UUID REFERENCES unipile_accounts(id) ON DELETE CASCADE,
  delay_minutes INTEGER DEFAULT 0, -- Delay after previous step
  template_id VARCHAR(255), -- Reference to template system
  custom_subject TEXT,
  custom_content TEXT,
  attachments JSONB DEFAULT '[]',
  conditions JSONB DEFAULT '{}', -- Conditions for sending (e.g., {"wait_for_response": true, "timeout_hours": 24})
  is_active BOOLEAN DEFAULT true,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sequence executions (tracking individual contact progress)
CREATE TABLE IF NOT EXISTS sequence_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES communication_sequences(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  next_step_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sequence_id, contact_id)
);

-- ===========================================
-- ANALYTICS AND REPORTING
-- ===========================================

-- Communication analytics
CREATE TABLE IF NOT EXISTS communication_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('gmail', 'outlook', 'yahoo', 'linkedin', 'whatsapp', 'telegram')),
  account_id UUID REFERENCES unipile_accounts(id) ON DELETE CASCADE,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  opens_tracked INTEGER DEFAULT 0,
  clicks_tracked INTEGER DEFAULT 0,
  attachments_sent INTEGER DEFAULT 0,
  total_attachments_size INTEGER DEFAULT 0, -- Bytes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, platform, account_id)
);

-- ===========================================
-- WEBHOOKS AND REAL-TIME
-- ===========================================

-- Webhook logs for debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_type VARCHAR(50) NOT NULL, -- 'unipile_message', 'billing_event', etc.
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Billing indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_unipile_accounts_user_id ON unipile_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_unipile_accounts_platform ON unipile_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_account_id ON billing_history(account_id);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_unified_conversations_contact_id ON unified_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_unified_conversations_user_id ON unified_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_conversation_id ON unified_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_user_id ON unified_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_platform ON unified_messages(platform);
CREATE INDEX IF NOT EXISTS idx_unified_messages_sent_at ON unified_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_unified_messages_status ON unified_messages(status);

-- Sequence indexes
CREATE INDEX IF NOT EXISTS idx_communication_sequences_user_id ON communication_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_executions_sequence_id ON sequence_executions(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_executions_contact_id ON sequence_executions(contact_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_communication_analytics_user_id ON communication_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_communication_analytics_date ON communication_analytics(date);

-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipile_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can access their own subscriptions" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own accounts" ON unipile_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own billing history" ON billing_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own conversations" ON unified_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own messages" ON unified_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own attachments" ON message_attachments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own sequences" ON communication_sequences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their sequence steps" ON sequence_steps
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM communication_sequences WHERE id = sequence_id)
  );

CREATE POLICY "Users can access their sequence executions" ON sequence_executions
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM communication_sequences WHERE id = sequence_id)
  );

CREATE POLICY "Users can access their own analytics" ON communication_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own webhook logs" ON webhook_logs
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unipile_accounts_updated_at
  BEFORE UPDATE ON unipile_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_conversations_updated_at
  BEFORE UPDATE ON unified_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_messages_updated_at
  BEFORE UPDATE ON unified_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_sequences_updated_at
  BEFORE UPDATE ON communication_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update billing totals
CREATE OR REPLACE FUNCTION update_subscription_billing_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.billing_status = 'active' THEN
    -- Add to monthly total when account becomes active
    UPDATE user_subscriptions
    SET monthly_total = monthly_total + NEW.monthly_rate
    WHERE id = NEW.subscription_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.billing_status != 'active' AND NEW.billing_status = 'active' THEN
      -- Account became active
      UPDATE user_subscriptions
      SET monthly_total = monthly_total + NEW.monthly_rate
      WHERE id = NEW.subscription_id;

    ELSIF OLD.billing_status = 'active' AND NEW.billing_status != 'active' THEN
      -- Account became inactive
      UPDATE user_subscriptions
      SET monthly_total = monthly_total - OLD.monthly_rate
      WHERE id = NEW.subscription_id;
    END IF;

  ELSIF TG_OP = 'DELETE' AND OLD.billing_status = 'active' THEN
    -- Remove from monthly total when account is deleted
    UPDATE user_subscriptions
    SET monthly_total = monthly_total - OLD.monthly_rate
    WHERE id = OLD.subscription_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply billing total trigger
CREATE TRIGGER update_billing_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON unipile_accounts
  FOR EACH ROW EXECUTE FUNCTION update_subscription_billing_total();

-- ===========================================
-- INITIAL DATA SEEDING
-- ===========================================

-- Insert default platform configurations (you can modify these)
INSERT INTO platform_configs (platform, name, display_name, color, capabilities, max_message_length, supports_attachments, supports_scheduling)
VALUES
  ('gmail', 'gmail', 'Gmail', '#EA4335', '["email","attachments","scheduling","signatures"]', NULL, true, true),
  ('outlook', 'outlook', 'Outlook', '#0078D4', '["email","attachments","scheduling","signatures"]', NULL, true, true),
  ('yahoo', 'yahoo', 'Yahoo Mail', '#5F01D1', '["email","attachments","scheduling","signatures"]', NULL, true, true),
  ('linkedin', 'linkedin', 'LinkedIn', '#0077B5', '["messaging","attachments","profiles"]', 3000, true, false),
  ('whatsapp', 'whatsapp', 'WhatsApp', '#25D366', '["messaging","media","groups","typing"]', 4096, true, false),
  ('telegram', 'telegram', 'Telegram', '#0088CC', '["messaging","media","channels","bots"]', 4096, true, false)
ON CONFLICT (platform) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Unipile integration and billing system tables created successfully!';
  RAISE NOTICE 'You can now connect accounts and start billing users $10/month per account.';
END $$;