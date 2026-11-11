import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useActivityTypeLabels, useContactTimeline } from '../../../hooks/useContactTimeline';
import { fieldLabel, formatDiffValue, groupEventsByMonth, type ContactDiff } from '../../../lib/timeline/contactDiff';

export function HistorySection({ contactId }: { contactId: string }) {
  const { activities, loading, error } = useContactTimeline(contactId);
  const labels = useActivityTypeLabels() as Record<string, { label: string; color: string; icon: string }>;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groups = groupEventsByMonth(activities);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <GlassCard className="p-5 md:col-span-2">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">History</h4>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">Could not load history.</p>}
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && groups.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Changes to this contact (field edits, status changes, merges) appear here.
        </p>
      )}
      {groups.map((group) => (
        <div key={group.key} className="mb-4 last:mb-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">{group.label}</p>
          <ul className="space-y-2">
            {group.events.map((event) => {
              const meta = labels[event.activityType] ?? { label: event.activityType, color: 'bg-gray-100 text-gray-700', icon: '•' };
              const diff = (event.metadata?.['diff'] ?? null) as ContactDiff | null;
              const expandable = !!diff && Object.keys(diff).length > 1;
              const isOpen = open.has(event.id);
              return (
                <li key={event.id} className="text-sm">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color} dark:bg-gray-700 dark:text-gray-200`}>
                      {meta.icon} {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-gray-100">{event.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        {event.userName ? ` · ${event.userName}` : ''}
                      </p>
                      {expandable && (
                        <button type="button" onClick={() => toggle(event.id)} className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {Object.keys(diff!).length} fields changed
                        </button>
                      )}
                      {expandable && isOpen && (
                        <table className="mt-2 text-xs">
                          <tbody>
                            {Object.entries(diff!).map(([field, change]) => (
                              <tr key={field}>
                                <td className="pr-3 py-0.5 text-gray-600 dark:text-gray-400">{fieldLabel(field)}</td>
                                <td className="pr-2 text-gray-500 dark:text-gray-500 line-through">{formatDiffValue(change.before)}</td>
                                <td className="text-gray-900 dark:text-gray-100">{formatDiffValue(change.after)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </GlassCard>
  );
}
