import { supabase } from "../core/supabaseClient";
import { logger } from "../core/logger";
import { HeatmapDeal } from "./types";

/**
 * Returns open deals (not closed won/lost) with risk info and contact data.
 */
export async function getDealsWithRisk(): Promise<HeatmapDeal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select(
      `
      id,
      contact_id,
      stage,
      value,
      risk_score,
      days_since_reply,
      objection_level,
      stage_stagnation,
      updated_at,
      contacts:contact_id (
        id,
        name,
        email,
        status
      )
    `
    )
    .neq("stage", "closed_won")
    .neq("stage", "closed_lost")
    .order("risk_score", { ascending: false });

  if (error) {
    logger.error("Heatmap: failed to fetch deals", { error });
    throw error;
  }

  const mapped: HeatmapDeal[] =
    data?.map((row: any) => ({
      deal_id: row.id,
      contact_id: row.contact_id,
      contact_name: row.contacts?.name ?? null,
      contact_email: row.contacts?.email ?? null,
      stage: row.stage,
      value: row.value ?? 0,
      risk_score: row.risk_score ?? 0,
      days_since_reply: row.days_since_reply ?? 0,
      objection_level: row.objection_level ?? 0,
      stage_stagnation: row.stage_stagnation ?? 0,
      updated_at: row.updated_at
    })) ?? [];

  return mapped;
}
