// @vitest-environment node
// Runs the real migration against an in-process Postgres (PGlite).
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const migration = readFileSync(resolve(__dirname, '../supabase/migrations/20260401000400_contact_merge_and_duplicates.sql'), 'utf8');
const U = '00000000-0000-0000-0000-0000000000aa';
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${U}'::uuid $$;
    CREATE ROLE authenticated;
    -- 002-style contacts table (unquoted camelCase => lowercase columns)
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
  await db.exec(migration);
});

const seed = async () => {
  await db.exec(`TRUNCATE contacts CASCADE;`);
  await db.exec(`
    INSERT INTO contacts (id, firstName, lastName, name, email, phone, company, title, tags, sources, notes, isFavorite, socialProfiles, aiScore, user_id) VALUES
    ('${id(1)}','Ada','Lovelace','Ada Lovelace','ada@acme.com','+1 555-123-4567','', '', '{vip}','{web}','Met at expo',false,'{"linkedin":"li-a"}',80,'${U}'),
    ('${id(2)}','Ada','L','Ada L','ADA@other.com','5551234567','Acme','CTO','{saas,vip}','{import}','Intro call',true,'{"linkedin":"li-b","twitter":"tw-b"}',40,'${U}'),
    ('${id(3)}','Bob','Stone','Bob Stone','bob@x.com','','Globex','','{}','{}','',false,'{}',null,'${U}'),
    ('${id(4)}','Ada','Lovelace','Ada Lovelace','a.lovelace@acme.com','','Acme','','{}','{}','',false,'{}',null,'${U}'),
    ('${id(5)}','Bob','Stone','Bob Stone','bob.s@x.org','','globex ','','{}','{}','',false,'{}',null,'${U}');
    INSERT INTO custom_field_values (contact_id, field_id, value) VALUES
      ('${id(1)}','${id(900)}','"w"'), ('${id(2)}','${id(900)}','"l-dup"'), ('${id(2)}','${id(901)}','"l-new"');
    INSERT INTO contact_timeline (contact_id, user_id, activity_type, description) VALUES ('${id(2)}','${U}','note_added','loser note');
    INSERT INTO deals (contact_id, stage) VALUES ('${id(2)}','lead');
  `);
};

describe('find_contact_duplicates', () => {
  it('finds phone/email/name+company duplicates and not unrelated contacts', async () => {
    await seed();
    const r = await db.query<{ reason: string; contact_ids: string[] }>(`SELECT reason, contact_ids FROM find_contact_duplicates() ORDER BY reason`);
    const kinds = r.rows.map((x) => x.reason);
    expect(kinds).toContain('phone');
    expect(kinds).toContain('name_company');
    const phone = r.rows.find((x) => x.reason === 'phone')!;
    expect([...phone.contact_ids].sort()).toEqual([id(1), id(2)]);
    const nc = r.rows.find((x) => x.reason === 'name_company')!;
    expect([...nc.contact_ids].sort()).toEqual([id(3), id(5)]);
    expect(phone.contact_ids.includes(id(3))).toBe(false);
  });

  it('can be limited to groups containing given contacts', async () => {
    await seed();
    const inGroup = await db.query<any>(`SELECT contact_ids FROM find_contact_duplicates(ARRAY['${id(3)}']::uuid[])`);
    expect(inGroup.rows).toHaveLength(1);
    expect([...inGroup.rows[0].contact_ids].sort()).toEqual([id(3), id(5)]);
    await db.exec(`INSERT INTO contacts (id, name, email, user_id) VALUES ('${id(6)}', 'Zed Unique', 'zed@z.com', '${U}')`);
    const unique = await db.query(`SELECT * FROM find_contact_duplicates(ARRAY['${id(6)}']::uuid[])`);
    expect(unique.rows).toHaveLength(0);
  });
});

describe('merge_contacts', () => {
  it('dry run returns the merged record and changes nothing', async () => {
    await seed();
    const r = await db.query<{ r: any }>(`SELECT merge_contacts('${id(1)}', ARRAY['${id(2)}']::uuid[], '{}', true) AS r`);
    const m = r.rows[0]!.r.merged;
    expect(m.company).toBe('Acme');
    expect(m.tags).toEqual(['vip', 'saas']);
    expect((await db.query(`SELECT count(*)::int AS n FROM contacts`)).rows[0]).toEqual({ n: 5 });
  });

  it('merges, re-points related rows, resolves unique conflicts and audits', async () => {
    await seed();
    const r = await db.query<{ r: any }>(`SELECT merge_contacts('${id(1)}', ARRAY['${id(2)}', '${id(4)}']::uuid[]) AS r`);
    const out = r.rows[0]!.r;
    expect(out.merged_count).toBe(2);

    const left = await db.query<any>(`SELECT * FROM contacts ORDER BY id`);
    expect(left.rows.map((x) => x.id)).toEqual([id(1), id(3), id(5)]);
    const w = left.rows[0];
    expect(w.company).toBe('Acme');
    expect(w.title).toBe('CTO');
    expect(w.email).toBe('ada@acme.com');
    expect(w.tags).toEqual(['vip', 'saas']);
    expect(w.sources).toEqual(['web', 'import']);
    expect(w.isfavorite).toBe(true);
    expect(w.notes).toBe('Met at expo\n\nIntro call');
    expect(w.socialprofiles).toEqual({ linkedin: 'li-a', twitter: 'tw-b' });
    expect(w.aiscore).toBe(80);

    // related rows moved; the duplicate custom field value was dropped, the new one kept
    expect((await db.query(`SELECT count(*)::int AS n FROM deals WHERE contact_id='${id(1)}'`)).rows[0]).toEqual({ n: 1 });
    const cfv = await db.query<any>(`SELECT field_id, value FROM custom_field_values WHERE contact_id='${id(1)}' ORDER BY field_id`);
    expect(cfv.rows).toEqual([{ field_id: id(900), value: 'w' }, { field_id: id(901), value: 'l-new' }]);
    const tl = await db.query<any>(`SELECT activity_type FROM contact_timeline WHERE contact_id='${id(1)}' ORDER BY activity_type`);
    expect(tl.rows.map((x) => x.activity_type)).toEqual(['merged', 'note_added']);
    const audit = await db.query<any>(`SELECT metadata FROM contact_timeline WHERE activity_type='merged'`);
    expect(audit.rows[0].metadata.merged_ids).toEqual([id(2), id(4)]);
    expect(audit.rows[0].metadata.snapshots).toHaveLength(2);
  });

  it('applies per-field overrides', async () => {
    await seed();
    await db.query(`SELECT merge_contacts('${id(1)}', ARRAY['${id(2)}']::uuid[], '{"email":"${id(2)}","firstname":"${id(2)}"}')`);
    const w = (await db.query<any>(`SELECT email, firstname FROM contacts WHERE id='${id(1)}'`)).rows[0];
    expect(w.email).toBe('ADA@other.com');
  });

  it('validates input', async () => {
    await seed();
    await expect(db.query(`SELECT merge_contacts('${id(1)}', ARRAY['${id(1)}']::uuid[])`)).rejects.toThrow(/itself/);
    await expect(db.query(`SELECT merge_contacts('${id(1)}', ARRAY[]::uuid[])`)).rejects.toThrow(/1 to 8/);
    await expect(db.query(`SELECT merge_contacts('${id(1)}', ARRAY['${id(77)}']::uuid[])`)).rejects.toThrow(/not found/);
  });
});
