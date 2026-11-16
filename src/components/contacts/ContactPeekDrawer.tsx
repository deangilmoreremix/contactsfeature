import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, X } from 'lucide-react';
import type { Contact } from '../../types/contact';
import { ContactAvatar } from './ContactAvatar';
import { ModernButton } from '../ui/ModernButton';
import { useContactStore } from '../../hooks/useContactStore';
import { useContactPeekStore } from '../../store/contactPeekStore';

interface ContactPeekDrawerProps {
  /** Opens the full record (the same handler a row click uses). */
  onOpenRecord: (contact: Contact) => void;
}

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  prospect: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  customer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  churned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(
          () => { setCopied(true); setTimeout(() => setCopied(false), 1500); },
          () => { /* clipboard blocked: nothing to do */ }
        );
      }}
      className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
  );
}

/**
 * Read-only record summary that slides in from the right. Rendered inside the Contacts screen
 * (absolute, below the contact detail overlay). Esc closes it; Tab stays inside while open.
 */
export function ContactPeekDrawer({ onOpenRecord }: ContactPeekDrawerProps) {
  const contactId = useContactPeekStore((s) => s.contactId);
  const close = useContactPeekStore((s) => s.close);
  const contact = useContactStore((s) => (contactId ? s.contacts.find((c) => c.id === contactId) ?? null : null));
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const open = !!contact;

  // Close if the contact disappears (deleted, filtered out of the store)
  useEffect(() => {
    if (contactId && !contact) close();
  }, [contactId, contact, close]);

  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('[data-peek-close]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // do not also clear the selection / close the Contacts screen
        close();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (!panelRef.current.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      const target = returnFocusTo.current;
      if (target && document.contains(target)) target.focus();
    };
  }, [open, close]);

  if (!contact) return null;

  return (
    <>
      <div className="absolute inset-0 z-30 bg-black/20" onClick={close} aria-hidden="true" data-testid="peek-backdrop" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-peek-title"
        data-testid="contact-peek-drawer"
        className="absolute inset-y-0 right-0 z-40 w-full max-w-md flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl text-gray-900 dark:text-gray-100"
      >
        <div className="flex items-start justify-between gap-3 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 min-w-0">
            <ContactAvatar contact={contact} size="lg" showLoadingIndicator={false} />
            <div className="min-w-0">
              <h3 id="contact-peek-title" className="text-lg font-semibold truncate">{contact.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {[contact.title, contact.company].filter(Boolean).join(' at ') || 'No title or company'}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-peek-close
            aria-label="Close peek"
            onClick={close}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <dl className="flex-1 overflow-y-auto px-6">
          <Row label="Status">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[contact.status] || statusColors['inactive']}`}>
              {contact.status}
            </span>
          </Row>
          <Row label="AI score">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, contact.aiScore || 0)}%` }} />
              </div>
              <span className="text-sm font-medium w-8">{contact.aiScore || 0}</span>
            </div>
          </Row>
          <Row label="Email">
            {contact.email ? (
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{contact.email}</span>
                <CopyButton value={contact.email} label="email" />
              </div>
            ) : <span className="text-gray-500 dark:text-gray-400">None</span>}
          </Row>
          <Row label="Phone">
            {contact.phone ? (
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{contact.phone}</span>
                <CopyButton value={contact.phone} label="phone" />
              </div>
            ) : <span className="text-gray-500 dark:text-gray-400">None</span>}
          </Row>
          <Row label="Tags">
            {contact.tags && contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">{tag}</span>
                ))}
              </div>
            ) : <span className="text-gray-500 dark:text-gray-400">None</span>}
          </Row>
          <Row label="Last connected">
            {contact.lastConnected || <span className="text-gray-500 dark:text-gray-400">Never</span>}
          </Row>
        </dl>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <ModernButton
            size="toolbar"
            variant="primary"
            className="w-full"
            onClick={() => { close(); onOpenRecord(contact); }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open record
          </ModernButton>
        </div>
      </div>
    </>
  );
}
