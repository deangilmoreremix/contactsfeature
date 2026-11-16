import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface PresenceViewer {
  key: string;
  email: string | null;
  joinedAt: string;
}

/**
 * Minimal presence for the open contact: lists OTHER sessions (other tabs, devices or teammates with access)
 * that currently have the same contact open. Uses Supabase Realtime presence; nothing is stored in the database.
 */
export function useContactPresence(contactId: string | null | undefined, enabled = true): PresenceViewer[] {
  const [others, setOthers] = useState<PresenceViewer[]>([]);

  useEffect(() => {
    setOthers([]);
    if (!enabled || !contactId || !isSupabaseConfigured) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (cancelled || !user) return;
      // One presence key per browser session so a second tab of the same user is shown too.
      const key = `${user.id}:${Math.random().toString(36).slice(2, 10)}`;
      channel = supabase.channel(`presence:contact:${contactId}`, { config: { presence: { key } } });
      channel
        .on('presence', { event: 'sync' }, () => {
          if (!channel || cancelled) return;
          const state = channel.presenceState() as Record<string, Array<{ email?: string | null; joinedAt?: string }>>;
          setOthers(
            Object.entries(state)
              .filter(([k]) => k !== key)
              .map(([k, metas]) => ({ key: k, email: metas[0]?.email ?? null, joinedAt: metas[0]?.joinedAt ?? '' })),
          );
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && channel) {
            await channel.track({ email: user.email ?? null, joinedAt: new Date().toISOString() });
          }
        });
    });

    return () => {
      cancelled = true;
      if (channel) {
        void channel.untrack();
        void supabase.removeChannel(channel);
      }
    };
  }, [contactId, enabled]);

  return others;
}
