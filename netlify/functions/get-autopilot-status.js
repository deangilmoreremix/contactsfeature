const { supabase } = require('./_supabaseClient');
const { withAuth } = require('./_auth');
const { isValidUUID } = require('./_validation');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = withAuth(async (event, user) => {
  try {
    const { contactId } = JSON.parse(event.body || '{}');

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'contactId is required' })
      };
    }

    if (!isValidUUID(contactId)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'contactId must be a valid UUID' }) };
    }

    // Own contacts only: foreign ids are indistinguishable from missing ones.
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, email, company, lead_status, pipeline_stage')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError || !contact) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    const { data: agentSettings } = await supabase
      .from('contact_agent_settings')
      .select('*')
      .eq('contact_id', contactId)
      .maybeSingle();

    const { data: autopilotRow } = await supabase
      .from('autopilot_state')
      .select('state_json, status, updated_at')
      .eq('lead_id', contactId)
      .eq('agent_type', 'sdr_autopilot')
      .maybeSingle();

    const { data: lastLog } = await supabase
      .from('agent_runs')
      .select('id, agent_id, status, created_at, output_data')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const settings = {
      autopilot_enabled: agentSettings?.autopilot_enabled ?? false,
      escalated_to_ae: agentSettings?.escalated_to_ae ?? false,
      current_step: autopilotRow?.state_json?.current_step ?? null,
      sequence_length: agentSettings?.sequence_length ?? autopilotRow?.state_json?.sequence_length ?? null,
      last_activity: autopilotRow?.updated_at ?? null,
      status: autopilotRow?.status ?? 'inactive'
    };

    const formattedLog = lastLog ? {
      created_at: lastLog.created_at,
      level: lastLog.status === 'failed' ? 'ERROR' : 'INFO',
      message: lastLog.output_data?.summary
        || `Agent ${lastLog.agent_id} completed with status: ${lastLog.status}`
    } : null;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          company: contact.company,
          lead_status: contact.lead_status
        },
        settings,
        lastLog: formattedLog
      })
    };

  } catch (error) {
    console.error('[get-autopilot-status] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to load autopilot status',
        details: error.message
      })
    };
  }
});
