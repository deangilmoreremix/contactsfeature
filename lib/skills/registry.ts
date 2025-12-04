import { negotiationSkill } from "./negotiation";
import { budgetObjectionSkill } from "./budgetObjection";
import { competitorIntelSkill } from "./competitorIntel";
import { researchSkill } from "./research";
import { followUpSkill } from "./followUp";
import { riskAnalysisSkill } from "./riskAnalysis";
import { Skill, SkillId } from "./types";

export const skillRegistry: Record<SkillId, Skill> = {
  negotiation: negotiationSkill,
  budget_objection: budgetObjectionSkill,
  competitor_intel: competitorIntelSkill,
  research: researchSkill,
  follow_up: followUpSkill,
  risk_analysis: riskAnalysisSkill
};

export function getSkill(skillId: SkillId): Skill {
  const skill = skillRegistry[skillId];
  if (!skill) {
    throw new Error(`Unknown skill: ${skillId}`);
  }
  return skill;
}

export function listSkills(): Skill[] {
  return Object.values(skillRegistry);
}
