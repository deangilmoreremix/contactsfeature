export type SkillId =
  | "negotiation"
  | "budget_objection"
  | "competitor_intel"
  | "research"
  | "follow_up"
  | "risk_analysis";

export interface SkillContext {
  contact?: any;
  deal?: any;
  lastMessage?: string | null;
  extra?: any;
}

export interface SkillResult {
  skillId: SkillId;
  output: string | any;
}

export interface Skill {
  id: SkillId;
  description: string;
  run: (ctx: SkillContext) => Promise<string | any>;
}
