import React from 'react';
import { BookOpen, Target, Sparkles, Loader2 } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';

interface Deal {
  id: string;
  name: string;
  value?: number;
  company: string;
  stage: string;
  competitors?: string[];
  stakeholders?: any[];
  industry?: string;
  companySize?: number;
}

interface PlaybookHeaderProps {
  deal: Deal;
  loading: boolean;
  isStreamingMode: boolean;
  playbookType: string;
  onStreamingModeChange: (enabled: boolean) => void;
  onPlaybookTypeChange: (type: string) => void;
  onGenerate: () => void;
  onStopStreaming: (() => void) | undefined;
  activeStreams: Set<string>;
}

export const PlaybookHeader: React.FC<PlaybookHeaderProps> = ({
  deal,
  loading,
  isStreamingMode,
  playbookType,
  onStreamingModeChange,
  onPlaybookTypeChange,
  onGenerate,
  onStopStreaming,
  activeStreams
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            Adaptive Sales Playbook
            <Sparkles className="w-5 h-5 ml-2 text-yellow-500" />
          </h2>
          <p className="text-sm text-gray-600">GPT-5 powered strategy for {deal.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Streaming Mode Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isStreamingMode}
              onChange={(e) => onStreamingModeChange(e.target.checked)}
              className="rounded"
              disabled={loading}
            />
            <span className="text-gray-600">Streaming</span>
          </label>
        </div>

        <select
          value={playbookType}
          onChange={(e) => onPlaybookTypeChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          disabled={loading}
        >
          <option value="comprehensive">Comprehensive</option>
          <option value="aggressive">Aggressive</option>
          <option value="conservative">Conservative</option>
          <option value="relationship">Relationship-Focused</option>
          <option value="transactional">Transactional</option>
        </select>

        <div className="flex items-center gap-2">
          <ModernButton
            variant="outline"
            size="sm"
            onClick={onGenerate}
            loading={loading}
            className="flex items-center space-x-2"
            aria-label="Generate adaptive sales playbook"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isStreamingMode ? 'Streaming...' : 'Generating...'}</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                <span>🎯 Generate</span>
              </>
            )}
          </ModernButton>

          {loading && activeStreams && activeStreams.size > 0 && onStopStreaming && (
            <ModernButton
              variant="outline"
              size="sm"
              onClick={onStopStreaming}
              className="text-red-600 hover:text-red-700"
            >
              Stop
            </ModernButton>
          )}
        </div>
      </div>
    </div>
  );
};