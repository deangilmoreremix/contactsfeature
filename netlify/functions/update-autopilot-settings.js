const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('update-autopilot-settings');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, autopilot_enabled, escalated_to_ae } = body;
  const idErr = validateContactId(contactId);
  if (idErr) return errorResponse(400, idErr);

  try {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!contact) return errorResponse(404, 'Contact not found');

    const { data: existing } = await supabase
      .from('contact_agent_settings')
      .select('id')
      .eq('contact_id', contactId)
      .maybeSingle();

    const updates = {};
    if (typeof autopilot_enabled === 'boolean') updates.autopilot_enabled = autopilot_enabled;
    if (typeof escalated_to_ae === 'boolean') updates.escalated_to_ae = escalated_to_ae;
    updates.updated_at = new Date().toISOString();

    let settings;

    if (existing) {
      const { data, error } = await supabase
        .from('contact_agent_settings')
        .update(updates)
        .eq('contact_id', contactId)
        .select()
        .maybeSingle();
      if (error) throw new Error(`Update failed: ${error.message}`);
      settings = data;
    } else {
      const { data, error } = await supabase
        .from('contact_agent_settings')
        .insert({
          contact_id: contactId,
          user_id: user.id,
          autopilot_enabled: autopilot_enabled ?? false,
          escalated_to_ae: escalated_to_ae ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
      if (error) throw new Error(`Insert failed: ${error.message}`);
      settings = data;
    }

    if (typeof autopilot_enabled === 'boolean') {
      const autopilotStatus = autopilot_enabled ? 'active' : 'paused';
      const { data: existingState } = await supabase
        .from('autopilot_state')
        .select('id')
        .eq('lead_id', contactId)
        .eq('agent_type', 'sdr_autopilot')
        .maybeSingle();

      if (existingState) {
        await supabase
          .from('autopilot_state')
          .update({ status: autopilotStatus, updated_at: new Date().toISOString() })
          .eq('lead_id', contactId)
          .eq('agent_type', 'sdr_autopilot');
      }
    }

    log.info('Autopilot settings updated', { contactId });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ settings }),
    };
  } catch (error) {
    log.error('Failed to update autopilot settings', { contactId, error: error.message });
    return errorResponse(500, 'Failed to update autopilot settings');
  }
});
