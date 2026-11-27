import { supabase } from '../lib/supabase';

/** Headers for calling the authenticated SDR Netlify functions (user's Supabase session token). */
export async function sdrAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to use SDR agents');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
}
