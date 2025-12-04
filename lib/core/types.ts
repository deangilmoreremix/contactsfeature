export interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  lead_score: number;
  persona: string | null;
  autopilot_enabled: boolean;
  autopilot_state: string;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  contact_id: string;
  stage: string;
  value: number;
  risk_score: number;
  objection_level: number;
  stage_stagnation: number;
  days_since_reply: number;
  created_at: string;
  updated_at: string;
}

export interface AgentMemory {
  id: string;
  contact_id: string;
  memory_type: "short" | "mid" | "long";
  data: any;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  contact_id: string;
  scheduled_for: string;
  status: string;
  created_at: string;
}

export interface VoiceJob {
  id: string;
  contact_id: string;
  script: string | null;
  audio_base64: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface VideoJob {
  id: string;
  contact_id: string;
  template: string | null;
  props: any;
  video_base64: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AutopilotLog {
  id: string;
  contact_id: string;
  state: string | null;
  event: string | null;
  details: any;
  created_at: string;
}
