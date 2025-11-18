import React, { memo } from 'react';
import { ModernButton } from '../ui/ModernButton';
import { Clock, Calendar } from 'lucide-react';

interface EmailSchedulerProps {
  showScheduler: boolean;
  onToggleScheduler: () => void;
  scheduledDate: string;
  onScheduledDateChange: (date: string) => void;
  scheduledTime: string;
  onScheduledTimeChange: (time: string) => void;
  onScheduleSend: () => void;
  isScheduling: boolean;
}

export const EmailScheduler: React.FC<EmailSchedulerProps> = memo(({
  showScheduler,
  onToggleScheduler,
  scheduledDate,
  onScheduledDateChange,
  scheduledTime,
  onScheduledTimeChange,
  onScheduleSend,
  isScheduling
}) => {
  return (
    <div>
      <button
        onClick={onToggleScheduler}
        className="flex items-center space-x-2 px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
      >
        <Clock className="w-4 h-4" />
        <span>Schedule for Later</span>
      </button>

      {showScheduler && (
        <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => onScheduledDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => onScheduledTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          <ModernButton
            onClick={onScheduleSend}
            loading={isScheduling}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Email
          </ModernButton>
        </div>
      )}
    </div>
  );
});