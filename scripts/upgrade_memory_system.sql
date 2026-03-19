-- Memory System Upgrade Script
-- Adds critical memory fields and tables for autonomous SDR operation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Upgrade contacts table with memory fields
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_contacted TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_contact_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS current_agent TEXT,
ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'cold' CHECK (lead_temperature IN ('cold', 'warm', 'hot')),
ADD COLUMN IF NOT EXISTS last_message_id TEXT;

-- Create engagement_history table
CREATE TABLE IF NOT EXISTS engagement_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_value TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sequence_steps table
CREATE TABLE IF NOT EXISTS sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    sequence_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    completed BOOLEAN DEFAULT false,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component TEXT NOT NULL,
    error_message TEXT NOT NULL,
    payload JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retry_count INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagement_history_contact_id ON engagement_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_engagement_history_timestamp ON engagement_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_contact_id ON sequence_steps(contact_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_scheduled_at ON sequence_steps(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_component ON error_logs(component);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_sequence_steps_updated_at
    BEFORE UPDATE ON sequence_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE engagement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own engagement history
CREATE POLICY "Users can access own engagement history" ON engagement_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM contacts c
            WHERE c.id = engagement_history.contact_id
            AND c.created_by = auth.uid()::text
        )
    );

-- Users can only access their own sequence steps
CREATE POLICY "Users can access own sequence steps" ON sequence_steps
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM contacts c
            WHERE c.id = sequence_steps.contact_id
            AND c.created_by = auth.uid()::text
        )
    );

-- Users can only access their own error logs
CREATE POLICY "Users can access own error logs" ON error_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM contacts c
            WHERE c.id IN (
                SELECT contact_id FROM sequence_steps WHERE id = error_logs.id
            )
            AND c.created_by = auth.uid()::text
        )
    );

-- Create migration log entry
INSERT INTO migration_log (migration_name, executed_at, description)
VALUES ('memory-system-upgrade', NOW(), 'Added memory fields and tables for autonomous SDR operation');

-- Verification queries
DO $$
BEGIN
    RAISE NOTICE 'Memory system upgrade completed successfully!';
    RAISE NOTICE 'Added fields to contacts table: last_contacted, next_contact_time, engagement_score, autopilot_enabled, current_agent, lead_temperature, last_message_id';
    RAISE NOTICE 'Created tables: engagement_history, sequence_steps, error_logs';
    RAISE NOTICE 'Added indexes and RLS policies';
    RAISE NOTICE 'Migration logged in migration_log table';
END $$;