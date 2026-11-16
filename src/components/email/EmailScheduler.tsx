import React, { useState, useEffect, useCallback } from 'react';
import { Contact } from '../../types/contact';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { useToast } from '../ui/Toast';
import { Calendar, Clock, Send, TrendingUp, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { emailSchedulerService, ScheduledEmail } from '../../services/emailSchedulerService';
import { emailTrackingService, bestSendWindow } from '../../services/emailTrackingService';
import { zonedTimeToUtc } from '../../utils/zonedTime';

interface EmailSchedule {
  scheduledDate: Date;
  timezone: string;
  emailId: string;
}

interface EmailSchedulerProps {
  contact: Contact;
  emailSubject: string;
  emailBody: string;
  onSchedule?: (scheduleData: EmailSchedule) => void;
  onSendNow?: () => void;
  className?: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const statusStyle: Record<string, string> = {
  queued: 'text-blue-700 bg-blue-100',
  sending: 'text-amber-700 bg-amber-100',
  sent: 'text-green-700 bg-green-100',
  failed: 'text-red-700 bg-red-100',
  draft: 'text-gray-700 bg-gray-100',
};

export const EmailScheduler: React.FC<EmailSchedulerProps> = ({
  contact, emailSubject, emailBody, onSchedule, onSendNow, className = ''
}) => {
  const { showToast } = useToast();
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [bestWindow, setBestWindow] = useState<{ hour: number; day: number } | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setScheduled(await emailSchedulerService.getScheduledEmails(contact.id));
      setListError(null);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Could not load scheduled emails');
    }
  }, [contact.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Best send window is derived from this user's own opened emails; no data -> no suggestion.
  useEffect(() => {
    let cancelled = false;
    emailTrackingService.getOverallEmails()
      .then((rows) => { if (!cancelled) setBestWindow(bestSendWindow(rows)); })
      .catch(() => { if (!cancelled) setBestWindow(null); });
    return () => { cancelled = true; };
  }, []);

  const handleScheduleEmail = async () => {
    if (!scheduledDate || !scheduledTime) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Please select both date and time for scheduling' });
      return;
    }
    if (!contact.email) {
      showToast({ type: 'error', title: 'No recipient', message: 'This contact has no email address' });
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      showToast({ type: 'error', title: 'Empty email', message: 'Write a subject and body first' });
      return;
    }
    const when = zonedTimeToUtc(scheduledDate, scheduledTime, timezone);
    if (when.getTime() <= Date.now() + 60_000) {
      showToast({ type: 'error', title: 'Invalid Time', message: 'Scheduled time must be in the future' });
      return;
    }
    setIsScheduling(true);
    try {
      const r = await emailSchedulerService.scheduleEmail({
        to: contact.email, subject: emailSubject, body: emailBody, scheduledFor: when, contactId: contact.id,
      });
      showToast({ type: 'success', title: 'Email Scheduled', message: `Queued for ${when.toLocaleString()} (delivered within 5 minutes of that time)` });
      onSchedule?.({ scheduledDate: when, timezone, emailId: r.id });
      await refresh();
    } catch (e) {
      showToast({ type: 'error', title: 'Scheduling failed', message: e instanceof Error ? e.message : 'Could not schedule the email' });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const ok = await emailSchedulerService.cancelScheduledEmail(id);
      showToast(ok
        ? { type: 'success', title: 'Cancelled', message: 'The scheduled email was removed' }
        : { type: 'error', title: 'Too late', message: 'This email is already being sent' });
      await refresh();
    } catch (e) {
      showToast({ type: 'error', title: 'Cancel failed', message: e instanceof Error ? e.message : 'Could not cancel' });
    }
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-500" />
          Email Scheduler
        </h3>
        <ModernButton variant="outline" size="toolbar" onClick={() => void refresh()} className="flex items-center space-x-1">
          <RefreshCw className="w-4 h-4" /><span>Refresh</span>
        </ModernButton>
      </div>

      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <ModernButton size="toolbar" variant="primary" onClick={() => onSendNow?.()} className="flex items-center space-x-2 bg-green-600 hover:bg-green-700">
            <Send className="w-4 h-4" /><span>Send Now</span>
          </ModernButton>
          <div className="text-gray-400">or</div>
          <ModernButton size="toolbar" variant="outline" onClick={() => void handleScheduleEmail()} loading={isScheduling} disabled={!scheduledDate || !scheduledTime} className="flex items-center space-x-2">
            <Clock className="w-4 h-4" /><span>Schedule</span>
          </ModernButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Send Date</label>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Send Time</label>
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
            {Array.from(new Set([Intl.DateTimeFormat().resolvedOptions().timeZone, 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'])).map((tz) => (
              <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          <div className="flex items-center mb-1 font-medium"><TrendingUp className="w-4 h-4 mr-1" />Best send time</div>
          {bestWindow === undefined && <p className="text-blue-700">Checking your open history...</p>}
          {bestWindow === null && <p className="text-blue-700">Not enough tracked opens yet. Suggestions appear once at least 5 of your sent emails have been opened.</p>}
          {bestWindow && (
            <button type="button" className="underline" onClick={() => setScheduledTime(`${String(bestWindow.hour).padStart(2, '0')}:00`)}>
              Your emails are opened most when sent around {String(bestWindow.hour).padStart(2, '0')}:00 on {DAYS[bestWindow.day]}s (use {String(bestWindow.hour).padStart(2, '0')}:00)
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">Need follow-ups? Use the Sequences tab: steps are queued automatically and stop when the contact replies.</p>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Scheduled for this contact</h4>
          {listError && <p className="text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{listError}</p>}
          {!listError && scheduled.length === 0 && <p className="text-sm text-gray-500">Nothing scheduled.</p>}
          <div className="space-y-2">
            {scheduled.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.subject}</p>
                  <p className="text-xs text-gray-500">{m.scheduledFor?.toLocaleString()}{m.error ? ` - ${m.error}` : ''}</p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusStyle[m.status] || statusStyle['draft']}`}>
                    {m.status === 'sent' && <CheckCircle className="w-3 h-3 inline mr-1" />}{m.status}
                  </span>
                  {m.status === 'queued' && (
                    <button type="button" onClick={() => void handleCancel(m.id)} aria-label="Cancel scheduled email" className="text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
