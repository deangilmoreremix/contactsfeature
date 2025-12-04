import { supabase } from "../core/supabaseClient";
import { logger } from "../core/logger";
import { AutopilotState } from "./state";

export async function getContactAndDeal(contactId: string) {
  const { data: contact, error: cErr } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (cErr || !contact) {
    logger.error("Contact not found in autopilot", { contactId, cErr });
    throw new Error("Contact not found");
  }

  const { data: deal, error: dErr } = await supabase
    .from("deals")
    .select("*")
    .eq("contact_id", contactId)
    .single();

  if (dErr || !deal) {
    logger.warn("Deal not found for contact in autopilot", { contactId, dErr });
  }

  return { contact, deal };
}

export async function updateAutopilotState(
  contactId: string,
  newState: AutopilotState
) {
  const { error } = await supabase
    .from("contacts")
    .update({ autopilot_state: newState })
    .eq("id", contactId);

  if (error) {
    logger.error("Failed to update autopilot state", { contactId, newState, error });
  } else {
    logger.info("Autopilot state updated", { contactId, newState });
  }
}

export async function logAutopilotEvent(
  contactId: string,
  state: AutopilotState,
  event: string,
  details: any = {}
) {
  const { error } = await supabase.from("autopilot_logs").insert({
    contact_id: contactId,
    state,
    event,
    details
  });

  if (error) {
    logger.error("Failed to log autopilot event", { contactId, state, event, error });
  }
}
