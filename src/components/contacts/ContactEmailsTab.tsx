import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, Mail, RefreshCw, Send, X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import type { Contact } from '../../types/contact';
import {
  bodyAsText, deriveStatus, emailTime, isCancellable, threadEmails,
  type ContactEmail, type EmailChipStatus,
} from '../../lib/emails/threadEmails';
import { canLoadContactEmails, contactEmailService, isNoProviderError } from '../../services/contactEmailService';

const controlClass =
  'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all';

const CHIP: Record<EmailChipStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  queued: { label: 'Queued', color: 'bg-yellow-100 text-yellow-700' },
  scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700' },
  sending: { label: 'Sending', color: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  opened: { label: 'Opened', color: 'bg-green-100 text-green-700' },
  clicked: { label: 'Clicked', color: 'bg-green-100 text-green-700' },
  replied: { label: 'Replied', color: 'bg-green-100 text-green-700' },
  received: { label: 'Received', color: 'bg-gray-100 text-gray-700' },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Thread-style list of a contact's emails with compose, scheduling and cancel. */
export function ContactEmailsTab({ contact }: { contact: Contact }) {
  const available = canLoadContactEmails(contact.id);
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendAt, setSendAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [noProvider, setNoProvider] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!available) return;
    setLoading(true);
    setError(null);
    try {
      setEmails(await contactEmailService.list(contact.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load emails');
    } finally {
      setLoading(false);
    }
  }, [available, contact.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const threads = useMemo(() => threadEmails(emails), [emails]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async () => {
    setBusy(true);
    setComposeError(null);
    setNoProvider(false);
    setNotice(null);
    try {
      const when = sendAt ? new Date(sendAt) : undefined;
      if (when && Number.isNaN(when.getTime())) throw new Error('Pick a valid send time');
      const r = await contactEmailService.compose({
        contactId: contact.id,
        to: contact.email,
        subject,
        body,
        ...(when ? { scheduledFor: when } : {}),
      });
      setNotice(r.queued && r.scheduledFor ? `Scheduled for ${fmt(r.scheduledFor.toISOString())}.` : 'Sent through your email provider.');
      setSubject('');
      setBody('');
      setSendAt('');
      setComposing(false);
      await load();
    } catch (e) {
      if (isNoProviderError(e)) setNoProvider(true);
      setComposeError(e instanceof Error ? e.message : 'Could not send');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    setError(null);
    setNotice(null);
    try {
      const removed = await contactEmailService.cancel(id);
      setNotice(removed ? 'Cancelled. The email will not be sent.' : 'Too late to cancel: this email was already picked up for sending.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel');
    }
  };

  if (!available) {
    return (
      <GlassCard className="p-5">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Emails</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Email history and sending need a connected workspace and a saved contact. In demo mode nothing is sent or stored,
          so this list stays empty.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Emails {emails.length > 0 && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({emails.length})</span>}
        </h4>
        <div className="flex items-center gap-2">
          <ModernButton size="toolbar" variant="outline" icon={RefreshCw} onClick={() => void load()} loading={loading}>
            Refresh
          </ModernButton>
          <ModernButton size="toolbar" icon={composing ? X : Mail} onClick={() => setComposing((v) => !v)} disabled={!contact.email}>
            {composing ? 'Close' : 'Compose'}
          </ModernButton>
        </div>
      </div>

      {!contact.email && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Add an email address to this contact to send them email.</p>
      )}

      {composing && (
        <form
          className="mb-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">To: <span className="text-gray-900 dark:text-gray-100">{contact.email}</span></p>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Email subject" className={`${controlClass} w-full`} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" aria-label="Email body" rows={6} className={`${controlClass} w-full`} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400" htmlFor="contact-email-send-at">Send later (optional)</label>
            <input id="contact-email-send-at" type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className={controlClass} />
            <ModernButton type="submit" size="toolbar" icon={Send} loading={busy} disabled={!subject.trim() || !body.trim()}>
              {sendAt ? 'Schedule' : 'Send'}
            </ModernButton>
          </div>
          {composeError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {composeError}
              {noProvider && ' Connect an email provider in Settings → Email & SMS, then try again.'}
            </p>
          )}
        </form>
      )}

      {notice && <p className="text-sm text-green-700 dark:text-green-400 mb-2">{notice}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      {loading && emails.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && !error && threads.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No emails with this contact yet. Messages you send from here, and replies logged by your inbox sync, appear in this list.
        </p>
      )}

      <div className="space-y-4">
        {threads.map((thread) => (
          <div key={thread.key} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{thread.subject}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {thread.count} {thread.count === 1 ? 'message' : 'messages'} · {fmt(thread.latestAt)}
              </p>
            </div>
            <ul>
              {thread.emails.map((email) => {
                const chip = CHIP[deriveStatus(email)];
                const isOpen = open.has(email.id);
                const text = isOpen ? bodyAsText(email) : '';
                const Dir = email.isInbound ? ArrowDownLeft : ArrowUpRight;
                return (
                  <li key={email.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggle(email.id)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
                      <Dir className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" aria-label={email.isInbound ? 'Inbound' : 'Outbound'} />
                      <span className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 truncate">
                        {email.isInbound ? `From ${email.fromEmail || contact.email}` : `To ${email.toEmail || contact.email}`}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${chip.color}`}>{chip.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(emailTime(email))}</span>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 pl-14 space-y-2">
                        {text ? (
                          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{text}</p>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">This message has no body.</p>
                        )}
                        {email.errorMessage && <p className="text-sm text-red-600 dark:text-red-400">{email.errorMessage}</p>}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {[
                            email.openedAt && `Opened ${fmt(email.openedAt)}`,
                            email.clickedAt && `Clicked ${fmt(email.clickedAt)}`,
                            email.repliedAt && `Replied ${fmt(email.repliedAt)}`,
                          ].filter(Boolean).join(' · ')}
                        </p>
                        {isCancellable(email) && (
                          <ModernButton size="toolbar" variant="outline" icon={X} onClick={() => void cancel(email.id)}>
                            Cancel send
                          </ModernButton>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
