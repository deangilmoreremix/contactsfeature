-- Create contacts table for storing contact information
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  industry TEXT,
  avatarSrc TEXT,
  sources TEXT[] DEFAULT '{}',
  interestLevel TEXT NOT NULL DEFAULT 'medium' CHECK (interestLevel IN ('hot', 'medium', 'low', 'cold')),
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('active', 'pending', 'inactive', 'lead', 'prospect', 'customer', 'churned')),
  lastConnected TEXT,
  notes TEXT,
  aiScore INTEGER CHECK (aiScore >= 0 AND aiScore <= 100),
  tags TEXT[],
  isFavorite BOOLEAN DEFAULT false,
  socialProfiles JSONB DEFAULT '{}',
  customFields JSONB DEFAULT '{}',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- NEW: Mock data classification fields
  isMockData BOOLEAN DEFAULT false,
  isExample BOOLEAN DEFAULT false,
  dataSource TEXT DEFAULT 'manual' CHECK (dataSource IN ('mock', 'real', 'imported', 'manual')),
  createdBy TEXT DEFAULT 'user' CHECK (createdBy IN ('system', 'user', 'demo')),
  mockDataType TEXT CHECK (mockDataType IN ('sample', 'demo', 'test'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_interestLevel ON contacts(interestLevel);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_aiScore ON contacts(aiScore DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_createdAt ON contacts(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_updatedAt ON contacts(updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_isFavorite ON contacts(isFavorite);
CREATE INDEX IF NOT EXISTS idx_contacts_industry ON contacts(industry);
CREATE INDEX IF NOT EXISTS idx_contacts_sources ON contacts USING gin(sources);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_socialProfiles ON contacts USING gin(socialProfiles);
CREATE INDEX IF NOT EXISTS idx_contacts_customFields ON contacts USING gin(customFields);

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own contacts (assuming user_id will be added later if needed)
-- For now, allow all operations since this is a single-user setup
CREATE POLICY "Allow all operations on contacts"
  ON contacts
  FOR ALL
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();