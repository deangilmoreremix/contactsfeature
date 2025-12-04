import { SkillId } from "./types";

/**
 * Static mapping of SmartCRM agents → their available skills.
 * You can align these with agent IDs you store in Supabase or MCP.
 */
export const agentSkills: Record<string, SkillId[]> = {
  // SDR Agent
  "sdr-agent": [
    "follow_up",
    "negotiation",
    "budget_objection",
    "research"
  ],

  // AE Agent
  "ae-agent": [
    "negotiation",
    "competitor_intel",
    "risk_analysis",
    "follow_up"
  ],

  // Generic risk engine / Deal AI
  "deal-intel-agent": [
    "risk_analysis",
    "competitor_intel",
    "research"
  ]
};

export function getSkillsForAgent(agentId: string): SkillId[] {
  return agentSkills[agentId] || [];
}
