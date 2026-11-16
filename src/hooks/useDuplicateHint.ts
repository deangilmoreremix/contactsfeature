import { useCallback, useMemo, useState } from 'react';
import type { Contact } from '../types/contact';
import { useContactStore } from './useContactStore';
import { useCurrentUserId } from './useCurrentUserId';
import { dismissPair, findDuplicatesOf, pairKey, readDismissedPairs, type DuplicateHintMatch } from '../lib/merge/duplicateHint';

/** Likely duplicates of `contact` in the store that the user has not dismissed yet. */
export function useDuplicateHint(contact: Contact): { matches: DuplicateHintMatch[]; dismiss: (otherId: string) => void } {
  const contacts = useContactStore((s) => s.contacts);
  const userId = useCurrentUserId();
  const [version, setVersion] = useState(0);

  const all = useMemo(
    () => findDuplicatesOf(contact, contacts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contacts, contact.id, contact.name, contact.email, contact.phone, contact.company, contact.firstName, contact.lastName, contact.additionalEmails, contact.additionalPhones, contact.deletedAt],
  );
  const matches = useMemo(() => {
    if (all.length === 0) return all;
    const dismissed = readDismissedPairs(userId);
    return all.filter((m) => !dismissed.has(pairKey(contact.id, m.contact.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, userId, contact.id, version]);

  const dismiss = useCallback((otherId: string) => {
    dismissPair(userId, contact.id, otherId);
    setVersion((v) => v + 1);
  }, [userId, contact.id]);

  return { matches, dismiss };
}
