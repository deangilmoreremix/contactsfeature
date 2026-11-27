// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { groupMessagesIntoConversations, type UnifiedMessageRow } from '../src/lib/messageGrouping';

const row = (id: string, contact: string | null, direction: 'inbound' | 'outbound', at: string, extra: Partial<UnifiedMessageRow> = {}): UnifiedMessageRow => ({
  id, contact_id: contact, platform: 'gmail', account_id: 'acc', direction,
  sender: { name: direction === 'inbound' ? 'Ann' : 'Me' }, recipient: { name: direction === 'inbound' ? 'Me' : 'Ann' },
  subject: null, content: id, attachments: null, metadata: null, status: 'sent',
  sent_at: null, delivered_at: null, read_at: null, created_at: at, ...extra,
});

describe('groupMessagesIntoConversations', () => {
  it('returns [] for no rows', () => expect(groupMessagesIntoConversations([])).toEqual([]));

  it('groups per contact, orders by recent activity and counts unread inbound', () => {
    const out = groupMessagesIntoConversations([
      row('m1', 'c1', 'inbound', '2026-01-01T10:00:00Z'),
      row('m2', 'c1', 'outbound', '2026-01-01T11:00:00Z'),
      row('m3', 'c1', 'inbound', '2026-01-01T12:00:00Z'),
      row('m4', 'c2', 'inbound', '2026-01-02T09:00:00Z', { read_at: '2026-01-02T10:00:00Z', platform: 'sms' }),
      row('m5', null, 'inbound', '2026-01-03T09:00:00Z'),
    ]);
    expect(out.map((c) => c.id)).toEqual(['msg-m5', 'c2', 'c1']);
    const c1 = out[2];
    expect(c1.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(c1.unreadCount).toBe(2);
    expect(c1.lastMessage.id).toBe('m3');
    expect(c1.contact.name).toBe('Ann');
    expect(out[1].unreadCount).toBe(0);
    expect(out[1].platforms).toEqual(['sms']);
  });
});
