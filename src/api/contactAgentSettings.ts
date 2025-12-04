import type { OutboundPersonaId } from '../agents/personas';
import type { FollowupMode, ContactAgentSettings } from '../server/contactAgentSettings';

// adjust base URL as needed
const BASE = '/.netlify/functions/contact-agent-settings';

export async function fetchContactAgentSettings(contactId: string): Promise<ContactAgentSettings | null> {
  const res = await fetch(`${BASE}?contactId=${contactId}`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error('Failed to save agent settings');
  }
}