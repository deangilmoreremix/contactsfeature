/*
  # Harden agent settings tables

  `contact_agent_settings` and `outbound_agents` were created with "allow all" / "any authenticated
  user" policies, so any signed-in user could read or change every user's agent configuration.

  ## Changes
  - contact_agent_settings: owner-only policies (through contacts.user_id), separate per operation;
    adds `settings` JSONB (channels, skills, quiet hours, sequence length, from address, selected agent)
  - outbound_agents: read-only for authenticated users (it is a shared catalogue); the AgentMail-era
    `inbox_email` becomes optional
*/

ALTER TABLE contact_agent_settings ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE contact_agent_settings ADD COLUMN IF NOT EXISTS persona_id TEXT;
ALTER TABLE contact_agent_settings ADD COLUMN IF NOT EXISTS followup_mode TEXT DEFAULT 'manual';
ALTER TABLE contact_agent_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE contact_agent_settings ADD COLUMN IF NOT EXISTS notes TEXT;
-- the competing second definition declared agent_key NOT NULL; make it optional so upserts by contact work
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_agent_settings' AND column_name = 'agent_key') THEN
    ALTER TABLE contact_agent_settings ALTER COLUMN agent_key DROP NOT NULL;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS contact_agent_settings_contact_unique ON contact_agent_settings (contact_id);

DROP POLICY IF EXISTS "Users can view contact agent settings" ON contact_agent_settings;
DROP POLICY IF EXISTS "Users can manage contact agent settings" ON contact_agent_settings;
DROP POLICY IF EXISTS "Allow all operations on contact_agent_settings" ON contact_agent_settings;
DROP POLICY IF EXISTS "contact_agent_settings_select_own" ON contact_agent_settings;
DROP POLICY IF EXISTS "contact_agent_settings_insert_own" ON contact_agent_settings;
DROP POLICY IF EXISTS "contact_agent_settings_update_own" ON contact_agent_settings;
DROP POLICY IF EXISTS "contact_agent_settings_delete_own" ON contact_agent_settings;

CREATE POLICY "contact_agent_settings_select_own" ON contact_agent_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_agent_settings.contact_id AND c.user_id = (select auth.uid())));
CREATE POLICY "contact_agent_settings_insert_own" ON contact_agent_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_agent_settings.contact_id AND c.user_id = (select auth.uid())));
CREATE POLICY "contact_agent_settings_update_own" ON contact_agent_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_agent_settings.contact_id AND c.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_agent_settings.contact_id AND c.user_id = (select auth.uid())));
CREATE POLICY "contact_agent_settings_delete_own" ON contact_agent_settings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_agent_settings.contact_id AND c.user_id = (select auth.uid())));

-- outbound_agents: shared catalogue, read-only for signed-in users
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outbound_agents' AND column_name = 'inbox_email') THEN
    ALTER TABLE outbound_agents ALTER COLUMN inbox_email DROP NOT NULL;
  END IF;
END $$;
DROP POLICY IF EXISTS "Allow all operations on outbound_agents" ON outbound_agents;
DROP POLICY IF EXISTS "outbound_agents_select_authenticated" ON outbound_agents;
CREATE POLICY "outbound_agents_select_authenticated" ON outbound_agents FOR SELECT TO authenticated USING (true);
