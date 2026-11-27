/**
 * Pure reducers for contact soft delete (Trash). The store keeps active contacts and trashed
 * contacts in two lists; a contact is "deleted" when `deletedAt` is set.
 */
import type { Contact } from '../../types/contact';
import { applyRowChange, type RealtimeEventType } from '../realtimeApply';

export interface TrashState {
  contacts: Contact[];
  trashed: Contact[];
}

export const isDeleted = (c: Pick<Contact, 'deletedAt'> | null | undefined): boolean => !!c?.deletedAt;

/** Active contacts only. */
export const excludeDeleted = <T extends { deletedAt?: string | null }>(list: T[]): T[] =>
  list.filter((c) => !c.deletedAt);

/** Database rows use snake_case `deleted_at`; the app model uses `deletedAt`. */
export function normalizeContactRow<T extends Record<string, any>>(row: T): T & { deletedAt?: string | null } {
  if (!row || typeof row !== 'object') return row;
  if (!('deleted_at' in row) && !('deletedAt' in row)) return row;
  const { deleted_at, ...rest } = row as Record<string, any>;
  return { ...rest, deletedAt: deleted_at ?? rest['deletedAt'] ?? null } as any;
}

/** Move a contact from the active list to the trash (stamping deletedAt). Unknown ids are a no-op. */
export function softDeleteInState(state: TrashState, id: string, now: string): TrashState {
  const target = state.contacts.find((c) => c.id === id);
  if (!target) return state;
  return {
    contacts: state.contacts.filter((c) => c.id !== id),
    trashed: [{ ...target, deletedAt: now }, ...state.trashed.filter((c) => c.id !== id)],
  };
}

/** Move a contact back from the trash (clearing deletedAt). Unknown ids are a no-op. */
export function restoreInState(state: TrashState, id: string): TrashState {
  const target = state.trashed.find((c) => c.id === id);
  if (!target) return state;
  return {
    contacts: [{ ...target, deletedAt: null }, ...state.contacts.filter((c) => c.id !== id)],
    trashed: state.trashed.filter((c) => c.id !== id),
  };
}

/** Remove a contact for good (from the trash, or the active list if it was never trashed). */
export function destroyInState(state: TrashState, id: string): TrashState {
  return {
    contacts: state.contacts.filter((c) => c.id !== id),
    trashed: state.trashed.filter((c) => c.id !== id),
  };
}

/** Apply a Supabase Realtime contact change, routing rows by their deleted_at value. */
export function applyContactRealtime(
  state: TrashState,
  type: RealtimeEventType,
  newRow: Partial<Contact> | null | undefined,
  oldRow: Partial<Contact> | null | undefined,
): TrashState {
  if (type === 'DELETE') {
    const id = oldRow?.id;
    return id ? destroyInState(state, id) : state;
  }
  if (!newRow || !newRow.id) return state;
  const row = normalizeContactRow(newRow as Record<string, any>) as Partial<Contact>;
  const id = row.id as string;
  if (row.deletedAt) {
    const existing = state.contacts.find((c) => c.id === id) ?? state.trashed.find((c) => c.id === id);
    return {
      contacts: state.contacts.filter((c) => c.id !== id),
      trashed: [{ ...(existing ?? {}), ...row } as Contact, ...state.trashed.filter((c) => c.id !== id)],
    };
  }
  const wasTrashed = state.trashed.find((c) => c.id === id);
  const base = wasTrashed
    ? { contacts: state.contacts, trashed: state.trashed.filter((c) => c.id !== id) }
    : state;
  const rows = wasTrashed ? [{ ...wasTrashed, ...row, deletedAt: null } as Contact, ...base.contacts] : applyRowChange(base.contacts, type, row, oldRow);
  return { contacts: rows, trashed: base.trashed };
}
