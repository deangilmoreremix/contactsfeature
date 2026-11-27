/**
 * Pure helpers for the Realtime voice session (no DOM / network access except through injected deps),
 * so they can be unit-tested: server event interpretation, transcript reduction, tool-call execution
 * against OUR authenticated endpoints, token-expiry and reconnect policy, and mic error messages.
 */

export type RealtimeToolName = 'get_contact' | 'add_note' | 'create_task' | 'schedule_meeting';
export const REALTIME_TOOLS: RealtimeToolName[] = ['get_contact', 'add_note', 'create_task', 'schedule_meeting'];

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  /** true while assistant text is still streaming */
  partial?: boolean;
}

export type RealtimeAction =
  | { kind: 'user_transcript'; itemId: string; text: string }
  | { kind: 'assistant_delta'; itemId: string; text: string }
  | { kind: 'assistant_done'; itemId: string; text: string }
  | { kind: 'function_call'; callId: string; name: string; args: string }
  | { kind: 'error'; code?: string; message: string }
  | { kind: 'ignore' };

/** Map one server event from the `oai-events` data channel to a normalised action. */
export function interpretRealtimeEvent(event: any): RealtimeAction {
  if (!event || typeof event.type !== 'string') return { kind: 'ignore' };
  switch (event.type) {
    case 'conversation.item.input_audio_transcription.completed':
      return typeof event.transcript === 'string' && event.transcript.trim()
        ? { kind: 'user_transcript', itemId: String(event.item_id || ''), text: event.transcript.trim() }
        : { kind: 'ignore' };
    case 'response.output_audio_transcript.delta':
      return { kind: 'assistant_delta', itemId: String(event.item_id || ''), text: String(event.delta || '') };
    case 'response.output_audio_transcript.done':
      return { kind: 'assistant_done', itemId: String(event.item_id || ''), text: String(event.transcript || '') };
    case 'response.output_item.done': {
      const item = event.item;
      if (item && item.type === 'function_call' && item.call_id && item.name) {
        return { kind: 'function_call', callId: String(item.call_id), name: String(item.name), args: String(item.arguments || '{}') };
      }
      return { kind: 'ignore' };
    }
    case 'error':
      return { kind: 'error', code: event.error?.code, message: String(event.error?.message || 'Realtime error') };
    default:
      return { kind: 'ignore' };
  }
}

/** Apply a transcript action to a history list (returns a new array; ids are `rt_<itemId>`). */
export function applyTranscriptAction(history: TranscriptMessage[], action: RealtimeAction, now = () => new Date().toISOString()): TranscriptMessage[] {
  if (action.kind === 'user_transcript') {
    const id = `rt_${action.itemId || now()}`;
    if (history.some((m) => m.id === id)) return history;
    return [...history, { id, role: 'user', content: action.text, timestamp: now() }];
  }
  if (action.kind === 'assistant_delta' || action.kind === 'assistant_done') {
    const id = `rt_${action.itemId}`;
    const idx = history.findIndex((m) => m.id === id);
    const next = history.slice();
    if (idx === -1) {
      if (action.kind === 'assistant_done' && !action.text) return history;
      next.push({ id, role: 'assistant', content: action.text, timestamp: now(), partial: action.kind === 'assistant_delta' });
    } else {
      const cur = next[idx];
      if (cur) {
        next[idx] = action.kind === 'assistant_delta'
          ? { ...cur, content: cur.content + action.text, partial: true }
          : { ...cur, content: action.text || cur.content, partial: false };
      }
    }
    return next;
  }
  return history;
}

