// @vitest-environment node
// Runs the soft-delete migration against an in-process Postgres (PGlite).
// match_contacts needs pgvector, which PGlite does not have here, so only the part before it is executed.
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (f: string) => readFileSync(resolve(__dirname, '../supabase/migrations', f), 'utf8');
const dupes = read('20260401000400_contact_merge_and_duplicates.sql');
const softDelete = read('20260401001300_contact_soft_delete.sql');
const U = '00000000-0000-0000-0000-0000000000aa';
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${U}'::uuid $$;
    CREATE ROLE authenticated;
    CREATE TABLE contacts (
      id uuid PRIMARY KEY, firstName text, lastName text, name text, email text UNIQUE, phone text,
      title text, company text, tags text[], sources text[], notes text, isFavorite boolean DEFAULT false,
      socialProfiles jsonb DEFAULT '{}', customFields jsonb DEFAULT '{}', aiScore int, user_id uuid,
      position double precision, createdAt timestamptz DEFAULT now()
    );
    CREATE TABLE contact_timeline (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
      user_id uuid, activity_type text, description text, metadata jsonb, user_name text);
    CREATE TABLE custom_field_values (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
      field_id uuid, value jsonb, UNIQUE (contact_id, field_id));
    CREATE TABLE deals (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE, stage text);
  `);
  await db.exec(dupes);
  await db.exec(softDelete.split('-- Semantic search')[0]!);
  // re-runnable
  await db.exec(softDelete.split('-- Semantic search')[0]!);
});

describe('contact soft delete migration', () => {
  it('adds deleted_at and the (user_id, deleted_at) index', async () => {
    const col = await db.query(`SELECT data_type FROM information_schema.columns WHERE table_name='contacts' AND column_name='deleted_at'`);
    expect(col.rows[0]).toMatchObject({ data_type: 'timestamp with time zone' });
    const idx = await db.query(`SELECT indexdef FROM pg_indexes WHERE tablename='contacts' AND indexname='idx_contacts_user_deleted_at'`);
    expect(String((idx.rows[0] as any).indexdef)).toContain('(user_id, deleted_at)');
  });

  it('find_contact_duplicates ignores deleted contacts', async () => {
    await db.exec(`
      INSERT INTO contacts (id, name, email, company, user_id) VALUES
      ('${id(1)}','Ada','ada@acme.com','Acme','${U}'),
      ('${id(2)}','Ada','ada2@acme.com','Acme','${U}'),
      ('${id(3)}','Bob','bob@x.com','Other','${U}');
    `);
    const before = await db.query(`SELECT * FROM find_contact_duplicates()`);
    expect(before.rows.length).toBe(1);
    await db.exec(`UPDATE contacts SET deleted_at = now() WHERE id = '${id(2)}'`);
    const after = await db.query(`SELECT * FROM find_contact_duplicates()`);
    expect(after.rows.length).toBe(0);
    await db.exec(`UPDATE contacts SET deleted_at = NULL WHERE id = '${id(2)}'`);
    expect((await db.query(`SELECT * FROM find_contact_duplicates()`)).rows.length).toBe(1);
  });

  it('does not touch RLS policies', () => {
    expect(softDelete).not.toMatch(/POLICY/i);
    expect(softDelete).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
  });
});
