-- Create contact_journey_events table for journey timeline
CREATE TABLE IF NOT EXISTS contact_journey_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'email_sent', 'email_opened', 'meeting_booked', 'call_made', 'website_visit', etc.
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'completed', -- 'completed', 'scheduled', 'cancelled'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create contact_analytics table for analytics data
CREATE TABLE IF NOT EXISTS contact_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL, -- 'email_open_rate', 'click_rate', 'response_time', 'engagement_score', etc.
    metric_value DECIMAL,
    metric_unit TEXT, -- '%', 'count', 'seconds', 'score'
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contact_communications table for communication history
CREATE TABLE IF NOT EXISTS contact_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    communication_type TEXT NOT NULL, -- 'email', 'call', 'meeting', 'sms', 'social_dm', etc.
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    subject TEXT,
    content TEXT,
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'opened', 'clicked', 'replied', 'failed'
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create contact_automation_rules table for automation settings
CREATE TABLE IF NOT EXISTS contact_automation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'email_opened', 'form_submitted', 'meeting_booked', etc.
    conditions JSONB DEFAULT '{}',
    actions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create contact_insights table for AI insights
CREATE TABLE IF NOT EXISTS contact_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- 'behavioral', 'engagement', 'intent', 'risk', etc.
    title TEXT NOT NULL,
    description TEXT,
    confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 100),
    recommendations JSONB DEFAULT '[]',
    data_points JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_journey_events_contact_id ON contact_journey_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_journey_events_event_date ON contact_journey_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_journey_events_type ON contact_journey_events(event_type);

CREATE INDEX IF NOT EXISTS idx_contact_analytics_contact_id ON contact_analytics(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_analytics_metric_type ON contact_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_contact_analytics_period ON contact_analytics(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_contact_communications_contact_id ON contact_communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_communications_type ON contact_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_contact_communications_sent_at ON contact_communications(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_automation_rules_contact_id ON contact_automation_rules(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_automation_rules_trigger ON contact_automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_contact_automation_rules_active ON contact_automation_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_contact_insights_contact_id ON contact_insights(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_insights_type ON contact_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_contact_insights_expires_at ON contact_insights(expires_at);

-- Create updated_at triggers
CREATE TRIGGER update_contact_journey_events_updated_at 
    BEFORE UPDATE ON contact_journey_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_analytics_updated_at 
    BEFORE UPDATE ON contact_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_communications_updated_at 
    BEFORE UPDATE ON contact_communications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_automation_rules_updated_at 
    BEFORE UPDATE ON contact_automation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_insights_updated_at 
    BEFORE UPDATE ON contact_insights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for all tables
ALTER TABLE contact_journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_journey_events
CREATE POLICY "Users can view journey events for their contacts" ON contact_journey_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_journey_events.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

CREATE POLICY "Users can manage journey events for their contacts" ON contact_journey_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_journey_events.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

-- Create RLS policies for contact_analytics
CREATE POLICY "Users can view analytics for their contacts" ON contact_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_analytics.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

CREATE POLICY "Users can manage analytics for their contacts" ON contact_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_analytics.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

-- Create RLS policies for contact_communications
CREATE POLICY "Users can view communications for their contacts" ON contact_communications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_communications.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

CREATE POLICY "Users can manage communications for their contacts" ON contact_communications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_communications.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

-- Create RLS policies for contact_automation_rules
CREATE POLICY "Users can view automation rules for their contacts" ON contact_automation_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_automation_rules.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

CREATE POLICY "Users can manage automation rules for their contacts" ON contact_automation_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_automation_rules.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

-- Create RLS policies for contact_insights
CREATE POLICY "Users can view insights for their contacts" ON contact_insights
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_insights.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

CREATE POLICY "Users can manage insights for their contacts" ON contact_insights
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_insights.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );
