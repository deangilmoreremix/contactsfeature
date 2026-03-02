import { supabase } from "../../lib/supabase";
import { resumeSdrAutopilot } from "./runSdrAutopilot";

export interface InboundEmailPayload {
  id: string;
  from: string;
  to: string;
  subject: string;
  body_html: string;
  body_text?: string;
  timestamp: string;
  thread_id?: string;
  message_id?: string;
}

export interface WebhookResponse {
  ok: boolean;
  processed?: boolean;
  lead_id?: string;
  autopilot_resumed?: boolean;
  error?: string;
}

export async function handleInboundEmail(payload: InboundEmailPayload): Promise<WebhookResponse> {
  try {
    const leadId = await findLeadByEmail(payload.from);
    if (!leadId) {
      return { ok: true, processed: false, error: 'No matching lead found' };
    }

    const autopilotState = await checkAutopilotStatus(leadId);
    if (!autopilotState || autopilotState.status !== 'active') {
      await logInboundEmail(payload, leadId);
      return { ok: true, processed: true, lead_id: leadId, autopilot_resumed: false };
    }

    await logInboundEmail(payload, leadId);

    const result = await resumeSdrAutopilot(leadId);

    return {
      ok: true,
      processed: true,
      lead_id: leadId,
      autopilot_resumed: result.success,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function findLeadByEmail(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}

async function checkAutopilotStatus(leadId: string) {
  try {
    const { data, error } = await supabase
      .from('autopilot_state')
      .select('state_json, status')
      .eq('lead_id', leadId)
      .eq('agent_type', 'sdr_autopilot')
      .maybeSingle();

    if (error || !data) return null;

    return {
      ...data.state_json,
      status: data.status,
    };
  } catch {
    return null;
  }
}

async function logInboundEmail(payload: InboundEmailPayload, leadId: string): Promise<void> {
  try {
    await supabase
      .from('emails')
      .insert({
        contact_id: leadId,
        from_email: payload.from,
        to_email: payload.to,
        subject: payload.subject,
        body_html: payload.body_html,
        body_text: payload.body_text,
        is_inbound: true,
        status: 'received',
        thread_id: payload.thread_id,
        message_id: payload.message_id,
      });
  } catch {
    // Don't throw - email logging should not break the webhook
  }
}
