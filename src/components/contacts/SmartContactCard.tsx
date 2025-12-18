import React, { memo, useCallback } from 'react';
import { Contact } from '../../types/contact';
import { useHoverPreview } from '../../hooks/useHoverPreview';
import { useContactMetrics } from '../../hooks/useContactMetrics';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import { ModernButton } from '../ui/ModernButton';
import {
  Mail,
  Phone,
  User,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Heart,
  Zap,
  Sparkles,
  Target,
  BookOpen
} from 'lucide-react';
import clsx from 'clsx';

interface SmartContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onEdit?: (contact: Contact) => void;
  onAnalyze?: (contact: Contact) => Promise<boolean>;
  isAnalyzing?: boolean;
  variant?: 'compact' | 'standard' | 'preview';
  showMetrics?: boolean;
  enableQuickActions?: boolean;
  hoverDelay?: number;
  className?: string;
  onOpenSDRModal?: (contact: Contact) => void;
  onOpenPlaybookModal?: (contact: Contact) => void;
}

const SmartContactCardComponent: React.FC<SmartContactCardProps> = ({
  contact,
  isSelected,
  onSelect,
  onClick,
  onEdit,
  onAnalyze,
  isAnalyzing = false,
  variant = 'standard',
  showMetrics = true,
  enableQuickActions = true,
  hoverDelay = 300,
  className,
  onOpenSDRModal,
  onOpenPlaybookModal
}) => {
  const { metrics } = useContactMetrics(contact);
  const {
    showPreview,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur
  } = useHoverPreview({ delay: hoverDelay });

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    onClick();
  }, [onClick]);

  const handleQuickEmail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Quick email action - could open email composer
    console.log('Quick email to:', contact.email);
  }, [contact.email]);

  const handleQuickCall = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Quick call action - could initiate call
    console.log('Quick call to:', contact.phone);
  }, [contact.phone]);

  const handleOpenSDRModal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenSDRModal) {
      onOpenSDRModal(contact);
    }
  }, [contact, onOpenSDRModal]);

  const handleOpenPlaybookModal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenPlaybookModal) {
      onOpenPlaybookModal(contact);
    }
  }, [contact, onOpenPlaybookModal]);

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'very-high': return 'text-green-600 bg-green-100';
      case 'high': return 'text-blue-600 bg-blue-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRelationshipColor = (strength: string) => {
    switch (strength) {
      case 'excellent': return 'text-purple-600 bg-purple-100';
      case 'strong': return 'text-blue-600 bg-blue-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatLastContact = (date: Date | null) => {
    if (!date) return 'Never';
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div
      className={clsx(
        'relative bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700 overflow-hidden',
        isSelected && 'ring-2 ring-blue-500 border-blue-500',
        className
      )}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="button"
      tabIndex={0}
      aria-label={`Contact card for ${contact.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-4 left-4 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-white border-gray-300"
          aria-label={`Select contact ${contact.name}`}
        />
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Avatar and Basic Info */}
        <div className="flex items-start justify-between mb-4">
          <div className="text-center flex-1">
            <div className="relative inline-block mb-3">
              <AvatarWithStatus
                src={contact.avatarSrc}
                alt={contact.name}
                size="lg"
                status={contact.status === 'active' ? 'active' : 'pending'}
              />

              {/* Analyzing indicator */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {contact.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">{contact.title}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">{contact.company}</p>
          </div>

          {/* AI Score */}
          {/* Agent Status */}
          <AgentStatusIndicator
            isActive={true} /* Mock - would check contact agent settings */
            className="mt-2"
          />
          {contact.aiScore && (
            <div className="flex flex-col items-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                {contact.aiScore}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                AI Score
          {/* Agent Status */}
          <AgentStatusIndicator
            isActive={true} /* Mock - would check contact agent settings */
            className="mt-2"
          />
              </span>
            </div>
          )}
        </div>

        {/* Metrics Row */}
        {showMetrics && metrics && (
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className={clsx(
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
              getActivityColor(metrics.activityLevel)
            )}>
              <Activity className="w-3 h-3" />
              <span className="capitalize">{metrics.activityLevel.replace('-', ' ')}</span>
            </div>

            <div className={clsx(
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
              getRelationshipColor(metrics.relationshipStrength)
            )}>
              <Heart className="w-3 h-3" />
              <span className="capitalize">{metrics.relationshipStrength}</span>
            </div>
          </div>
        )}

        {/* Interest Level */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className={clsx(
            'w-2 h-2 rounded-full animate-pulse',
            contact.interestLevel === 'hot' && 'bg-red-500',
            contact.interestLevel === 'medium' && 'bg-yellow-500',
            contact.interestLevel === 'low' && 'bg-blue-500',
            contact.interestLevel === 'cold' && 'bg-gray-400'
          )} />
          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium capitalize">
            {contact.interestLevel} Interest
          </span>
        </div>

        {/* Quick Actions */}
        {enableQuickActions && (
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            <button
              onClick={handleQuickEmail}
              className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full hover:from-blue-100 hover:to-blue-200 text-xs font-medium transition-all duration-200 border border-blue-200/50 shadow-sm"
              title="Quick Email"
            >
              <Mail className="w-3 h-3 mr-1" /> Email
            </button>
            <button
              onClick={handleQuickCall}
              className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-full hover:from-green-100 hover:to-green-200 text-xs font-medium transition-all duration-200 border border-green-200/50 shadow-sm"
              title="Quick Call"
            >
              <Phone className="w-3 h-3 mr-1" /> Call
            </button>
            <button
              onClick={handleOpenSDRModal}
              className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-full hover:from-red-100 hover:to-red-200 text-xs font-medium transition-all duration-200 border border-red-200/50 shadow-sm"
              title="Run SDR Campaign"
            >
              <Target className="w-3 h-3 mr-1" /> SDR
            </button>
            <button
              onClick={handleOpenPlaybookModal}
              className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 rounded-full hover:from-orange-100 hover:to-orange-200 text-xs font-medium transition-all duration-200 border border-orange-200/50 shadow-sm"
              title="Execute Sales Playbook"
            >
              <BookOpen className="w-3 h-3 mr-1" /> Book
            </button>
            <button
              onClick={onClick}
              className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-full hover:from-purple-100 hover:to-purple-200 text-xs font-medium transition-all duration-200 border border-purple-200/50 shadow-sm"
              title="View Details"
            >
              <User className="w-3 h-3 mr-1" /> View
            </button>
          </div>
        )}

        {/* Hover Preview */}
        {showPreview && variant !== 'compact' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  <Activity className="w-4 h-4 mr-1" />
                  Quick Stats
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Last Contact:</span>
                    <span className="font-medium">{formatLastContact(metrics?.lastInteraction || null)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Health Score:</span>
                    <span className="font-medium">{metrics?.healthScore || 0}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Engagement:</span>
                    <span className="font-medium">{metrics?.engagementScore || 0}/100</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Next Steps
                </h4>
                <div className="space-y-1 text-sm">
                  {metrics?.nextFollowUp && (
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Follow up due soon
                    </div>
                  )}
                  {contact.aiScore && contact.aiScore >= 70 && (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <Sparkles className="w-3 h-3 mr-1" />
                      High potential contact
                    </div>
                  )}
                  {metrics?.activityLevel === 'low' && (
                    <div className="flex items-center text-orange-600 dark:text-orange-400">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Needs re-engagement
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Click indicator */}
        <div className="mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">
            {contact.aiScore ? 'Click to view details • Hover for insights' : 'Click AI button to score • Click card for details'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const SmartContactCard = memo(SmartContactCardComponent);
SmartContactCard.displayName = 'SmartContactCard';