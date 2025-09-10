import React, { useEffect, useState } from 'react';
import { useGuidance } from '../../contexts/GuidanceContext';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import {
  X,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowUp,
  Clock
} from 'lucide-react';

interface ContextualHelpProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  maxWidth?: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  position = 'top-right',
  maxWidth = '320px'
}) => {
  const { state, hideContextualHelp } = useGuidance();
  const [visibleHelp, setVisibleHelp] = useState<any[]>([]);
  const [dismissedHelp, setDismissedHelp] = useState<Set<string>>(new Set());

  // Filter and prioritize contextual help
  useEffect(() => {
    const activeHelp = state.contextualHelp.filter(help => {
      // Don't show if already dismissed
      if (dismissedHelp.has(help.id)) return false;

      // Check if help should still be shown based on conditions
      return shouldShowHelp(help);
    });

    // Sort by priority (high first)
    activeHelp.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Limit to 3 concurrent help messages
    setVisibleHelp(activeHelp.slice(0, 3));
  }, [state.contextualHelp, dismissedHelp]);

  const shouldShowHelp = (help: any): boolean => {
    // Check cooldown period
    const lastShown = localStorage.getItem(`help_${help.id}_lastShown`);
    if (lastShown) {
      const timeSinceLastShown = Date.now() - parseInt(lastShown);
      const cooldownMs = help.cooldownPeriod * 60 * 1000; // Convert minutes to ms
      if (timeSinceLastShown < cooldownMs) {
        return false;
      }
    }

    // Check display count
    const displayCount = parseInt(localStorage.getItem(`help_${help.id}_count`) || '0');
    if (displayCount >= help.maxDisplays) {
      return false;
    }

    return true;
  };

  const handleDismiss = (helpId: string) => {
    setDismissedHelp(prev => new Set([...prev, helpId]));
    hideContextualHelp(helpId);

    // Update display count and last shown time
    const currentCount = parseInt(localStorage.getItem(`help_${helpId}_count`) || '0');
    localStorage.setItem(`help_${helpId}_count`, (currentCount + 1).toString());
    localStorage.setItem(`help_${helpId}_lastShown`, Date.now().toString());
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  const getIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'low':
      default:
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getBackgroundColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-blue-50 border-blue-200';
      case 'low':
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  if (visibleHelp.length === 0) return null;

  return (
    <div className={`fixed z-40 ${getPositionClasses()}`} style={{ maxWidth }}>
      <div className="space-y-3">
        {visibleHelp.map((help, index) => (
          <div
            key={help.id}
            className="animate-slide-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <GlassCard className={`p-4 ${getBackgroundColor(help.priority)}`}>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(help.priority)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {help.priority === 'high' && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Important
                        </span>
                      )}
                      {help.trigger === 'error' && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Error
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDismiss(help.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Dismiss help"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="text-sm text-gray-700 leading-relaxed">
                    {typeof help.content === 'string' ? (
                      <p>{help.content}</p>
                    ) : (
                      help.content
                    )}
                  </div>

                  {help.cooldownPeriod > 0 && (
                    <div className="flex items-center space-x-1 mt-3 pt-2 border-t border-gray-200">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Will remind you later if needed
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        ))}
      </div>
    </div>
  );
};

// Hook for triggering contextual help from anywhere in the app
export const useContextualHelp = () => {
  const { showContextualHelp } = useGuidance();

  const triggerHelp = (
    id: string,
    content: string | React.ReactNode,
    options: {
      priority?: 'low' | 'medium' | 'high';
      trigger?: 'hover' | 'click' | 'focus' | 'inactivity' | 'error';
      maxDisplays?: number;
      cooldownMinutes?: number;
    } = {}
  ) => {
    showContextualHelp({
      id,
      trigger: options.trigger || 'inactivity',
      condition: 'manual_trigger',
      content,
      priority: options.priority || 'medium',
      maxDisplays: options.maxDisplays || 3,
      cooldownPeriod: options.cooldownMinutes || 60
    });
  };

  return { triggerHelp };
};