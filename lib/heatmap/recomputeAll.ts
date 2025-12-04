import { supabase } from "../core/supabaseClient";
import { logger } from "../core/logger";
import { updateDealRisk } from "./updateDealRisk";

export async function recomputeAllDealRisks(limit = 50) {
  const { data, error } = await supabase
    .from("deals")
    .select("id, stage")
    .neq("stage", "closed_won")
    .neq("stage", "closed_lost")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Heatmap: failed to fetch deals for recompute", { error });
    throw error;
  }

  const ids = (data || []).map((d: any) => d.id as string);
  const results: any[] = [];

  for (const id of ids) {
    try {
      const res = await updateDealRisk(id);
      results.push(res);
    } catch (e) {
      logger.error("Heatmap: failed to recompute risk for deal", { id, e });
    }
  }

  return results;
}
