import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useContactStore } from './useContactStore';
import { useDealStore, type DealRow } from '../store/useDealStore';
import { type RealtimeEventType } from '../lib/realtimeApply';
import { applyContactRealtime } from '../lib/contacts/softDelete';
import { contactAPI } from '../services/contact-api.service';
import type { Contact } from '../types';

/**
 * Live updates: while `enabled`, pushes Supabase Realtime changes to the signed-in user's contacts and deals
 * into the zustand stores. Unsubscribes on cleanup, sign-out and when disabled.
 * Contacts are only patched when the app is backed by the database (demo/sample data is left alone).
 */
export function useRealtimeSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const teardown = () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    const subscribe = (uid: string) => {
      teardown();
      channel = supabase
        .channel(`crm-live:${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${uid}` }, (payload) => {
          if (!contactAPI.usesDatabase()) return;
          const type = payload.eventType as RealtimeEventType;
          useContactStore.setState((s) => {
            // Soft-deleted rows (deleted_at set) move to the trash list instead of the active list.
            const next = applyContactRealtime(
              { contacts: s.contacts, trashed: s.trashedContacts },
              type, payload.new as Partial<Contact>, payload.old as Partial<Contact>,
            );
            return {
              contacts: next.contacts,
              trashedContacts: next.trashed,
              totalCount: Math.max(0, s.totalCount + next.contacts.length - s.contacts.length),
            };
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `user_id=eq.${uid}` }, (payload) => {
          useDealStore.getState().applyRealtime(payload.eventType as RealtimeEventType, payload.new as Partial<DealRow>, payload.old as Partial<DealRow>);
        })
        .subscribe();
    };

    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!cancelled && uid) subscribe(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        teardown();
        useDealStore.getState().reset();
      } else if (event === 'SIGNED_IN' && session?.user?.id) {
        subscribe(session.user.id);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      teardown();
    };
  }, [enabled]);
}
