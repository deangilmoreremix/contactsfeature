import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailRequest {
  to: string;
  subject: string;
  body_html: string;
  from_name?: string;
  from_email?: string;
  contact_id?: string;
  mailbox_key?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: SendEmailRequest = await req.json();

    if (!payload.to || !payload.subject || !payload.body_html) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, subject, body_html",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fromEmail = payload.from_email || "noreply@smartcrm.app";
    const fromName = payload.from_name || "SmartCRM";
    const messageId = `msg_${crypto.randomUUID()}`;
    const sentAt = new Date().toISOString();

    if (payload.contact_id) {
      await supabase.from("emails").insert({
        contact_id: payload.contact_id,
        from_email: fromEmail,
        to_email: payload.to,
        subject: payload.subject,
        body_html: payload.body_html,
        sent_at: sentAt,
        status: "queued",
        mailbox_key: payload.mailbox_key || "default",
        message_id: messageId,
        direction: "outbound",
        source: "sdr_autopilot",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageId,
        sent_at: sentAt,
        recipient: payload.to,
        from: `${fromName} <${fromEmail}>`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
