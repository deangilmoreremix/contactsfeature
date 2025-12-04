import { getSkill } from "./registry";
import { SkillContext, SkillId, SkillResult } from "./types";

export async function runSkill(skillId: SkillId, ctx: SkillContext): Promise<SkillResult> {
  const skill = getSkill(skillId);
  const output = await skill.run(ctx);

  return {
    skillId,
    output
  };
}
