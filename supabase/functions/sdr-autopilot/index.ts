import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, contactId, contactIds } = body;

    if (action === "status") {
      const { data: states } = await serviceClient
        .from("autopilot_state")
        .select("*, contacts!autopilot_state_lead_id_fkey(firstname, name, email, company)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      return new Response(
        JSON.stringify({ states: states || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "logs") {
      const query = serviceClient
        .from("agent_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (contactId) {
        query.eq("contact_id", contactId);
      }

      const { data: logs } = await query;

      return new Response(
        JSON.stringify({ logs: logs || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "start" && contactId) {
      const { data: contact } = await serviceClient
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!contact) {
        return new Response(
          JSON.stringify({ error: "Contact not found or unauthorized" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await serviceClient.from("contact_agent_settings").upsert(
        {
          contact_id: contactId,
          autopilot_enabled: true,
          is_enabled: true,
          user_id: user.id,
          persona_id: body.personaId || "cold_saas_founder",
          sequence_length: body.sequenceLength || 5,
          current_step: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "contact_id" }
      );

      const { data: existingState } = await serviceClient
        .from("autopilot_state")
        .select("id")
        .eq("lead_id", contactId)
        .eq("agent_type", "sdr_autopilot")
        .maybeSingle();

      if (existingState) {
        await serviceClient
          .from("autopilot_state")
          .update({
            status: "active",
            next_action_at: new Date().toISOString(),
            user_id: user.id,
            persona_id: body.personaId || "cold_saas_founder",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingState.id);
      } else {
        await serviceClient.from("autopilot_state").insert({
          lead_id: contactId,
          agent_type: "sdr_autopilot",
          status: "active",
          current_stage: "cold_email",
          follow_up_count: 0,
          total_emails_sent: 0,
          persona_id: body.personaId || "cold_saas_founder",
          user_id: user.id,
          next_action_at: new Date().toISOString(),
          state_json: { initialized: true, started_by: "user" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, contactId, action: "started" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "pause" && contactId) {
      await serviceClient
        .from("autopilot_state")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("lead_id", contactId)
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ success: true, contactId, action: "paused" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "resume" && contactId) {
      await serviceClient
        .from("autopilot_state")
        .update({
          status: "active",
          next_action_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("lead_id", contactId)
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ success: true, contactId, action: "resumed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "stop" && contactId) {
      await serviceClient
        .from("autopilot_state")
        .update({ status: "stopped", updated_at: new Date().toISOString() })
        .eq("lead_id", contactId)
        .eq("user_id", user.id);

      await serviceClient.from("contact_agent_settings").update({
        autopilot_enabled: false,
        is_enabled: false,
        updated_at: new Date().toISOString(),
      }).eq("contact_id", contactId);

      return new Response(
        JSON.stringify({ success: true, contactId, action: "stopped" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "bulk_start" && contactIds?.length) {
      const results = [];
      for (const cId of contactIds.slice(0, 50)) {
        try {
          await serviceClient.from("contact_agent_settings").upsert(
            {
              contact_id: cId,
              autopilot_enabled: true,
              is_enabled: true,
              user_id: user.id,
              persona_id: body.personaId || "cold_saas_founder",
              sequence_length: body.sequenceLength || 5,
              current_step: 0,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "contact_id" }
          );

          await serviceClient.from("autopilot_state").upsert(
            {
              lead_id: cId,
              agent_type: "sdr_autopilot",
              status: "active",
              current_stage: "cold_email",
              follow_up_count: 0,
              total_emails_sent: 0,
              persona_id: body.personaId || "cold_saas_founder",
              user_id: user.id,
              next_action_at: new Date().toISOString(),
              state_json: { initialized: true, started_by: "bulk" },
            },
            { onConflict: "lead_id,agent_type" }
          );

          results.push({ contactId: cId, success: true });
        } catch (err) {
          results.push({
            contactId: cId,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: status, logs, start, pause, resume, stop, bulk_start" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "SDR Autopilot error",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
