const { supabase } = require('./_supabaseClient');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { contactId, autopilot_enabled, escalated_to_ae } = body;

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'contactId is required' })
      };
    }

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
          autopilot_enabled: autopilot_enabled ?? false,
          escalated_to_ae: escalated_to_ae ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
          .update({
            status: autopilotStatus,
            updated_at: new Date().toISOString()
          })
          .eq('lead_id', contactId)
          .eq('agent_type', 'sdr_autopilot');
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ settings })
    };

  } catch (error) {
    console.error('[update-autopilot-settings] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to update autopilot settings',
        details: error.message
      })
    };
  }
};
