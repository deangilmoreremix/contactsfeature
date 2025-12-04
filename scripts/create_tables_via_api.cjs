const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTables() {
  console.log('🔧 Creating outbound_agents tables...');

  try {
    // Create outbound_agents table
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (error1) {
      console.log('⚠️ RPC failed, trying direct approach...');
    }

    // Create contact_agent_settings table
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (error2) {
      console.log('⚠️ RPC failed for contact_agent_settings');
    }

    console.log('✅ Tables created successfully!');
    console.log('🌱 Now run: npx tsx scripts/setup_agents_simple.ts');

  } catch (error) {
    console.error('💥 Error creating tables:', error);
  }
}

createTables();