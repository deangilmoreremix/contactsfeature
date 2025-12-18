import React from 'react';
import { Zap, CheckCircle } from 'lucide-react';

interface StreamingPhase {
  name: string;
  progress: number;
}

interface StreamingProgressProps {
  isStreamingMode: boolean;
  loading: boolean;
  streamingProgress: number;
  streamingPhases: StreamingPhase[];
  activeStreams?: Set<string>;
}

export const StreamingProgress: React.FC<StreamingProgressProps> = ({
  isStreamingMode,
  loading,
  streamingProgress,
  streamingPhases,
  activeStreams
}) => {
  if (!isStreamingMode || (!loading && streamingProgress === 0)) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Generation Progress
        </span>
        <span className="text-sm text-blue-600">{Math.round(streamingProgress)}%</span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${streamingProgress}%` }}
        ></div>
      </div>

      {streamingPhases.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-blue-800">Completed Phases:</p>
          {streamingPhases.map((phase, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-blue-700">
              <CheckCircle className="w-3 h-3" />
              <span>{phase.name}</span>
            </div>
          ))}
        </div>
      )}

      {activeStreams && activeStreams.size > 0 && (
        <p className="text-xs text-blue-600 mt-2">
          Active streams: {activeStreams.size}
        </p>
      )}
    </div>
  );
};