export type OutboundAgentTargetType = "contact" | "deal" | "both";

export interface OutboundAgent {
  id: string;
  key: string;              // 'authority_outreach', 'high_ticket_closer', etc.
  name: string;
  inbox_email: string;
  target_type: OutboundAgentTargetType;
  persona: string | null;
  system_prompt: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}