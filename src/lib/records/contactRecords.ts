/**
 * Small CRUD helper for per-contact records (tasks, notes).
 * - Contacts that live in Supabase (uuid ids) use the table.
 * - Demo / offline contacts (non-uuid ids) and development without a database use localStorage,
 *   so the features work everywhere with the same API.
 */
import { supabase } from '../supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID.test(id);

export interface BaseRecord {
  id: string;
  contactId: string;
  createdAt: string;
  updatedAt: string;
}

interface CollectionConfig<T extends BaseRecord> {
  table: string;
  localKey: string;
  fromRow: (row: Record<string, any>) => T;
  toRow: (record: Partial<T>) => Record<string, unknown>;
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function readLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}
function writeLocal<T>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* storage unavailable (private mode) – changes live for this session only */
  }
}

export function createContactCollection<T extends BaseRecord>(config: CollectionConfig<T>) {
  const useLocal = (contactId: string) => !isUuid(contactId);

  return {
    async list(contactId: string): Promise<T[]> {
      if (useLocal(contactId)) {
        return readLocal<T>(config.localKey).filter((r) => r.contactId === contactId);
      }
      const { data, error } = await supabase.from(config.table).select('*').eq('contact_id', contactId);
      if (error) throw error;
      return (data ?? []).map((r: any) => config.fromRow(r));
    },

    /** Every record the user can see (used by the calendar). Local records are always included. */
    async listAll(): Promise<T[]> {
      const local = readLocal<T>(config.localKey);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return local;
        const { data, error } = await supabase.from(config.table).select('*');
        if (error) throw error;
        return [...local, ...(data ?? []).map((r: any) => config.fromRow(r))];
      } catch {
        return local;
      }
    },

    async create(contactId: string, input: Omit<T, keyof BaseRecord>): Promise<T> {
      const now = new Date().toISOString();
      if (useLocal(contactId)) {
        const record = { ...input, id: newId(), contactId, createdAt: now, updatedAt: now } as unknown as T;
        writeLocal(config.localKey, [...readLocal<T>(config.localKey), record]);
        return record;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in to save');
      const { data, error } = await supabase
        .from(config.table)
        .insert({ ...config.toRow(input as Partial<T>), contact_id: contactId, user_id: user.id } as never)
        .select()
        .maybeSingle();
      if (error || !data) throw error ?? new Error('Could not save');
      return config.fromRow(data as any);
    },

    async update(record: T, patch: Partial<T>): Promise<T> {
      const updatedAt = new Date().toISOString();
      if (useLocal(record.contactId)) {
        const rows = readLocal<T>(config.localKey).map((r) => (r.id === record.id ? { ...r, ...patch, updatedAt } : r));
        writeLocal(config.localKey, rows);
        return { ...record, ...patch, updatedAt };
      }
      const { data, error } = await supabase
        .from(config.table)
        .update({ ...config.toRow(patch), updated_at: updatedAt } as never)
        .eq('id', record.id)
        .select()
        .maybeSingle();
      if (error || !data) throw error ?? new Error('Could not update');
      return config.fromRow(data as any);
    },

    async remove(record: T): Promise<void> {
      if (useLocal(record.contactId)) {
        writeLocal(config.localKey, readLocal<T>(config.localKey).filter((r) => r.id !== record.id));
        return;
      }
      const { error } = await supabase.from(config.table).delete().eq('id', record.id);
      if (error) throw error;
    },
  };
}
