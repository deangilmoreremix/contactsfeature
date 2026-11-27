/**
 * Email sequences (tables `sequences`, `sequence_steps`, `sequence_enrollments`; owner-only RLS).
 * Steps are queued as `emails` rows (status 'queued', scheduled_for) by the scheduled
 * sequence-advance function; delivery uses the user's own provider via process-email-queue.
 * Enrollment tracker: current_step = steps already queued, completed_at set when it reaches the length.
 */
import { supabase } from '../lib/supabase';
import { sdrAuthHeaders } from './sdrClient';

export type StepCondition = 'no_response' | 'opened' | 'clicked' | 'always';
export interface SequenceStepDef {
  id?: string;
  name: string;
  delay: number; // days after the previous step (or after enrollment for the first step)
  subject: string;
  body: string;
  condition: StepCondition;
  priority?: string;
}
export interface SequenceDef {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  steps: Array<SequenceStepDef & { id: string }>;
  createdAt: string;
  updatedAt: string;
}
export interface EnrollmentInfo {
  id: string;
  sequenceId: string;
  contactId: string;
  currentStep: number;
  status: string;
  nextRunAt: string | null;
  completedAt: string | null;
  lastError: string | null;
}

type SeqRow = { id: string; name: string; description: string | null; is_active: boolean; created_at: string; updated_at: string };
type StepRow = { id: string; sequence_id: string; position: number; name: string | null; delay_days: number; subject: string; body: string; condition: StepCondition; priority: string };
type EnrRow = { id: string; sequence_id: string; contact_id: string; current_step: number; status: string; next_run_at: string | null; completed_at: string | null; last_error: string | null };

const mapStep = (s: StepRow) => ({ id: s.id, name: s.name || `Step ${s.position + 1}`, delay: s.delay_days, subject: s.subject, body: s.body, condition: s.condition, priority: s.priority });

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Please sign in');
  return data.user.id;
}

export const sequenceService = {
  async list(): Promise<SequenceDef[]> {
    const [{ data: seqs, error }, { data: steps, error: e2 }] = await Promise.all([
      supabase.from('sequences').select('*').order('created_at', { ascending: true }),
      supabase.from('sequence_steps').select('*').order('position', { ascending: true }),
    ]);
    if (error) throw new Error(error.message);
    if (e2) throw new Error(e2.message);
    const byseq = new Map<string, StepRow[]>();
    for (const s of (steps || []) as unknown as StepRow[]) byseq.set(s.sequence_id, [...(byseq.get(s.sequence_id) || []), s]);
    return ((seqs || []) as unknown as SeqRow[]).map((q) => ({
      id: q.id, name: q.name, description: q.description || '', isActive: q.is_active, createdAt: q.created_at, updatedAt: q.updated_at,
      steps: (byseq.get(q.id) || []).map(mapStep),
    }));
  },

  async create(name: string, description: string): Promise<SequenceDef> {
    const { data, error } = await supabase.from('sequences').insert({ user_id: await uid(), name, description: description || null } as never).select('*').maybeSingle();
    if (error || !data) throw new Error(error?.message || 'Could not create sequence');
    const q = data as unknown as SeqRow;
    return { id: q.id, name: q.name, description: q.description || '', isActive: q.is_active, createdAt: q.created_at, updatedAt: q.updated_at, steps: [] };
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from('sequences').update({ is_active: isActive, updated_at: new Date().toISOString() } as never).eq('id', id);
    if (error) throw new Error(error.message);
  },

  /** Replace all steps of a sequence (positions are the array order). */
  async saveSteps(sequenceId: string, steps: SequenceStepDef[]): Promise<Array<SequenceStepDef & { id: string }>> {
    const user_id = await uid();
    const { error: delErr } = await supabase.from('sequence_steps').delete().eq('sequence_id', sequenceId);
    if (delErr) throw new Error(delErr.message);
    if (!steps.length) return [];
    const rows = steps.map((s, position) => ({
      user_id, sequence_id: sequenceId, position, name: s.name, delay_days: Math.max(0, Math.round(s.delay || 0)),
      subject: s.subject, body: s.body, condition: s.condition, priority: s.priority || 'normal',
    }));
    const { data, error } = await supabase.from('sequence_steps').insert(rows as never).select('*');
    if (error) throw new Error(error.message);
    await supabase.from('sequences').update({ updated_at: new Date().toISOString() } as never).eq('id', sequenceId);
    return ((data || []) as unknown as StepRow[]).sort((a, b) => a.position - b.position).map(mapStep);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('sequences').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async enroll(sequenceId: string, contactId: string): Promise<void> {
    const res = await fetch('/.netlify/functions/sequence-enroll', {
      method: 'POST', headers: await sdrAuthHeaders(), body: JSON.stringify({ sequence_id: sequenceId, contact_id: contactId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Could not enroll contact (${res.status})`);
  },

  async manageEnrollment(enrollmentId: string, action: 'pause' | 'resume' | 'cancel'): Promise<void> {
    const res = await fetch('/.netlify/functions/sequence-enroll', {
      method: 'POST', headers: await sdrAuthHeaders(), body: JSON.stringify({ enrollment_id: enrollmentId, action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  },

  async enrollmentsForContact(contactId: string): Promise<EnrollmentInfo[]> {
    const { data, error } = await supabase.from('sequence_enrollments').select('*').eq('contact_id', contactId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as EnrRow[]).map((e) => ({
      id: e.id, sequenceId: e.sequence_id, contactId: e.contact_id, currentStep: e.current_step, status: e.status,
      nextRunAt: e.next_run_at, completedAt: e.completed_at, lastError: e.last_error,
    }));
  },
};
