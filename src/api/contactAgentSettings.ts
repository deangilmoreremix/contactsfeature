import type { OutboundPersonaId } from '../agents/personas';
import { sdrAuthHeaders } from '../services/sdrClient';

export type FollowupMode = 'manual' | 'reply-only' | '2-step' | '5-step';

export type ContactAgentSettings = {
  id: string;
  contact_id: string;
  persona_id: OutboundPersonaId;
  followup_mode: FollowupMode;
  is_enabled: boolean;
  notes: string | null;
};

// adjust base URL as needed
const BASE = '/.netlify/functions/contact-agent-settings';

export async function fetchContactAgentSettings(contactId: string): Promise<ContactAgentSettings | null> {
  const res = await fetch(`${BASE}?contactId=${encodeURIComponent(contactId)}`, { headers: await sdrAuthHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as ContactAgentSettings;
}

export async function saveContactAgentSettings(input: {
  contactId: string;
  personaId: OutboundPersonaId;
  followupMode: FollowupMode;
  isEnabled: boolean;
}) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: await sdrAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error('Failed to save agent settings');
  }
}