import React, { memo } from 'react';
import { BarChart, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { ContactInsight } from '../../services/contact-ai.service';

interface AIInsightsPreviewProps {
  insights?: ContactInsight[] | null;
  score?: number | null;
  onPositiveFeedback?: () => void;
  onNegativeFeedback?: () => void;
  className?: string;
}

export const AIInsightsPreview: React.FC<AIInsightsPreviewProps> = memo(({
  insights = [],
  score,
  onPositiveFeedback,
  onNegativeFeedback,
  className = ''
}) => {
  if (!score && (!insights || insights.length === 0)) {
    return null;
  }

  const getScoreMessage = (score: number) => {
    if (score >= 80) return 'High conversion potential - prioritize for immediate follow-up.';
    if (score >= 60) return 'Good engagement potential - schedule follow-up within 48 hours.';
    if (score >= 40) return 'Moderate interest - nurture with valuable content.';
    return 'Low engagement - consider re-qualification.';
  };

  return (
    <div className={`mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <BarChart className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
          AI Insights
        </h4>
        <div className="flex space-x-1">
          {onPositiveFeedback && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPositiveFeedback();
              }}
              className="p-1 bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 rounded text-gray-600 dark:text-gray-300 transition-colors"
              title="Good AI analysis"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
          )}
          {onNegativeFeedback && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNegativeFeedback();
              }}
              className="p-1 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded text-gray-600 dark:text-gray-300 transition-colors"
              title="Poor AI analysis"
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {score && (
        <p className="text-xs text-gray-900 dark:text-gray-100 mb-2">
          {getScoreMessage(score)}
        </p>
      )}

      {insights && insights.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Latest AI Insights:</p>
          <ul className="text-xs text-gray-700 dark:text-gray-300 mt-1">
            {insights.slice(0, 2).map((insight, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 dark:text-blue-400 mr-1">•</span>
                <span>{insight.title || insight.description?.substring(0, 50) + '...'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center space-x-1">
        <Sparkles className="w-3 h-3 text-purple-500 dark:text-purple-400" />
        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">AI-powered analysis</span>
      </div>
    </div>
  );
});

AIInsightsPreview.displayName = 'AIInsightsPreview';