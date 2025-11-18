import React, { memo } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface CallControlsProps {
  isMuted: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

export const CallControls: React.FC<CallControlsProps> = memo(({
  isMuted,
  isSpeakerOn,
  onToggleMute,
  onToggleSpeaker
}) => {
  return (
    <div className="flex justify-center space-x-4">
      <button
        onClick={onToggleMute}
        className={`p-3 rounded-full transition-colors ${
          isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      <button
        onClick={onToggleSpeaker}
        className={`p-3 rounded-full transition-colors ${
          !isSpeakerOn ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>
    </div>
  );
});