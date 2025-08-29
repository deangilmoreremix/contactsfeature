import React from 'react';
import { Tooltip } from './Tooltip';
import { Sparkles, Info } from 'lucide-react';

interface FeatureHighlightProps {
  children: React.ReactNode;
  tooltipContent: string;
  isAIFeature?: boolean;
  tourId?: string;
  className?: string;
  showIndicator?: boolean;
}

export const FeatureHighlight: React.FC<FeatureHighlightProps> = ({
  children,
  tooltipContent,
  isAIFeature = false,
  tourId,
  className = '',
  showIndicator = true
}) => {
  return (
    <div 
      className={`relative ${className}`}
      data-tour-id={tourId}
    >
      <Tooltip content={tooltipContent} position="top">
        <div className="relative">
          {children}
          
          {/* Feature Indicator */}
          {showIndicator && (
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center cursor-help feature-indicator ${
              isAIFeature 
                ? 'bg-purple-500 text-white' 
                : 'bg-blue-500 text-white'
            }`}>
              {isAIFeature ? (
                <Sparkles className="w-2.5 h-2.5" />
              ) : (
                <Info className="w-2.5 h-2.5" />
              )}
            </div>
          )}
        </div>
      </Tooltip>
    </div>
  );
};