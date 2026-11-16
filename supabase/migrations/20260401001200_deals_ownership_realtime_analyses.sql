/*
  # Deal ownership, analysis storage, unified_messages and Realtime publication

  ## Changes
  - deals: adds `user_id` (owner, defaults to auth.uid()), `title`, `expected_close_date`, `closed_at`;
    backfills `user_id` from the linked contact; replaces the "any authenticated user" policy with
    owner policies (separate SELECT / INSERT / UPDATE / DELETE)
  - deal_health_analyses, sales_forecasts: created (the Netlify functions insert into them) with owner RLS
  - unified_messages: created if missing (CommunicationProvider subscribes to it) with owner RLS
  - supabase_realtime publication: contacts, deals, unified_messages (RLS still filters what each user receives)

  ## Security
  - RLS enabled on every table touched; policies use (select auth.uid())
*/

-- ---------------------------------------------------------------- deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE deals ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS expected_close_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS closed_at timestamptz;

UPDATE deals d
SET user_id = c.user_id
FROM contacts c
WHERE d.contact_id = c.id AND d.user_id IS NULL AND c.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS deals_user_idx ON deals(user_id);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view deals" ON deals;
DROP POLICY IF EXISTS "Users can manage deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can access deals" ON deals;
DROP POLICY IF EXISTS "service_role_all" ON deals;
DROP POLICY IF EXISTS "deals_select_own" ON deals;
DROP POLICY IF EXISTS "deals_insert_own" ON deals;
DROP POLICY IF EXISTS "deals_update_own" ON deals;
DROP POLICY IF EXISTS "deals_delete_own" ON deals;

CREATE POLICY "deals_select_own" ON deals FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM contacts c WHERE c.id = deals.contact_id AND c.user_id = (select auth.uid())));
CREATE POLICY "deals_insert_own" ON deals FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "deals_update_own" ON deals FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM contacts c WHERE c.id = deals.contact_id AND c.user_id = (select auth.uid())))
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "deals_delete_own" ON deals FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM contacts c WHERE c.id = deals.contact_id AND c.user_id = (select auth.uid())));

-- ---------------------------------------------------------------- deal_health_analyses
CREATE TABLE IF NOT EXISTS deal_health_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  analysis_depth text,
  health_score numeric,
  risk_level text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_health_analyses_deal_idx ON deal_health_analyses(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deal_health_analyses_user_idx ON deal_health_analyses(user_id);
ALTER TABLE deal_health_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deal_health_analyses_select_own" ON deal_health_analyses;
DROP POLICY IF EXISTS "deal_health_analyses_insert_own" ON deal_health_analyses;
DROP POLICY IF EXISTS "deal_health_analyses_update_own" ON deal_health_analyses;
DROP POLICY IF EXISTS "deal_health_analyses_delete_own" ON deal_health_analyses;
CREATE POLICY "deal_health_analyses_select_own" ON deal_health_analyses FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "deal_health_analyses_insert_own" ON deal_health_analyses FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "deal_health_analyses_update_own" ON deal_health_analyses FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "deal_health_analyses_delete_own" ON deal_health_analyses FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- sales_forecasts
CREATE TABLE IF NOT EXISTS sales_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  timeframe text,
  deal_count int NOT NULL DEFAULT 0,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_forecasts_user_idx ON sales_forecasts(user_id, created_at DESC);
ALTER TABLE sales_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_forecasts_select_own" ON sales_forecasts;
DROP POLICY IF EXISTS "sales_forecasts_insert_own" ON sales_forecasts;
DROP POLICY IF EXISTS "sales_forecasts_update_own" ON sales_forecasts;
DROP POLICY IF EXISTS "sales_forecasts_delete_own" ON sales_forecasts;
CREATE POLICY "sales_forecasts_select_own" ON sales_forecasts FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "sales_forecasts_insert_own" ON sales_forecasts FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "sales_forecasts_update_own" ON sales_forecasts FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "sales_forecasts_delete_own" ON sales_forecasts FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- unified_messages
CREATE TABLE IF NOT EXISTS unified_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'gmail',
  account_id text,
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  sender jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient jsonb NOT NULL DEFAULT '{}'::jsonb,
  subject text,
  content text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS unified_messages_user_idx ON unified_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS unified_messages_contact_idx ON unified_messages(contact_id, created_at DESC);
ALTER TABLE unified_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unified_messages_select_own" ON unified_messages;
DROP POLICY IF EXISTS "unified_messages_insert_own" ON unified_messages;
DROP POLICY IF EXISTS "unified_messages_update_own" ON unified_messages;
DROP POLICY IF EXISTS "unified_messages_delete_own" ON unified_messages;
CREATE POLICY "unified_messages_select_own" ON unified_messages FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "unified_messages_insert_own" ON unified_messages FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "unified_messages_update_own" ON unified_messages FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "unified_messages_delete_own" ON unified_messages FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- Realtime publication
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['contacts', 'deals', 'unified_messages'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
