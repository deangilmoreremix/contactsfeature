// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  threadEmails, threadKey, normalizeSubject, deriveStatus, isCancellable, htmlToText, bodyAsText, type ContactEmail,
} from '../src/lib/emails/threadEmails';

const mk = (o: Partial<ContactEmail>): ContactEmail => ({
  id: 'x', contactId: 'c', fromEmail: null, toEmail: null, subject: 'Hello', bodyText: null, bodyHtml: null,
  status: 'sent', isInbound: false, threadId: null, scheduledFor: null, sentAt: null, openedAt: null,
  clickedAt: null, repliedAt: null, errorMessage: null, createdAt: '2026-11-01T10:00:00Z', ...o,
});

describe('threadEmails', () => {
  it('normalizes subjects', () => {
    expect(normalizeSubject('RE: Re: Fwd: Pricing  question')).toBe('pricing question');
    expect(normalizeSubject(null)).toBe('');
  });

  it('prefers thread_id, falls back to subject', () => {
    expect(threadKey({ threadId: 'abc', subject: 'x' })).toBe('t:abc');
    expect(threadKey({ threadId: null, subject: 'Re: Hi' })).toBe(threadKey({ threadId: null, subject: 'hi' }));
  });

  it('groups, orders newest first and uses the original subject', () => {
    const threads = threadEmails([
      mk({ id: '1', subject: 'Pricing', sentAt: '2026-11-01T10:00:00Z' }),
      mk({ id: '2', subject: 'Re: Pricing', isInbound: true, createdAt: '2026-11-02T10:00:00Z', status: 'sent' }),
      mk({ id: '3', subject: 'Other', sentAt: '2026-11-03T10:00:00Z' }),
    ]);
    expect(threads.map((t) => t.subject)).toEqual(['Other', 'Pricing']);
    expect(threads[1]!.emails.map((e) => e.id)).toEqual(['2', '1']);
    expect(threads[1]!.count).toBe(2);
  });

  it('handles empty subject', () => {
    expect(threadEmails([mk({ subject: '' })])[0]!.subject).toBe('(no subject)');
  });

  it('derives status chips', () => {
    const now = Date.parse('2026-11-16T00:00:00Z');
    expect(deriveStatus(mk({ isInbound: true }), now)).toBe('received');
    expect(deriveStatus(mk({ status: 'failed', openedAt: 'x' }), now)).toBe('failed');
    expect(deriveStatus(mk({ repliedAt: 'x', openedAt: 'x' }), now)).toBe('replied');
    expect(deriveStatus(mk({ clickedAt: 'x', openedAt: 'x' }), now)).toBe('clicked');
    expect(deriveStatus(mk({ openedAt: 'x' }), now)).toBe('opened');
    expect(deriveStatus(mk({ status: 'queued', scheduledFor: '2026-11-20T00:00:00Z' }), now)).toBe('scheduled');
    expect(deriveStatus(mk({ status: 'queued', scheduledFor: '2026-11-10T00:00:00Z' }), now)).toBe('queued');
    expect(deriveStatus(mk({ status: 'draft' }), now)).toBe('draft');
    expect(deriveStatus(mk({ status: 'weird' }), now)).toBe('draft');
  });

  it('only queued/draft outbound rows are cancellable', () => {
    expect(isCancellable(mk({ status: 'queued' }))).toBe(true);
    expect(isCancellable(mk({ status: 'draft' }))).toBe(true);
    expect(isCancellable(mk({ status: 'sent' }))).toBe(false);
    expect(isCancellable(mk({ status: 'queued', isInbound: true }))).toBe(false);
  });

  it('converts html to inert text', () => {
    const t = htmlToText('<style>p{}</style><p>Hi &amp; welcome</p><script>alert(1)</script><p>Line<br>two &#65;</p>');
    expect(t).toBe('Hi & welcome\n\nLine\ntwo A');
    expect(htmlToText('<img src=x onerror=alert(1)>ok')).toBe('ok');
    expect(bodyAsText({ bodyText: '  plain ', bodyHtml: '<b>no</b>' })).toBe('plain');
    expect(bodyAsText({ bodyText: null, bodyHtml: '<b>yes</b>' })).toBe('yes');
    expect(bodyAsText({ bodyText: null, bodyHtml: null })).toBe('');
  });
});
