/*
  # agent_memory: owner-only access (memory-get endpoint)

  `agent_memory` (short / mid / long layers per contact) already exists, but earlier migrations left it with a
  `FOR ALL ... USING (true)` policy, i.e. any signed-in user could read and rewrite every user's agent memory.
  The new `memory-get` function and the Memory panel show this data, so access is tightened to the contact's owner.

  1. Table: `created_at` added (run-ae-agent already orders by it); index on `contact_id` (an earlier migration dropped it).
  2. RLS: the blanket policies are dropped; four separate owner policies (SELECT / INSERT / UPDATE / DELETE) allow a row
     only when its contact belongs to `auth.uid()` (`contacts.user_id`). The service role (Netlify functions, autopilot)
     bypasses RLS and is unaffected.
*/

ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS agent_memory_contact_updated_idx ON agent_memory (contact_id, updated_at DESC);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON agent_memory;
DROP POLICY IF EXISTS "Users can view agent memory" ON agent_memory;
DROP POLICY IF EXISTS "Users can manage agent memory" ON agent_memory;
DROP POLICY IF EXISTS "Authenticated users can access agent memory" ON agent_memory;
DROP POLICY IF EXISTS "agent_memory_select_own" ON agent_memory;
DROP POLICY IF EXISTS "agent_memory_insert_own" ON agent_memory;
DROP POLICY IF EXISTS "agent_memory_update_own" ON agent_memory;
DROP POLICY IF EXISTS "agent_memory_delete_own" ON agent_memory;

CREATE POLICY "agent_memory_select_own" ON agent_memory FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM contacts c WHERE c.id = agent_memory.contact_id AND c.user_id = (select auth.uid())));

CREATE POLICY "agent_memory_insert_own" ON agent_memory FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM contacts c WHERE c.id = agent_memory.contact_id AND c.user_id = (select auth.uid())));

CREATE POLICY "agent_memory_update_own" ON agent_memory FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM contacts c WHERE c.id = agent_memory.contact_id AND c.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM contacts c WHERE c.id = agent_memory.contact_id AND c.user_id = (select auth.uid())));

CREATE POLICY "agent_memory_delete_own" ON agent_memory FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM contacts c WHERE c.id = agent_memory.contact_id AND c.user_id = (select auth.uid())));
