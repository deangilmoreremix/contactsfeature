// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const S = require('../netlify/functions/_sequences.js');

const now = new Date('2026-03-02T10:00:00Z');
const steps = [
  { position: 0, delay_days: 0, subject: 'Hi {{firstName}}', body: 'Hello {{firstName}} at {{company}}', condition: 'always' },
  { position: 1, delay_days: 3, subject: 'Follow up', body: 'Checking in', condition: 'no_response' },
  { position: 2, delay_days: 4, subject: 'Last', body: 'Bump', condition: 'opened' },
];
const contact = { id: 'c1', email: 'a@b.co', firstname: 'Ada', company: 'Acme' };

describe('sequence planning', () => {
  it('queues step 1 with merged fields and schedules the next step by its delay', () => {
    const p = S.planAdvance({ enrollment: { current_step: 0 }, steps, contact, prevEmail: null, now });
    expect(p.action).toBe('queue');
    expect(p.email).toMatchObject({ to_email: 'a@b.co', subject: 'Hi Ada', status: 'queued', scheduled_for: now.toISOString() });
    expect(p.email.body_html).toContain('Hello Ada at Acme');
    expect(p.enrollment.current_step).toBe(1);
    expect(p.enrollment.completed_at).toBeNull();
    expect(p.enrollment.next_run_at).toBe('2026-03-05T10:00:00.000Z');
  });

  it('completes when current_step reaches the length', () => {
    const p = S.planAdvance({ enrollment: { current_step: 2 }, steps, contact, prevEmail: { opened_at: 'x' }, now });
    expect(p.action).toBe('queue');
    expect(p.enrollment.current_step).toBe(3);
    expect(p.enrollment.completed_at).toBe(now.toISOString());
    expect(p.enrollment.status).toBe('completed');
    expect(p.enrollment.next_run_at).toBeNull();
    expect(S.planAdvance({ enrollment: { current_step: 3 }, steps, contact, now }).action).toBe('complete');
  });

  it('stops on reply and skips unmet conditions', () => {
    expect(S.planAdvance({ enrollment: { current_step: 1 }, steps, contact, prevEmail: { replied_at: 'x' }, now }).action).toBe('stop');
    const skip = S.planAdvance({ enrollment: { current_step: 2 }, steps, contact, prevEmail: { opened_at: null }, now });
    expect(skip.action).toBe('skip');
    expect(skip.enrollment.completed_at).toBe(now.toISOString());
  });

  it('first run honours the first step delay', () => {
    expect(S.firstRunAt([{ position: 0, delay_days: 2 }], now).toISOString()).toBe('2026-03-04T10:00:00.000Z');
  });
});

describe('advanceEnrollment (db)', () => {
  function fakeDb() {
    const calls: any = { inserts: [], updates: [] };
    const tbl: Record<string, any> = {
      sequence_steps: { data: steps },
      contacts: { data: contact },
      emails: { data: null },
    };
    const from = (name: string) => {
      const q: any = {
        _name: name, _op: 'select',
        select() { return q; }, eq() { return q; }, gte() { return q; }, order() { return Promise.resolve(tbl[name]); }, limit() { return q; },
        insert(row: any) { q._op = 'insert'; calls.inserts.push({ name, row }); return q; },
        update(row: any) { q._op = 'update'; calls.updates.push({ name, row }); return q; },
        maybeSingle() { return Promise.resolve(q._op === 'insert' ? { data: { id: 'email-1' }, error: null } : (tbl[name] || { data: null })); },
        then(res: any) { return Promise.resolve({ data: null, error: null }).then(res); },
      };
      return q;
    };
    return { supabase: { from }, calls };
  }

  it('inserts a queued email row and advances the tracker', async () => {
    const { supabase, calls } = fakeDb();
    const r = await S.advanceEnrollment(supabase, { id: 'e1', user_id: 'u1', sequence_id: 's1', contact_id: 'c1', current_step: 0, created_at: now.toISOString() }, now);
    expect(r).toEqual({ action: 'queue', emailId: 'email-1' });
    expect(calls.inserts[0].row).toMatchObject({ user_id: 'u1', contact_id: 'c1', status: 'queued', is_inbound: false });
    expect(calls.updates.at(-1).row).toMatchObject({ current_step: 1, last_email_id: 'email-1' });
  });

  it('pauses the enrollment and sends nothing when the contact is in the trash', async () => {
    const { supabase, calls } = fakeDb();
    const trashed = { ...supabase, from: (name: string) => {
      const q: any = supabase.from(name);
      if (name !== 'contacts') return q;
      q.maybeSingle = () => Promise.resolve({ data: { ...contact, deleted_at: '2026-03-01T00:00:00Z' }, error: null });
      return q;
    } };
    const r = await S.advanceEnrollment(trashed, { id: 'e1', user_id: 'u1', sequence_id: 's1', contact_id: 'c1', current_step: 0, created_at: now.toISOString() }, now);
    expect(r).toEqual({ action: 'contact_trashed' });
    expect(calls.inserts).toHaveLength(0);
    expect(calls.updates.at(-1).row).toMatchObject({ status: 'paused', next_run_at: null, last_error: 'Contact is in the trash' });
  });

  it('does nothing for an enrollment whose sequence is paused', async () => {
    const { supabase, calls } = fakeDb();
    const paused = { ...supabase, from: (name: string) => {
      if (name !== 'sequences') return supabase.from(name);
      const q: any = { select() { return q; }, eq() { return q; }, maybeSingle() { return Promise.resolve({ data: { is_active: false }, error: null }); } };
      return q;
    } };
    const r = await S.advanceEnrollment(paused, { id: 'e1', user_id: 'u1', sequence_id: 's1', contact_id: 'c1', current_step: 0, created_at: now.toISOString() }, now);
    expect(r).toEqual({ action: 'paused' });
    expect(calls.inserts).toHaveLength(0);
    expect(calls.updates).toHaveLength(0);
  });
});
