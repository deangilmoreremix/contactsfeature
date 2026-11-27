import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CalendarPlus, MapPin, RefreshCw, Video, X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import type { Contact } from '../../types/contact';
import {
  canUseContactCalendar, contactCalendarService, describeNotify, splitEvents, toLocalInput,
  type ContactCalendarEvent, type TimeSuggestion,
} from '../../services/contactCalendarService';

const controlClass =
  'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all';

const DURATIONS = [15, 30, 45, 60, 90];

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Upcoming and past meetings with a contact, scheduling, rescheduling and cancelling. */
export function ContactCalendarTab({ contact }: { contact: Contact }) {
  const available = canUseContactCalendar(contact.id);
  const [events, setEvents] = useState<ContactCalendarEvent[]>([]);
  const [suggestions, setSuggestions] = useState<TimeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(30);
  const [where, setWhere] = useState('');
  const [notify, setNotify] = useState(true);

  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedWhen, setReschedWhen] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);

  const who = contact.firstName || contact.name || 'The contact';

  const load = useCallback(async () => {
    if (!available) return;
    setLoading(true);
    setError(null);
    try {
      const r = await contactCalendarService.list(contact.id, { durationMinutes: duration });
      setEvents(r.events);
      setSuggestions(r.suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load meetings');
    } finally {
      setLoading(false);
    }
  }, [available, contact.id, duration]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(async () => {
      const d = new Date(when);
      if (!when || Number.isNaN(d.getTime())) throw new Error('Pick a date and time');
      const link = where.trim();
      const isUrl = /^https?:\/\//i.test(link);
      const r = await contactCalendarService.schedule({
        contactId: contact.id,
        scheduledFor: d.toISOString(),
        durationMinutes: duration,
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(link ? (isUrl ? { meetingUrl: link } : { location: link }) : {}),
        notify,
      });
      setNotice(notify ? describeNotify(r, who, 'Meeting scheduled') : `Meeting scheduled. ${who} was not notified (notification turned off).`);
      setTitle('');
      setWhen('');
      setWhere('');
      setShowForm(false);
    });

  const reschedule = (id: string) =>
    run(async () => {
      const d = new Date(reschedWhen);
      if (!reschedWhen || Number.isNaN(d.getTime())) throw new Error('Pick a new date and time');
      const r = await contactCalendarService.reschedule(id, d.toISOString());
      setNotice(describeNotify(r, who, 'Meeting rescheduled'));
      setReschedId(null);
    });

  const cancel = (id: string) =>
    run(async () => {
      const r = await contactCalendarService.cancel(id);
      setNotice(describeNotify(r, who, 'Meeting cancelled'));
      setCancelId(null);
    });

  if (!available) {
    return (
      <GlassCard className="p-5">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Calendar</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Meetings need a connected workspace and a saved contact. In demo mode nothing is scheduled or stored,
          so this list stays empty.
        </p>
      </GlassCard>
    );
  }

  const { upcoming, past } = splitEvents(events);

  const renderEvent = (e: ContactCalendarEvent, editable: boolean) => {
    const cancelled = /^cancel+ed$/i.test(e.status ?? '');
    return (
      <li key={e.id} className="py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        <div className="flex flex-wrap items-start gap-3">
          <CalendarClock className="w-4 h-4 mt-0.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${cancelled ? 'line-through text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
              {e.title || 'Meeting'} <span className="text-gray-500 dark:text-gray-400">· {e.duration_minutes ?? 30} min</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(e.scheduled_for)}</p>
            {e.location && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</p>
            )}
            {e.meeting_url && /^https?:\/\//i.test(e.meeting_url) && (
              <a href={e.meeting_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                <Video className="w-3 h-3" />Join link
              </a>
            )}
          </div>
          {cancelled && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Cancelled</span>}
          {editable && (
            <div className="flex items-center gap-2">
              <ModernButton
                size="toolbar"
                variant="outline"
                onClick={() => { setReschedId(reschedId === e.id ? null : e.id); setReschedWhen(toLocalInput(e.scheduled_for)); setCancelId(null); }}
              >
                Reschedule
              </ModernButton>
              {cancelId === e.id ? (
                <ModernButton size="toolbar" variant="outline" loading={busy} onClick={() => void cancel(e.id)}>Confirm cancel</ModernButton>
              ) : (
                <ModernButton size="toolbar" variant="outline" onClick={() => { setCancelId(e.id); setReschedId(null); }}>Cancel</ModernButton>
              )}
            </div>
          )}
        </div>
        {editable && reschedId === e.id && (
          <div className="mt-2 pl-7 flex flex-wrap items-center gap-2">
            <input type="datetime-local" value={reschedWhen} onChange={(ev) => setReschedWhen(ev.target.value)} aria-label="New date and time" className={controlClass} />
            <ModernButton size="toolbar" loading={busy} onClick={() => void reschedule(e.id)}>Save new time</ModernButton>
          </div>
        )}
      </li>
    );
  };

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Calendar {upcoming.length > 0 && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({upcoming.length} upcoming)</span>}
        </h4>
        <div className="flex items-center gap-2">
          <ModernButton size="toolbar" variant="outline" icon={RefreshCw} onClick={() => void load()} loading={loading}>Refresh</ModernButton>
          <ModernButton size="toolbar" icon={showForm ? X : CalendarPlus} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : 'Schedule meeting'}
          </ModernButton>
        </div>
      </div>

      {showForm && (
        <form className="mb-4 space-y-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Intro call)" aria-label="Meeting title" className={`${controlClass} w-full`} />
          <div className="flex flex-wrap items-center gap-2">
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Date and time" className={controlClass} />
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} aria-label="Duration" className={controlClass}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
            </select>
            <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Location or meeting link" aria-label="Location or meeting link" className={`${controlClass} flex-1 min-w-[10rem]`} />
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Free times:</span>
              {suggestions.map((s) => (
                <ModernButton key={s.start} size="toolbar" variant="outline" onClick={() => setWhen(toLocalInput(s.start))}>
                  {fmt(s.start)}
                </ModernButton>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Email {who} an invitation{contact.email ? '' : ' (no email on file)'}
            </label>
            <ModernButton type="submit" size="toolbar" icon={CalendarPlus} loading={busy} disabled={!when}>Schedule</ModernButton>
          </div>
        </form>
      )}

      {notice && <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{notice}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      {loading && events.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && !error && events.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No meetings with this contact yet. Use “Schedule meeting” to add one.</p>
      )}

      {upcoming.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Upcoming</p>
          <ul className="mb-3">{upcoming.map((e) => renderEvent(e, true))}</ul>
        </>
      )}
      {past.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Past</p>
          <ul>{past.map((e) => renderEvent(e, false))}</ul>
        </>
      )}
    </GlassCard>
  );
}
