import React from 'react';
import { ResearchThinkingAnimation } from './ResearchThinkingAnimation';
import { CitationBadge } from './CitationBadge';
import { X, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface ResearchSource {
  url: string;
  title: string;
  domain: string;
  type: 'news' | 'company' | 'social' | 'industry' | 'academic' | 'government';
  confidence: number;
  timestamp: Date;
  snippet?: string;
}

interface ResearchStatus {
  isActive: boolean;
  stage: 'researching' | 'analyzing' | 'synthesizing' | 'optimizing' | 'complete';
  message: string;
  progress?: number;
  sources: ResearchSource[];
  startTime: Date;
  estimatedCompletion?: Date;
  error?: string;
}

interface ResearchStatusOverlayProps {
  status: ResearchStatus;
  onClose?: () => void;
  position?: 'top' | 'bottom' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResearchStatusOverlay: React.FC<ResearchStatusOverlayProps> = ({
  status,
  onClose,
  position = 'top',
  size = 'md',
  className = ''
}) => {
  if (!status.isActive) return null;

  const elapsedTime = Math.floor((Date.now() - status.startTime.getTime()) / 1000);
  const elapsedFormatted = elapsedTime < 60
    ? `${elapsedTime}s`
    : `${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`;

  const positionClasses = {
    top: 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
    bottom: 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
    inline: 'relative'
  };

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  };

  return (
    <div className={`
      ${positionClasses[position]}
      ${sizeClasses[size]}
      ${className}
    `}>
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Research Active</h3>
              <p className="text-sm text-gray-600">Enhancing with web intelligence</p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Thinking Animation */}
          <ResearchThinkingAnimation
            stage={status.stage}
            message={status.message}
            progress={status.progress}
            showCitations={status.sources.length > 0}
            size={size}
          />

          {/* Status Details */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{elapsedFormatted} elapsed</span>
              </div>

              {status.sources.length > 0 && (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{status.sources.length} sources found</span>
                </div>
              )}
            </div>

            {status.estimatedCompletion && (
              <div className="flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span>~{Math.ceil((status.estimatedCompletion.getTime() - Date.now()) / 1000 / 60)}m remaining</span>
              </div>
            )}
          </div>

          {/* Citations */}
          {status.sources.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">Research Sources</h4>
                <span className="text-xs text-gray-500">{status.sources.length} found</span>
              </div>
              <CitationBadge
                sources={status.sources}
                size="sm"
                maxDisplay={5}
              />
            </div>
          )}

          {/* Error State */}
          {status.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-900">Research Error</p>
                  <p className="text-sm text-red-700">{status.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {status.progress !== undefined && (
          <div className="h-1 bg-gray-200">
            <div
              className={`h-full transition-all duration-500 ${
                status.stage === 'complete' ? 'bg-green-500' :
                status.error ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for managing research status
export const useResearchStatus = () => {
  const [status, setStatus] = React.useState<ResearchStatus>({
    isActive: false,
    stage: 'researching',
    message: '',
    sources: [],
    startTime: new Date()
  });

  const startResearch = (initialMessage = 'Starting research...') => {
    setStatus({
      isActive: true,
      stage: 'researching',
      message: initialMessage,
      progress: 0,
      sources: [],
      startTime: new Date(),
      estimatedCompletion: new Date(Date.now() + 30000) // 30 seconds estimate
    });
  };

  const updateStatus = (updates: Partial<ResearchStatus>) => {
    setStatus(prev => ({ ...prev, ...updates }));
  };

  const addSource = (source: ResearchSource) => {
    setStatus(prev => ({
      ...prev,
      sources: [...prev.sources, source]
    }));
  };

  const addSources = (newSources: ResearchSource[]) => {
    setStatus(prev => ({
      ...prev,
      sources: [...prev.sources, ...newSources]
    }));
  };

  const setError = (error: string) => {
    setStatus(prev => ({
      ...prev,
      error,
      stage: 'complete',
      progress: 100
    }));
  };

  const complete = (finalMessage = 'Research complete!') => {
    setStatus(prev => ({
      ...prev,
      isActive: false,
      stage: 'complete',
      message: finalMessage,
      progress: 100
    }));
  };

  const reset = () => {
    setStatus({
      isActive: false,
      stage: 'researching',
      message: '',
      sources: [],
      startTime: new Date()
    });
  };

  return {
    status,
    startResearch,
    updateStatus,
    addSource,
    addSources,
    setError,
    complete,
    reset
  };
};

// Mini status indicator for inline use
export const ResearchStatusMini: React.FC<{
  status: ResearchStatus;
  className?: string;
}> = ({ status, className = '' }) => {
  if (!status.isActive) return null;

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm ${className}`}>
      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-blue-700 font-medium">{status.message}</span>
      {status.sources.length > 0 && (
        <span className="text-blue-600">({status.sources.length})</span>
      )}
    </div>
  );
};