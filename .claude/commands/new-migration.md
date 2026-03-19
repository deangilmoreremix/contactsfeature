# Create a New Supabase Database Migration

Create and apply a database migration for SmartCRM.

**Argument: $ARGUMENTS** (e.g., "add contact_scores table for AI scoring data")

## Steps

### 1. Check Current Schema

Run `mcp__supabase__list_tables` to see existing tables. Check `supabase/migrations/` for recent migrations to understand naming and structure.

### 2. Design the Migration

Write the migration SQL with:
- Detailed markdown comment block at the top explaining ALL changes
- `CREATE TABLE IF NOT EXISTS` for new tables
- `DO $$ BEGIN ... END $$` blocks for conditional column additions
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for every new table
- Separate RLS policies for SELECT, INSERT, UPDATE, DELETE (never FOR ALL)
- Foreign key indexes on all FK columns
- Meaningful defaults for all columns
- `uuid` primary keys with `DEFAULT gen_random_uuid()`
- `timestamptz` for all timestamps with `DEFAULT now()`

### 3. RLS Policy Rules

For user-owned tables (have `user_id` column):
```sql
CREATE POLICY "Users can select own <table>"
  ON <table> FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own <table>"
  ON <table> FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own <table>"
  ON <table> FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own <table>"
  ON <table> FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

For contact-child tables (linked via `contact_id` to contacts table):
```sql
CREATE POLICY "Users can select own <table>"
  ON <table> FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = <table>.contact_id AND c.user_id = auth.uid()
    )
  );
```

### 4. Apply the Migration

Use `mcp__supabase__apply_migration` with:
- `filename`: descriptive snake_case name (e.g., `create_contact_scores_table`)
- `content`: the full SQL including the comment block

### 5. Verify

Run `mcp__supabase__execute_sql` with a simple SELECT to confirm the table was created and RLS is enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = '<new_table>';
```

## Migration Template

```sql
/*
  # <Title>

  1. New Tables
    - `<table_name>`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `<columns...>`
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `<table_name>`
    - Add policies for authenticated users to manage their own data

  3. Indexes
    - Index on `user_id` for fast ownership lookups
    - <additional indexes>
*/

CREATE TABLE IF NOT EXISTS <table_name> (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  -- columns here
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_<table_name>_user_id ON <table_name>(user_id);

-- RLS Policies
CREATE POLICY "Users can select own <table_name>"
  ON <table_name> FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own <table_name>"
  ON <table_name> FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own <table_name>"
  ON <table_name> FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own <table_name>"
  ON <table_name> FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

## Rules

- NEVER use `USING (true)` -- all policies must check ownership
- NEVER use `DROP TABLE` or `DROP COLUMN` -- data safety is paramount
- NEVER use `BEGIN`/`COMMIT`/`ROLLBACK` transaction control (DO $$ BEGIN...END $$ blocks are fine)
- Always use `IF EXISTS` / `IF NOT EXISTS` guards
- Always include `user_id` or link to a table that has `user_id` via FK
