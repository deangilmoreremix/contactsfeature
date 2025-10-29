import React from 'react';
import { Brain, Search, Sparkles, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

interface ResearchThinkingAnimationProps {
  stage: 'researching' | 'analyzing' | 'synthesizing' | 'optimizing' | 'complete' | 'error';
  message: string;
  progress?: number;
  showCitations?: boolean;
  size?: 'sm' | 'md' | 'lg';
  estimatedTime?: number;
  currentStep?: number;
  totalSteps?: number;
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
  },
  error: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    messages: ['Research failed', 'Analysis error', 'Please try again']
  }
};

export const ResearchThinkingAnimation: React.FC<ResearchThinkingAnimationProps> = ({
  stage,
  message,
  progress,
  showCitations = false,
  size = 'md',
  estimatedTime,
  currentStep,
  totalSteps
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

        {/* Enhanced Progress bar for stages with progress */}
        {progress !== undefined && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  stage === 'complete' ? 'bg-green-500' :
                  stage === 'error' ? 'bg-red-500' : 'bg-current'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                {progress}% complete
              </p>
              {estimatedTime && (
                <p className="text-xs text-gray-500">
                  ~{estimatedTime}s remaining
                </p>
              )}
            </div>
            {currentStep && totalSteps && (
              <p className="text-xs text-gray-500 mt-1">
                Step {currentStep} of {totalSteps}
              </p>
            )}
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

// Enhanced hook for managing research thinking states with granular progress
export const useResearchThinking = () => {
  const [currentStage, setCurrentStage] = React.useState<ResearchThinkingAnimationProps['stage']>('researching');
  const [message, setMessage] = React.useState('');
  const [progress, setProgress] = React.useState<number | undefined>();
  const [currentStep, setCurrentStep] = React.useState<number | undefined>();
  const [totalSteps, setTotalSteps] = React.useState<number | undefined>();
  const [estimatedTime, setEstimatedTime] = React.useState<number | undefined>();
  const [startTime, setStartTime] = React.useState<number | undefined>();

  const startResearch = (initialMessage = 'Starting research...', steps = 4) => {
    setCurrentStage('researching');
    setMessage(initialMessage);
    setProgress(0);
    setCurrentStep(1);
    setTotalSteps(steps);
    setStartTime(Date.now());
    setEstimatedTime(30); // Default 30 seconds
  };

  const updateProgress = (newProgress: number, newMessage?: string, step?: number) => {
    setProgress(newProgress);
    if (newMessage) setMessage(newMessage);
    if (step) setCurrentStep(step);

    // Update estimated time based on progress
    if (startTime && totalSteps && currentStep) {
      const elapsed = (Date.now() - startTime) / 1000;
      const remainingSteps = (totalSteps - currentStep);
      const avgTimePerStep = elapsed / currentStep;
      setEstimatedTime(Math.round(avgTimePerStep * remainingSteps));
    }
  };

  const moveToAnalyzing = (newMessage = 'Analyzing data...') => {
    setCurrentStage('analyzing');
    setMessage(newMessage);
    setProgress(25);
    setCurrentStep(2);
  };

  const moveToSynthesizing = (newMessage = 'Synthesizing results...') => {
    setCurrentStage('synthesizing');
    setMessage(newMessage);
    setProgress(75);
    setCurrentStep(3);
  };

  const moveToOptimizing = (newMessage = 'Optimizing output...') => {
    setCurrentStage('optimizing');
    setMessage(newMessage);
    setProgress(90);
    setCurrentStep(4);
  };

  const complete = (finalMessage = 'Research complete!') => {
    setCurrentStage('complete');
    setMessage(finalMessage);
    setProgress(100);
    setCurrentStep(totalSteps);
    setEstimatedTime(0);
  };

  const setError = (errorMessage = 'Research failed') => {
    setCurrentStage('error');
    setMessage(errorMessage);
    setProgress(0);
    setEstimatedTime(0);
  };

  const reset = () => {
    setCurrentStage('researching');
    setMessage('');
    setProgress(undefined);
    setCurrentStep(undefined);
    setTotalSteps(undefined);
    setEstimatedTime(undefined);
    setStartTime(undefined);
  };

  return {
    currentStage,
    message,
    progress,
    currentStep,
    totalSteps,
    estimatedTime,
    startTime,
    startResearch,
    updateProgress,
    moveToAnalyzing,
    moveToSynthesizing,
    moveToOptimizing,
    complete,
    setError,
    reset
  };
};