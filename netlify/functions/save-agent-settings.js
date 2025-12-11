// netlify/functions/save-agent-settings.js
const { supabase } = require("./_supabaseClient");

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const {
      contactId,
      autopilotEnabled,
      selectedAgent,
      selectedPersona,
      sequenceLength,
      channels,
      skills,
      inbox,
      quietHours
    } = body;

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "contactId is required" })
      };
    }

    // upsert settings
    const { data, error } = await supabase
      .from("contact_agent_settings")
      .upsert(
        {
          contact_id: contactId,
          autopilot_enabled: !!autopilotEnabled,
          agent_id: selectedAgent || null,
          persona_id: selectedPersona || null,
          sequence_length: sequenceLength ? parseInt(sequenceLength, 10) : null,
          channels: channels || {},
          skills: skills || {},
          inbox: inbox || null,
          quiet_hours: quietHours || {},
          updated_at: new Date().toISOString()
        },
        { onConflict: "contact_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[save-agent-settings] Supabase error:", error);
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Failed to save settings" })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, settings: data })
    };
  } catch (err) {
    console.error("[save-agent-settings] error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Failed to save settings" })
    };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}