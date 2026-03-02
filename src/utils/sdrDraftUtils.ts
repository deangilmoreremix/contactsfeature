import { supabase } from '../lib/supabase';

export async function saveSdrDraft({
  contactId,
  subject,
  body,
  agentType,
}: {
  contactId: string;
  subject: string;
  body: string;
  agentType: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('emails').insert({
      contact_id: contactId,
      subject,
      body_html: body,
      body_text: body,
      status: 'draft',
      mailbox_key: agentType,
      is_inbound: false,
    });

    if (error) {
      console.error('[saveSdrDraft] error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[saveSdrDraft] unexpected error:', err);
    return { success: false, error: err.message };
  }
}
