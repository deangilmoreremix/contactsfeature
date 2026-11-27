/**
 * Pure sequence logic (no I/O) + the DB-backed advance used by sequence-enroll / sequence-advance.
 *
 * Enrollment model: ONE step tracker.
 *   current_step = number of steps already queued (0-based index of the NEXT step to queue)
 *   completed_at is set when current_step reaches the number of steps (or the contact replied).
 *   next_run_at  = when the next step becomes due.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(from, days) {
  return new Date(new Date(from).getTime() + Math.max(0, Number(days) || 0) * DAY_MS);
}

/** Decide what to do with a step given the previous email in the enrollment. */
function decideStep(condition, prevEmail) {
  if (prevEmail && prevEmail.replied_at) return 'stop'; // a reply always ends the sequence
  switch (condition) {
    case 'opened': return prevEmail && prevEmail.opened_at ? 'send' : 'skip';
    case 'clicked': return prevEmail && prevEmail.clicked_at ? 'send' : 'skip';
    default: return 'send'; // 'no_response' (reply checked above) and 'always'
  }
}

function merge(text, contact) {
  const vars = {
    firstName: contact?.firstname || (contact?.name || '').split(' ')[0] || '',
    lastName: contact?.lastname || '',
    name: contact?.name || [contact?.firstname, contact?.lastname].filter(Boolean).join(' '),
    company: contact?.company || '',
    email: contact?.email || '',
  };
  return String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function textToHtml(text) {
  const esc = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

/**
 * Plan the next advance for an enrollment. Returns
 *  { action: 'complete' }                         nothing left
 *  { action: 'stop' }                             replied: end early
 *  { action: 'skip', enrollment }                 step skipped by condition, tracker moved on
 *  { action: 'queue', email, enrollment }         create `email` row, apply `enrollment` patch
 */
function planAdvance({ enrollment, steps, contact, prevEmail, now = new Date() }) {
  const sorted = [...steps].sort((a, b) => a.position - b.position);
  const idx = enrollment.current_step || 0;
  if (idx >= sorted.length) return { action: 'complete', enrollment: { completed_at: now.toISOString(), status: 'completed', next_run_at: null } };

  const step = sorted[idx];
  const decision = decideStep(step.condition, prevEmail);
  if (decision === 'stop') return { action: 'stop', enrollment: { completed_at: now.toISOString(), status: 'completed', next_run_at: null } };

  const nextIdx = idx + 1;
  const done = nextIdx >= sorted.length;
  const following = sorted[nextIdx];
  const patch = {
    current_step: nextIdx,
    completed_at: done ? now.toISOString() : null,
    status: done ? 'completed' : 'active',
    next_run_at: done ? null : addDays(now, following.delay_days).toISOString(),
  };
  if (decision === 'skip') return { action: 'skip', enrollment: patch };

  const body = merge(step.body, contact);
  return {
    action: 'queue',
    email: {
      to_email: contact.email,
      subject: merge(step.subject, contact),
      body_text: body,
      body_html: textToHtml(body),
      status: 'queued',
      scheduled_for: now.toISOString(),
      is_inbound: false,
    },
    enrollment: patch,
  };
}

/** First due time for a freshly enrolled contact. */
function firstRunAt(steps, now = new Date()) {
  const first = [...steps].sort((a, b) => a.position - b.position)[0];
  return first ? addDays(now, first.delay_days) : now;
}

/**
 * Advance one enrollment against the database (service client, filtered by owner).
 * Returns { action, emailId? }.
 */
async function advanceEnrollment(supabase, enrollment, now = new Date()) {
  // A paused sequence (sequences.is_active = false) must not send anything: leave the enrollment untouched so it
  // resumes where it was when the sequence is re-activated.
  const { data: sequence } = await supabase.from('sequences').select('is_active').eq('id', enrollment.sequence_id).eq('user_id', enrollment.user_id).maybeSingle();
  if (sequence && sequence.is_active === false) return { action: 'paused' };

  const [{ data: steps }, { data: contact }] = await Promise.all([
    supabase.from('sequence_steps').select('*').eq('sequence_id', enrollment.sequence_id).eq('user_id', enrollment.user_id).order('position'),
    supabase.from('contacts').select('id, firstname, lastname, name, company, email').eq('id', enrollment.contact_id).eq('user_id', enrollment.user_id).maybeSingle(),
  ]);
  const patchOnly = async (p) => supabase.from('sequence_enrollments').update({ ...p, updated_at: now.toISOString() }).eq('id', enrollment.id).eq('user_id', enrollment.user_id);

  if (!steps || !steps.length || !contact || !contact.email) {
    await patchOnly({ status: 'failed', next_run_at: null, last_error: !contact?.email ? 'Contact has no email address' : 'Sequence has no steps or contact is missing' });
    return { action: 'failed' };
  }

  let prevEmail = null;
  if (enrollment.last_email_id) {
    const { data } = await supabase.from('emails').select('id, opened_at, clicked_at').eq('id', enrollment.last_email_id).maybeSingle();
    prevEmail = data || null;
  }
  // Any inbound email from this contact since enrollment counts as a reply.
  const { data: reply } = await supabase.from('emails').select('id').eq('user_id', enrollment.user_id).eq('contact_id', enrollment.contact_id)
    .eq('is_inbound', true).gte('created_at', enrollment.created_at).limit(1).maybeSingle();
  if (reply) prevEmail = { ...(prevEmail || {}), replied_at: now.toISOString() };

  const plan = planAdvance({ enrollment, steps, contact, prevEmail, now });
  if (plan.action === 'queue') {
    const { data: row, error } = await supabase.from('emails').insert({
      ...plan.email, user_id: enrollment.user_id, contact_id: enrollment.contact_id,
    }).select('id').maybeSingle();
    if (error || !row) {
      await patchOnly({ last_error: `Could not queue email: ${error?.message || 'unknown'}` });
      return { action: 'failed' };
    }
    await patchOnly({ ...plan.enrollment, last_email_id: row.id, last_error: null });
    return { action: 'queue', emailId: row.id };
  }
  await patchOnly(plan.enrollment);
  return { action: plan.action };
}

async function advanceDue(supabase, limit = 25, now = new Date()) {
  // Skip enrollments of paused sequences in the query itself so they cannot fill the batch and starve active ones.
  const { data: paused } = await supabase.from('sequences').select('id').eq('is_active', false);
  const pausedIds = (paused || []).map((s) => s.id).filter((id) => /^[0-9a-f-]{36}$/i.test(String(id)));
  let dueQuery = supabase.from('sequence_enrollments').select('*')
    .eq('status', 'active').is('completed_at', null).lte('next_run_at', now.toISOString());
  if (pausedIds.length) dueQuery = dueQuery.not('sequence_id', 'in', `(${pausedIds.join(',')})`);
  const { data: due } = await dueQuery.order('next_run_at').limit(limit);
  const results = [];
  for (const e of due || []) {
    try { results.push({ id: e.id, ...(await advanceEnrollment(supabase, e, now)) }); }
    catch (err) { results.push({ id: e.id, action: 'failed', error: err.message }); }
  }
  return results;
}

module.exports = { addDays, decideStep, merge, textToHtml, planAdvance, firstRunAt, advanceEnrollment, advanceDue };