export function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ToolDeps {
  userId: string;
  /** Supabase-like client running under the signed-in user's session (RLS applies). */
  db: { from: (table: string) => any };
  /** POST to one of our authenticated Netlify functions. */
  post: (fn: string, body: Record<string, unknown>) => Promise<any>;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function assertContact(deps: ToolDeps, contactId: unknown): Promise<string> {
  if (typeof contactId !== 'string' || !UUID_RE.test(contactId)) throw new Error('contactId must be a valid contact id');
  const { data, error } = await deps.db.from('contacts').select('id').eq('id', contactId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Contact not found');
  return contactId;
}

/**
 * Execute an allow-listed realtime tool. Data access goes through the user's own Supabase session
 * (RLS) or our authenticated functions; nothing here holds a secret. Throws for unknown tools.
 */
export async function executeRealtimeTool(name: string, args: Record<string, unknown>, deps: ToolDeps): Promise<unknown> {
  switch (name) {
    case 'get_contact': {
      const id = await assertContact(deps, args['contactId']);
      const { data, error } = await deps.db.from('contacts').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Contact not found');
      const keep = ['id', 'name', 'firstname', 'lastname', 'email', 'phone', 'company', 'title', 'industry', 'status', 'interest_level', 'tags', 'notes', 'last_connected'];
      return Object.fromEntries(keep.filter((k) => data[k] != null && data[k] !== '').map((k) => [k, data[k]]));
    }
    case 'add_note': {
      const id = await assertContact(deps, args['contactId']);
      const content = str(args['content'], 4000);
      if (!content) throw new Error('content is required');
      const { data, error } = await deps.db.from('notes')
        .insert({ contact_id: id, content, note_type: 'voice', created_by: deps.userId }).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      return { ok: true, noteId: data?.id ?? null };
    }
    case 'create_task': {
      const id = await assertContact(deps, args['contactId']);
      const title = str(args['title'], 300);
      if (!title) throw new Error('title is required');
      const priority = ['low', 'medium', 'high', 'urgent'].includes(args['priority'] as string) ? (args['priority'] as string) : 'medium';
      let due: string | null = null;
      if (typeof args['dueDate'] === 'string' && args['dueDate']) {
        const d = new Date(args['dueDate']);
        if (Number.isNaN(d.getTime())) throw new Error('dueDate must be a valid ISO date-time');
        due = d.toISOString();
      }
      const { data, error } = await deps.db.from('tasks')
        .insert({ contact_id: id, title, due_date: due, priority, status: 'open', created_by: deps.userId }).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      return { ok: true, taskId: data?.id ?? null };
    }
    case 'schedule_meeting': {
      const id = await assertContact(deps, args['contactId']);
      const when = typeof args['scheduledFor'] === 'string' ? new Date(args['scheduledFor']) : null;
      if (!when || Number.isNaN(when.getTime())) throw new Error('scheduledFor must be a valid ISO date-time');
      const res = await deps.post('calendar-schedule', {
        contactId: id,
        scheduledFor: when.toISOString(),
        ...(Number(args['durationMinutes']) > 0 ? { durationMinutes: Number(args['durationMinutes']) } : {}),
        ...(str(args['title'], 200) ? { title: str(args['title'], 200) } : {}),
      });
      return { ok: true, eventId: res?.event?.id ?? null, scheduledFor: res?.event?.scheduled_for ?? when.toISOString(), contactNotified: !!res?.notified, notifyNote: res?.reason ?? null };
    }
    default:
      throw new Error(`Tool not available: ${name}`);
  }
}

/** True when the ephemeral secret is expired or about to be (epoch seconds from the server). */
export function isTokenExpired(expiresAt: number | null | undefined, nowMs = Date.now(), skewSeconds = 10): boolean {
  if (!expiresAt) return false;
  return nowMs / 1000 >= expiresAt - skewSeconds;
}

/** Exponential reconnect delay (ms): 1s, 2s, 4s ... capped at 15s. */
export function reconnectDelay(attempt: number): number {
  return Math.min(15000, 1000 * 2 ** Math.max(0, attempt));
}

export const MAX_RECONNECTS = 3;

/** Friendly message for getUserMedia / connection failures. */
export function describeVoiceError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone access was denied. Allow microphone permission in your browser and try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone was found. Connect one and try again.';
    case 'NotReadableError':
      return 'The microphone is in use by another application.';
    default:
      return (err as Error | null)?.message || 'Voice connection failed';
  }
}
