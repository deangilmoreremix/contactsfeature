import { supabase } from '../lib/supabase';
import type { Contact } from '../types/contact';
import { classifyDiff, computeContactDiff, describeDiff } from '../lib/timeline/contactDiff';
import { isUuid } from '../lib/records/contactRecords';

/** Record what changed on a contact as a timeline entry (fire-and-forget; never blocks saving). */
export async function recordContactDiff(before: Contact | undefined, after: Contact): Promise<void> {
  try {
    if (!before || !isUuid(after.id)) return;
    const diff = computeContactDiff(before, after);
    if (Object.keys(diff).length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('contact_timeline').insert({
      user_id: user.id,
      contact_id: after.id,
      activity_type: classifyDiff(diff),
      description: describeDiff(diff),
      metadata: { diff },
      user_name: (user.user_metadata as Record<string, string> | undefined)?.['full_name'] || user.email || 'You',
    } as never);
  } catch {
    /* history is best-effort */
  }
}
