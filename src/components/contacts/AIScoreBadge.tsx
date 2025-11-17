import React, { memo } from 'react';
import { Brain, Loader2, Sparkles } from 'lucide-react';
import { AI_SCORE_COLORS, AI_SCORE_THRESHOLDS } from '../../utils/constants';

interface AIScoreBadgeProps {
  score?: number | null | undefined;
  onAnalyze?: () => Promise<void>;
  isAnalyzing?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const getScoreColor = (score: number): string => {
  if (score >= AI_SCORE_THRESHOLDS.EXCELLENT) return AI_SCORE_COLORS.EXCELLENT;
  if (score >= AI_SCORE_THRESHOLDS.GOOD) return AI_SCORE_COLORS.GOOD;
  if (score >= AI_SCORE_THRESHOLDS.FAIR) return AI_SCORE_COLORS.FAIR;
  return AI_SCORE_COLORS.POOR;
};

const getScoreSize = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return 'w-8 h-8 text-xs';
    case 'lg':
      return 'w-16 h-16 text-xl';
    default:
      return 'w-12 h-12 text-lg';
  }
};

export const AIScoreBadge: React.FC<AIScoreBadgeProps> = memo(({
  score,
  onAnalyze,
  isAnalyzing = false,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const sizeClasses = getScoreSize(size);

  if (score !== undefined && score !== null) {
    // Display existing AI score
    return (
      <div className={`flex flex-col items-center space-y-2 ${className}`}>
        <div
          data-testid="ai-score-display"
          className={`${sizeClasses} rounded-full ${getScoreColor(score)} text-white flex items-center justify-center font-bold shadow-lg ring-2 ring-white relative`}
        >
          {score}
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-300" />
        </div>
        {showLabel && (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            AI Score
          </span>
        )}
      </div>
    );
  }

  // Display button to get AI score
  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <button
        data-testid="ai-score-button"
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className={`${sizeClasses} rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-110 relative`}
        title="Click to get AI score"
      >
        {isAnalyzing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Brain className="w-5 h-5" />
        )}
        {!isAnalyzing && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse">
            <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping"></div>
          </div>
        )}
      </button>
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {isAnalyzing ? 'Analyzing...' : 'Click to Score'}
        </span>
      )}
    </div>
  );
});

AIScoreBadge.displayName = 'AIScoreBadge';