import React, { memo } from 'react';
import { Phone, PhoneCall, PhoneOff, CheckCircle } from 'lucide-react';

interface CallStateDisplayProps {
  callState: 'idle' | 'calling' | 'connected' | 'completed';
  contactName: string;
  contactPhone?: string;
  callDuration: number;
  formatDuration: (seconds: number) => string;
}

export const CallStateDisplay: React.FC<CallStateDisplayProps> = memo(({
  callState,
  contactName,
  contactPhone,
  callDuration,
  formatDuration
}) => {
  return (
    <div className="text-center">
      {callState === 'idle' && (
        <div className="space-y-4">
          <div className="text-6xl text-gray-300">
            <Phone className="mx-auto" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">{contactPhone || 'No phone number'}</p>
            <p className="text-sm text-gray-600">Tap to call</p>
          </div>
        </div>
      )}

      {callState === 'calling' && (
        <div className="space-y-4">
          <div className="text-6xl text-blue-500 animate-pulse">
            <PhoneCall className="mx-auto" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">Calling...</p>
            <p className="text-sm text-gray-600">Please wait</p>
          </div>
        </div>
      )}

      {callState === 'connected' && (
        <div className="space-y-4">
          <div className="text-6xl text-green-500">
            <PhoneCall className="mx-auto" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">Connected</p>
            <p className="text-sm text-gray-600">{formatDuration(callDuration)}</p>
          </div>
        </div>
      )}

      {callState === 'completed' && (
        <div className="space-y-4">
          <div className="text-6xl text-gray-400">
            <CheckCircle className="mx-auto" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">Call Completed</p>
            <p className="text-sm text-gray-600">Duration: {formatDuration(callDuration)}</p>
          </div>
        </div>
      )}
    </div>
  );
});