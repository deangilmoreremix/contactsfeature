import React from 'react';
import { Bot } from 'lucide-react';
import { SmartTooltip } from '../ui/SmartTooltip';

interface AgentStatusIndicatorProps {
  isActive: boolean;
  lastInteraction?: string;
  className?: string;
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  isActive,
  lastInteraction,
  className = ''
}) => {
  if (!isActive) return null;

  return (
    <SmartTooltip featureId="agent_status_indicator">
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${className} ${
        isActive 
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      }`}>
        <Bot className="w-3 h-3" />
        <span>AI Agent</span>
        {isActive && (
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    </SmartTooltip>
  );
};
