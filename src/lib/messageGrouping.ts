import type { ContactInfo, MessageData, Platform, UnifiedConversation } from '../types/communication';

/** A row of the `unified_messages` table (migration 20260401001200). */
export interface UnifiedMessageRow {
  id: string;
  contact_id: string | null;
  platform: string;
  account_id: string | null;
  direction: 'inbound' | 'outbound';
  sender: ContactInfo | null;
  recipient: ContactInfo | null;
  subject: string | null;
  content: string | null;
  attachments: MessageData['attachments'] | null;
  metadata: Record<string, any> | null;
  status: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

const date = (v: string | null | undefined) => (v ? new Date(v) : undefined);

export function rowToMessage(r: UnifiedMessageRow): MessageData {
  const msg: MessageData = {
    id: r.id,
    platform: r.platform as Platform,
    accountId: r.account_id ?? '',
    direction: r.direction,
    sender: r.sender ?? { name: '' },
    recipient: r.recipient ?? { name: '' },
    content: r.content ?? '',
    attachments: r.attachments ?? [],
    metadata: r.metadata ?? {},
    sentAt: date(r.sent_at) ?? new Date(r.created_at),
    status: (r.status as MessageData['status']) ?? 'sent',
  };
  if (r.subject) msg.subject = r.subject;
  const delivered = date(r.delivered_at);
  if (delivered) msg.deliveredAt = delivered;
  const read = date(r.read_at);
  if (read) msg.readAt = read;
  return msg;
}

/** Group message rows into one conversation per contact (rows without a contact become single-message conversations). */
export function groupMessagesIntoConversations(rows: UnifiedMessageRow[]): UnifiedConversation[] {
  const groups = new Map<string, UnifiedMessageRow[]>();
  for (const r of rows) {
    const key = r.contact_id ?? `msg-${r.id}`;
    const list = groups.get(key);
    if (list) list.push(r); else groups.set(key, [r]);
  }
  const out: UnifiedConversation[] = [];
  for (const [id, list] of groups) {
    const sorted = [...list].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const messages = sorted.map(rowToMessage);
    const last = messages[messages.length - 1];
    const lastRow = sorted[sorted.length - 1];
    if (!last || !lastRow) continue;
    const contact = (lastRow.direction === 'inbound' ? lastRow.sender : lastRow.recipient) ?? { name: '' };
    out.push({
      id,
      contactId: lastRow.contact_id ?? '',
      contact,
      platforms: [...new Set(messages.map((m) => m.platform))],
      lastMessage: last,
      unreadCount: sorted.filter((r) => r.direction === 'inbound' && !r.read_at).length,
      priority: 0,
      tags: [],
      lastActivity: new Date(lastRow.created_at),
      messages,
    });
  }
  return out.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
}
