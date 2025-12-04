import { createClient } from '@supabase/supabase-js';
import type { OutboundPersonaId } from '../agents/personas';

const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

export type FollowupMode = 'manual' | 'reply-only' | '2-step' | '5-step';

export type ContactAgentSettings = {
  id: string;
  contact_id: string;
  persona_id: OutboundPersonaId;
  followup_mode: FollowupMode;
  is_enabled: boolean;
  notes: string | null;
};

export async function getContactAgentSettings(contactId: string): Promise<ContactAgentSettings | null> {
  const { data, error } = await supabase
    .from('contact_agent_settings')
    .select('*')
    .eq('contact_id', contactId)
    .maybeSingle();

  if (error) {
    console.error('getContactAgentSettings error', error);
    return null;
  }

  return (data as ContactAgentSettings) || null;
}

export async function upsertContactAgentSettings(input: {
  contactId: string;
  personaId: OutboundPersonaId;
  followupMode?: FollowupMode;
  isEnabled?: boolean;
  notes?: string;
}) {
  const { contactId, personaId, followupMode = 'manual', isEnabled = false, notes = null } = input;

  const { data: existing, error: findError } = await supabase
    .from('contact_agent_settings')
    .select('*')
    .eq('contact_id', contactId)
    .maybeSingle();

  if (findError) {
    console.error('upsertContactAgentSettings findError', findError);
    throw findError;
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('contact_agent_settings')
      .update({
        persona_id: personaId,
        followup_mode: followupMode,
        is_enabled: isEnabled,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase
      .from('contact_agent_settings')
      .insert({
        contact_id: contactId,
        persona_id: personaId,
        followup_mode: followupMode,
        is_enabled: isEnabled,
        notes,
      });

    if (insertError) throw insertError;
  }
}