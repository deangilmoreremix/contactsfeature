// netlify/functions/get-agent-logs.js
const { supabase } = require("./_supabaseClient");

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: ""
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const contactId = params.contactId;

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "contactId is required" })
      };
    }

    const { data, error } = await supabase
      .from("agent_logs")
      .select("id, created_at, level, message")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[get-agent-logs] Supabase error:", error);
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Failed to load logs" })
      };
    }

    // Shape logs for the panel
    const logs = (data || []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      level: row.level,
      message: row.message
    }));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ logs })
    };
  } catch (err) {
    console.error("[get-agent-logs] error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Failed to load logs" })
    };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}