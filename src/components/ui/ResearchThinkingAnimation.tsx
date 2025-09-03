import React from 'react';
import { Brain, Search, Sparkles, CheckCircle, Loader2 } from 'lucide-react';

interface ResearchThinkingAnimationProps {
  stage: 'researching' | 'analyzing' | 'synthesizing' | 'optimizing' | 'complete';
  message: string;
  progress?: number;
  showCitations?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const stageConfig = {
  researching: {
    icon: Search,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    messages: ['Searching web...', 'Finding sources...', 'Gathering data...']
  },
  analyzing: {
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    messages: ['Processing data...', 'Analyzing patterns...', 'Extracting insights...']
  },
  synthesizing: {
    icon: Sparkles,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    messages: ['Synthesizing results...', 'Generating insights...', 'Creating recommendations...']
  },
  optimizing: {
    icon: Loader2,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    messages: ['Optimizing results...', 'Refining analysis...', 'Finalizing output...']
  },
  complete: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    messages: ['Research complete!', 'Analysis finished!', 'Ready to use!']
  }
};

export const ResearchThinkingAnimation: React.FC<ResearchThinkingAnimationProps> = ({
  stage,
  message,
  progress,
  showCitations = false,
  size = 'md'
}) => {
  const config = stageConfig[stage];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'p-2 text-sm',
    md: 'p-3 text-base',
    lg: 'p-4 text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`
      ${config.bgColor} ${config.borderColor} border rounded-lg
      ${sizeClasses[size]} flex items-center space-x-3
      transition-all duration-300 ease-in-out
    `}>
      <div className="relative">
        <Icon className={`${iconSizes[size]} ${config.color} ${
          stage === 'researching' || stage === 'analyzing' || stage === 'optimizing'
            ? 'animate-pulse'
            : ''
        }`} />

        {/* Animated dots for active stages */}
        {(stage === 'researching' || stage === 'analyzing' || stage === 'optimizing') && (
          <div className="absolute -top-1 -right-1 flex space-x-0.5">
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-medium ${config.color} truncate`}>
          {message}
        </p>

        {/* Progress bar for stages with progress */}
        {progress !== undefined && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  stage === 'complete' ? 'bg-green-500' : 'bg-current'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {progress}% complete
            </p>
          </div>
        )}

        {/* Citation indicator */}
        {showCitations && (
          <div className="flex items-center space-x-1 mt-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            <span className="text-xs text-blue-600 font-medium">
              Research sources available
            </span>
          </div>
        )}
      </div>

      {/* Stage indicator */}
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
        {stage}
      </div>
    </div>
  );
};

// Hook for managing research thinking states
export const useResearchThinking = () => {
  const [currentStage, setCurrentStage] = React.useState<ResearchThinkingAnimationProps['stage']>('researching');
  const [message, setMessage] = React.useState('');
  const [progress, setProgress] = React.useState<number | undefined>();

  const startResearch = (initialMessage = 'Starting research...') => {
    setCurrentStage('researching');
    setMessage(initialMessage);
    setProgress(0);
  };

  const updateProgress = (newProgress: number, newMessage?: string) => {
    setProgress(newProgress);
    if (newMessage) setMessage(newMessage);
  };

  const moveToAnalyzing = (newMessage = 'Analyzing data...') => {
    setCurrentStage('analyzing');
    setMessage(newMessage);
    setProgress(25);
  };

  const moveToSynthesizing = (newMessage = 'Synthesizing results...') => {
    setCurrentStage('synthesizing');
    setMessage(newMessage);
    setProgress(75);
  };

  const moveToOptimizing = (newMessage = 'Optimizing output...') => {
    setCurrentStage('optimizing');
    setMessage(newMessage);
    setProgress(90);
  };

  const complete = (finalMessage = 'Research complete!') => {
    setCurrentStage('complete');
    setMessage(finalMessage);
    setProgress(100);
  };

  return {
    currentStage,
    message,
    progress,
    startResearch,
    updateProgress,
    moveToAnalyzing,
    moveToSynthesizing,
    moveToOptimizing,
    complete
  };
};