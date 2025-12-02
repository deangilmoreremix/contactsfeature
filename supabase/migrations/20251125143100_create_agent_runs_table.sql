-- Create agent_runs table for logging agent execution history
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    contact_id UUID,
    deal_id UUID,
    user_id UUID NOT NULL,
    input_data JSONB,
    output_data JSONB,
    tool_calls JSONB,
    status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
    error_message TEXT,
    execution_time_ms INTEGER,
    tokens_used JSONB, -- {input_tokens, output_tokens, total_tokens}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Foreign key constraints
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_contact_id ON agent_runs(contact_id);
CREATE INDEX idx_agent_runs_deal_id ON agent_runs(deal_id);
CREATE INDEX idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_created_at ON agent_runs(created_at DESC);

-- RLS policies for user access
-- Allow users to read their own agent runs
CREATE POLICY "Users can read their own agent runs" ON agent_runs
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own agent runs
CREATE POLICY "Users can insert their own agent runs" ON agent_runs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own agent runs
CREATE POLICY "Users can update their own agent runs" ON agent_runs
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow service role to manage all agent runs (for background processing)
CREATE POLICY "Service role can manage all agent runs" ON agent_runs
    FOR ALL USING (auth.role() = 'service_role');