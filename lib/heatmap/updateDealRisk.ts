import { supabase } from "../core/supabaseClient";
import { logger } from "../core/logger";
import { computeDealRisk } from "./computeDealRisk";

export async function updateDealRisk(dealId: string) {
  const { risk_score, reason, next_action } = await computeDealRisk(dealId);

  const { error } = await supabase
    .from("deals")
    .update({
      risk_score,
      risk_reason: reason,
      next_action
    })
    .eq("id", dealId);

  if (error) {
    logger.error("Heatmap: failed to update deal risk", { dealId, error });
    throw error;
  }

  return { deal_id: dealId, risk_score, reason, next_action };
}
