export type AutopilotState =
  | "new"
  | "sdr_outreach"
  | "engaged"
  | "interested"
  | "meeting_scheduled"
  | "awaiting_next_step"
  | "closed_won"
  | "closed_lost";

export interface AutopilotContext {
  contact: any;
  deal: any;
  memory: {
    short: any[];
    mid: any[];
    long: any[];
  };
}
