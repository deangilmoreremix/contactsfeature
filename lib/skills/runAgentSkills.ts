import { getSkillsForAgent } from "./agentSkills";
import { runSkill } from "./runSkill";
import { SkillContext, SkillResult } from "./types";

export async function runAgentSkills(
  agentId: string,
  ctx: SkillContext
): Promise<SkillResult[]> {
  const skills = getSkillsForAgent(agentId);
  const results: SkillResult[] = [];

  for (const skillId of skills) {
    const result = await runSkill(skillId, ctx);
    results.push(result);
  }

  return results;
}
