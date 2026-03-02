import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const contactId = body.contactId as string | undefined;

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "contactId is required" }),
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
    );

    const { data: contact, error } = await supabase
      .from("contacts")
      .select("id, name, email, company, lead_status, autopilot_state")
      .eq("id", contactId)
      .maybeSingle();

    if (error || !contact) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Contact not found" }),
      };
    }

    const currentState = contact.autopilot_state || "new";
    const stateTransitions: Record<string, string> = {
      new: "sdr_outreach",
      sdr_outreach: "follow_up",
      follow_up: "engaged",
      engaged: "qualified",
      qualified: "meeting_scheduled",
      meeting_scheduled: "relationship_building",
    };

    const newState = stateTransitions[currentState] || currentState;

    await supabase
      .from("contacts")
      .update({
        autopilot_state: newState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contactId);

    const { data: autopilotRow } = await supabase
      .from("autopilot_state")
      .select("state_json, status")
      .eq("lead_id", contactId)
      .eq("agent_type", "sdr_autopilot")
      .maybeSingle();

    const step = autopilotRow?.state_json?.current_step || 1;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contactId,
        previousState: currentState,
        newState,
        step,
        message: "Autopilot run completed",
      }),
    };
  } catch (error: any) {
    console.error("[autopilot-run] Error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || "Internal Server Error",
      }),
    };
  }
};
