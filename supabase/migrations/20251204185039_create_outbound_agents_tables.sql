-- Create outbound_agents table
CREATE TABLE IF NOT EXISTS outbound_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  capabilities JSONB DEFAULT '[]'::jsonb,
  smart_crm_tools JSONB DEFAULT '[]'::jsonb,
  mood_engine_enabled BOOLEAN DEFAULT true,
  memory_enabled BOOLEAN DEFAULT true,
  skills_enabled BOOLEAN DEFAULT true,
  autopilot_enabled BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact_agent_settings table
CREATE TABLE IF NOT EXISTS contact_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  agent_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  custom_instructions TEXT,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contact_id, agent_key)
);

-- Enable RLS
ALTER TABLE outbound_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_agent_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on outbound_agents" ON outbound_agents FOR ALL USING (true);
CREATE POLICY "Allow all operations on contact_agent_settings" ON contact_agent_settings FOR ALL USING (true);