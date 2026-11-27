/**
 * Scheduled driver (every 10 minutes, see netlify.toml): runs the next autopilot step for every
 * contact whose `next_action_at` is due, across all users. The step itself queues the email
 * (status 'queued'); process-email-queue-scheduled delivers it through the user's own provider.
 */
const { scheduledOnly } = require('./_scheduled');
const { supabase } = require('./_supabaseClient');
const { runAutopilotStep } = require('./trigger-autopilot');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('autopilot-scheduled');
const BATCH_SIZE = 20;

exports.handler = scheduledOnly(async () => {
  log.setCorrelationId(generateCorrelationId());
  const now = new Date().toISOString();
  try {
    const { data: due, error } = await supabase
      .from('autopilot_state')
      .select('id, lead_id, user_id')
      .eq('status', 'active')
      .eq('agent_type', 'sdr_autopilot')
      .lte('next_action_at', now)
      .order('next_action_at', { ascending: true })
      .limit(BATCH_SIZE);
    if (error) throw new Error(error.message);

    let ran = 0, skipped = 0, failed = 0;
    for (const state of due || []) {
      try {
        const { data: contact } = await supabase.from('contacts').select('*').eq('id', state.lead_id).maybeSingle();
        const { data: settings } = await supabase.from('contact_agent_settings').select('*').eq('contact_id', state.lead_id).maybeSingle();
        if (!contact || !settings || !(settings.autopilot_enabled || settings.is_enabled)) { skipped++; continue; }
        await runAutopilotStep(contact, settings);
        ran++;
      } catch (err) {
        failed++;
        await supabase.from('agent_logs').insert({
          contact_id: state.lead_id, user_id: state.user_id, agent_type: 'sdr', level: 'error',
          message: `Scheduled autopilot error: ${err.message}`, autopilot_state_id: state.id,
        }).catch(() => {});
      }
    }
    log.info('Scheduled autopilot run', { ran, skipped, failed, due: (due || []).length });
    return { statusCode: 200, body: JSON.stringify({ ran, skipped, failed }) };
  } catch (err) {
    log.error('Scheduled autopilot failed', { error: err.message });
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
});
