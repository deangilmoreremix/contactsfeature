/**
 * POST { sequence_id, contact_id }  (authenticated) -> enrolls the contact in the user's sequence.
 * POST { enrollment_id, action: 'pause'|'resume'|'cancel' } -> manage an enrollment.
 * The first step is queued by the scheduled advance (sequence-advance-scheduled) when it is due.
 */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { firstRunAt } = require('./_sequences');

const ok = (obj) => ({ statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(obj) });

exports.handler = withAuth(async (event, user) => {
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON'); }

  if (b.enrollment_id) {
    const map = { pause: { status: 'paused' }, resume: { status: 'active' }, cancel: { status: 'cancelled', next_run_at: null } };
    const patch = map[b.action];
    if (!patch) return errorResponse(400, 'action must be pause, resume or cancel');
    const { data, error } = await supabase.from('sequence_enrollments').update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', b.enrollment_id).eq('user_id', user.id).is('completed_at', null).select('id,status').maybeSingle();
    if (error) return errorResponse(500, error.message);
    if (!data) return errorResponse(404, 'Active enrollment not found');
    return ok({ success: true, enrollment: data });
  }

  if (!b.sequence_id || !b.contact_id) return errorResponse(400, 'sequence_id and contact_id are required');
  const [{ data: seq }, { data: contact }] = await Promise.all([
    supabase.from('sequences').select('id, is_active').eq('id', b.sequence_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('contacts').select('id, email').eq('id', b.contact_id).eq('user_id', user.id).maybeSingle(),
  ]);
  if (!seq) return errorResponse(404, 'Sequence not found');
  if (!contact) return errorResponse(404, 'Contact not found');
  if (!contact.email) return errorResponse(422, 'Contact has no email address');
  if (!seq.is_active) return errorResponse(409, 'Activate the sequence before enrolling contacts');

  const { data: steps } = await supabase.from('sequence_steps').select('position, delay_days').eq('sequence_id', seq.id).eq('user_id', user.id);
  if (!steps || !steps.length) return errorResponse(422, 'Sequence has no steps');

  const { data: existing } = await supabase.from('sequence_enrollments').select('id').eq('sequence_id', seq.id).eq('contact_id', contact.id)
    .eq('user_id', user.id).in('status', ['active', 'paused']).maybeSingle();
  if (existing) return errorResponse(409, 'Contact is already enrolled in this sequence');

  const { data: row, error } = await supabase.from('sequence_enrollments').insert({
    user_id: user.id, sequence_id: seq.id, contact_id: contact.id, current_step: 0, status: 'active',
    next_run_at: firstRunAt(steps).toISOString(),
  }).select('*').maybeSingle();
  if (error) return errorResponse(500, error.message);
  return ok({ success: true, enrollment: row });
});
