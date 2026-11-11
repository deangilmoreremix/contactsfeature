import { useEffect, useState } from 'react';
import { Building2, Handshake } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { supabase } from '../../../lib/supabase';
import { useContactStore } from '../../../hooks/useContactStore';
import { isUuid } from '../../../lib/records/contactRecords';
import type { Contact } from '../../../types/contact';

interface DealRow {
  id: string;
  stage?: string | null;
  value?: number | null;
  title?: string | null;
  name?: string | null;
}

export function RelatedSection({ contact }: { contact: Contact }) {
  const contacts = useContactStore((s) => s.contacts);
  const [deals, setDeals] = useState<DealRow[]>([]);

  const colleagues = contact.company
    ? contacts.filter((c) => c.id !== contact.id && c.company.trim().toLowerCase() === contact.company.trim().toLowerCase())
    : [];

  useEffect(() => {
    let alive = true;
    if (!isUuid(contact.id)) { setDeals([]); return; }
    void (async () => {
      try {
        const { data, error } = await supabase.from('deals').select('*').eq('contact_id', contact.id);
        if (!error && alive) setDeals((data ?? []) as DealRow[]);
      } catch {
        /* deals table not available – section just stays empty */
      }
    })();
    return () => { alive = false; };
  }, [contact.id]);

  return (
    <GlassCard className="p-5">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Related</h4>

      <div className="mb-4">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Handshake className="w-4 h-4" /> Deals
        </p>
        {deals.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No deals linked to this contact.</p>
        ) : (
          <ul className="space-y-1">
            {deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm text-gray-900 dark:text-gray-100">
                <span>{d.title || d.name || 'Deal'}{d.stage ? ` · ${d.stage}` : ''}</span>
                {typeof d.value === 'number' && <span className="text-gray-600 dark:text-gray-400">${d.value.toLocaleString()}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Building2 className="w-4 h-4" /> {contact.company ? `Others at ${contact.company}` : 'Company'}
        </p>
        {colleagues.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {contact.company ? 'No other contacts at this company.' : 'No company set.'}
          </p>
        ) : (
          <ul className="space-y-1">
            {colleagues.map((c) => (
              <li key={c.id} className="text-sm text-gray-900 dark:text-gray-100">
                {c.name}
                {c.title && <span className="text-gray-500 dark:text-gray-400"> · {c.title}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassCard>
  );
}
