import { useState } from 'react';
import { Building2, Check, Copy, DollarSign, TrendingUp, Users, X } from 'lucide-react';
import { useOverlayEscape } from '../../hooks/useOverlayEscape';
import { companyTimeline, type Company } from '../../lib/groups/companies';
import type { Contact } from '../../types/contact';

interface CompanyDetailPanelProps {
  company: Company;
  onClose: () => void;
  /** Called when a person is clicked; the lead decides how a contact opens. */
  onOpenContact: (contact: Contact) => void;
}

const KIND_LABEL = { connected: 'Last connected', updated: 'Record updated', created: 'Added' } as const;

const formatWhen = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const money = (n: number) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n); } catch { return `$${Math.round(n)}`; }
};

/** Drawer with everything the CRM knows about one company: people, open deals, recent activity. */
export function CompanyDetailPanel({ company, onClose, onOpenContact }: CompanyDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  useOverlayEscape(true, onClose);
  const timeline = companyTimeline(company);

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(company.name);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex justify-end"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-detail-title"
        data-testid="company-detail-panel"
        className="bg-white dark:bg-gray-800 w-full max-w-md h-full flex flex-col shadow-xl"
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 id="company-detail-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{company.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {company.count} {company.count === 1 ? 'person' : 'people'}
                {company.avgAiScore !== null && <> · avg AI score {company.avgAiScore}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void copyName()}
              aria-label="Copy company name"
              title="Copy company name"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              <Users className="w-4 h-4 text-blue-600" /> People
            </h4>
            <ul className="space-y-2">
              {company.contacts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onOpenContact(p)}
                    data-testid="company-person"
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.title || p.email}</p>
                    </div>
                    {typeof p.aiScore === 'number' && p.aiScore > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                        <TrendingUp className="w-3 h-3 text-blue-500" /> {p.aiScore}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" /> Open deals
              {company.openDeals.length > 0 && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{money(company.openDealValue)}</span>}
            </h4>
            {company.openDeals.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No open deals.</p>
            ) : (
              <ul className="space-y-2">
                {company.openDeals.map((d) => (
                  <li key={d.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{d.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{d.stage.replace(/_/g, ' ') || 'No stage'}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{money(d.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Recent activity</h4>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {timeline.map((e, i) => (
                  <li key={`${e.contactId}-${e.kind}-${i}`} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-900 dark:text-gray-100">{KIND_LABEL[e.kind]} · {e.contactName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatWhen(e.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
