import React, { memo } from 'react';
import { CheckCircle, PhoneOff, AlertCircle, MessageSquare } from 'lucide-react';

interface CallOutcomeLoggerProps {
  callState: 'idle' | 'calling' | 'connected' | 'completed';
  callOutcome: 'completed' | 'no_answer' | 'busy' | 'voicemail' | 'cancelled';
  callNotes: string;
  followUpRequired: boolean;
  followUpDate: string;
  onOutcomeSelect: (outcome: CallOutcomeLoggerProps['callOutcome']) => void;
  onNotesChange: (notes: string) => void;
  onFollowUpToggle: () => void;
  onFollowUpDateChange: (date: string) => void;
}

export const CallOutcomeLogger: React.FC<CallOutcomeLoggerProps> = memo(({
  callState,
  callOutcome,
  callNotes,
  followUpRequired,
  followUpDate,
  onOutcomeSelect,
  onNotesChange,
  onFollowUpToggle,
  onFollowUpDateChange
}) => {
  if (callState !== 'completed') return null;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Call Outcome</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'completed', label: 'Completed', icon: CheckCircle },
            { value: 'no_answer', label: 'No Answer', icon: PhoneOff },
            { value: 'busy', label: 'Busy', icon: AlertCircle },
            { value: 'voicemail', label: 'Voicemail', icon: MessageSquare }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onOutcomeSelect(value as CallOutcomeLoggerProps['callOutcome'])}
              className={`p-3 border rounded-lg transition-colors ${
                callOutcome === value
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4 mx-auto mb-1" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Call Notes</label>
        <textarea
          value={callNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="What was discussed? Key takeaways..."
        />
      </div>

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="followUp"
          checked={followUpRequired}
          onChange={onFollowUpToggle}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="followUp" className="text-sm font-medium text-gray-700">
          Follow-up required
        </label>
      </div>

      {followUpRequired && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date</label>
          <input
            type="datetime-local"
            value={followUpDate}
            onChange={(e) => onFollowUpDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}
    </div>
  );
});
