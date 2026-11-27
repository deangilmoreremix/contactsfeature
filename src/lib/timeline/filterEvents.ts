/**
 * Pure helpers for the timeline event-type filter: classify events into a small set of
 * user-facing kinds, count them, and filter by a multi-selection (empty selection = All).
 */

export type TimelineKind =
  | 'email' | 'call' | 'meeting' | 'message' | 'note' | 'task' | 'field_change'
  | 'status' | 'merge' | 'enrichment' | 'file' | 'ai' | 'milestone' | 'other';

export const TIMELINE_KIND_LABELS: Record<TimelineKind, string> = {
  email: 'Emails',
  call: 'Calls',
  meeting: 'Meetings',
  message: 'Messages',
  note: 'Notes',
  task: 'Tasks',
  field_change: 'Field changes',
  status: 'Status changes',
  merge: 'Merges',
  enrichment: 'Enrichment',
  file: 'Files',
  ai: 'AI',
  milestone: 'Milestones',
  other: 'Other',
};

export const TIMELINE_KIND_ORDER = Object.keys(TIMELINE_KIND_LABELS) as TimelineKind[];

const ACTIVITY_KIND: Record<string, TimelineKind> = {
  created: 'other',
  updated: 'field_change',
  custom_field_updated: 'field_change',
  status_changed: 'status',
  score_calculated: 'ai',
  ai_analysis: 'ai',
  email_sent: 'email',
  note_added: 'note',
  task_added: 'task',
  attachment_added: 'file',
  merged: 'merge',
  enriched: 'enrichment',
  imported: 'other',
  exported: 'other',
};

/** Kind for a `contact_timeline` activity row. Unknown types fall back to "other". */
export function classifyActivity(activityType: string): TimelineKind {
  return ACTIVITY_KIND[activityType] ?? 'other';
}

export interface JourneyLike {
  type: string;
  title?: string;
  metadata?: { channel?: string | undefined } | undefined;
}

const CHANNEL_KIND: Array<[RegExp, TimelineKind]> = [
  [/e-?mail|inbox|gmail|outlook/i, 'email'],
  [/call|phone|voice/i, 'call'],
  [/meeting|video|zoom|demo|calendar/i, 'meeting'],
  [/sms|text|whatsapp|linkedin|dm|chat|message/i, 'message'],
];

/** Kind for a journey event (interaction events are split by channel, then by title). */
export function classifyJourneyEvent(event: JourneyLike): TimelineKind {
  switch (event.type) {
    case 'file_upload': return 'file';
    case 'ai_insight': return 'ai';
    case 'status_change': return 'status';
    case 'milestone': return 'milestone';
    default: break;
  }
  const hay = [event.metadata?.channel, event.title].filter(Boolean) as string[];
  for (const text of hay) {
    for (const [re, kind] of CHANNEL_KIND) if (re.test(text)) return kind;
  }
  if (event.type === 'interaction') return 'other';
  return 'other';
}

export function countByKind<T>(items: readonly T[], getKind: (item: T) => TimelineKind): Partial<Record<TimelineKind, number>> {
  const counts: Partial<Record<TimelineKind, number>> = {};
  for (const item of items) {
    const k = getKind(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

/** Kinds present in the data, in display order. */
export function availableKinds(counts: Partial<Record<TimelineKind, number>>): TimelineKind[] {
  return TIMELINE_KIND_ORDER.filter((k) => (counts[k] ?? 0) > 0);
}

/** Empty selection means "All". */
export function filterByKinds<T>(items: readonly T[], selected: readonly TimelineKind[], getKind: (item: T) => TimelineKind): T[] {
  if (selected.length === 0) return [...items];
  const set = new Set(selected);
  return items.filter((i) => set.has(getKind(i)));
}

export function toggleKind(selected: readonly TimelineKind[], kind: TimelineKind): TimelineKind[] {
  return selected.includes(kind) ? selected.filter((k) => k !== kind) : [...selected, kind];
}

/** Drops selections that no longer exist in the data so a stale persisted filter can't hide everything. */
export function pruneSelection(selected: readonly TimelineKind[], counts: Partial<Record<TimelineKind, number>>): TimelineKind[] {
  return selected.filter((k) => (counts[k] ?? 0) > 0);
}

const STORAGE_KEY = 'smartcrm.timeline.kinds';

export function parseStoredKinds(raw: string | null): TimelineKind[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((k): k is TimelineKind => typeof k === 'string' && k in TIMELINE_KIND_LABELS);
  } catch {
    return [];
  }
}

export function loadStoredKinds(): TimelineKind[] {
  try {
    return parseStoredKinds(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveStoredKinds(kinds: readonly TimelineKind[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(kinds));
  } catch {
    /* storage unavailable: filter just isn't remembered */
  }
}
