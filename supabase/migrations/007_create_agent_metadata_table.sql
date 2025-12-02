-- Create agent_metadata table
CREATE TABLE agent_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    tools JSONB,
    input_schema JSONB,
    output_schema JSONB,
    recommended_ui_placement TEXT,
    trigger_options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE agent_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
-- Allow authenticated users to read agent metadata
CREATE POLICY "Allow authenticated users to read agent metadata" ON agent_metadata
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to manage agent metadata (insert, update, delete)
CREATE POLICY "Allow service role to manage agent metadata" ON agent_metadata
    FOR ALL USING (auth.role() = 'service_role');