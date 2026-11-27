import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** Signed-in user id for per-user localStorage keys ('anon' until known / when signed out). */
export function useCurrentUserId(): string {
  const [userId, setUserId] = useState('anon');
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!cancelled && uid) setUserId(uid);
    }).catch(() => { /* stay anonymous */ });
    return () => { cancelled = true; };
  }, []);
  return userId;
}
