-- Create contacts table for CRM
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    website TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    facebook_url TEXT,
    notes TEXT,
    tags TEXT[],
    category TEXT DEFAULT 'lead',
    score INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    priority BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    source TEXT,
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_score ON contacts(score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR SELECT USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can insert their own contacts" ON contacts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their assigned contacts" ON contacts
    FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete their own contacts" ON contacts
    FOR DELETE USING (auth.uid() = created_by);

-- Create contact_activities table for tracking interactions
CREATE TABLE IF NOT EXISTS contact_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'email_sent', 'email_opened', 'call_made', 'meeting_booked', etc.
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for contact_activities
CREATE INDEX IF NOT EXISTS idx_contact_activities_contact_id ON contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_type ON contact_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_contact_activities_created_at ON contact_activities(created_at DESC);

-- Enable RLS for contact_activities
ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for their contacts" ON contact_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_activities.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );

CREATE POLICY "Users can insert activities for their contacts" ON contact_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_activities.contact_id 
            AND (contacts.created_by = auth.uid() OR contacts.assigned_to = auth.uid())
        )
    );
