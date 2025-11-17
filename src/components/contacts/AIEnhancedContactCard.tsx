import React, { useState, useCallback, useEffect, memo } from 'react';
import { Contact } from '../../types';
import { useContactAI } from '../../hooks/useContactAI';
import { useContactActions } from '../../hooks/useContactActions';
import { useContactValidation } from '../../hooks/useContactValidation';
import { ContactAvatar } from './ContactAvatar';
import { ContactInfo } from './ContactInfo';
import { AIScoreBadge } from './AIScoreBadge';
import { ContactActions } from './ContactActions';
import { AIInsightsPreview } from './AIInsightsPreview';
import { ContactMetadata } from './ContactMetadata';
import { CustomizableAIToolbar } from '../ui/CustomizableAIToolbar';
import { AIErrorBoundary } from '../ui/ErrorBoundary';

interface AIEnhancedContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onEdit?: (contact: Contact) => void;
  onAnalyze?: (contact: Contact) => Promise<boolean>;
  isAnalyzing?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  density?: 'compact' | 'comfortable' | 'spacious';
  viewMode?: 'list' | 'grid';
}

const AIEnhancedContactCardComponent: React.FC<AIEnhancedContactCardProps> = memo(({
  contact,
  isSelected,
  onSelect,
  onClick,
  onEdit,
  onAnalyze,
  isAnalyzing = false,
  variant = 'default',
  density,
  viewMode
}) => {
  const [showActions, setShowActions] = useState(false);

  // Custom hooks for business logic
  const { aiScore, aiInsights, isAnalyzing: aiAnalyzing, error, scoreContact, clearError } = useContactAI(contact.id);
  const { handleExport, handleDuplicate, handleArchive, handleDelete } = useContactActions();
  const { validateContact } = useContactValidation();

  // Validate contact data on mount
  useEffect(() => {
    const validation = validateContact(contact);
    if (!validation.isValid) {
      console.warn('Invalid contact data:', validation.errors);
    }
  }, [contact, validateContact]);

  const analyzing = isAnalyzing || aiAnalyzing;

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    onClick();
  }, [onClick]);

  const handleAnalyze = useCallback(async () => {
    onAnalyze ? await onAnalyze(contact) : await scoreContact();
  }, [onAnalyze, contact, scoreContact]);

  const handleFeedback = useCallback((type: 'positive' | 'negative') => {
    console.log(`${type} AI feedback for contact:`, contact.id);
    // TODO: Implement feedback collection
  }, [contact.id]);

  const cardClassName = "bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 overflow-hidden text-gray-900 dark:text-gray-100 min-h-[280px] sm:min-h-[320px]";

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Allow keyboard navigation between cards
      e.preventDefault();
      const cards = document.querySelectorAll('[data-testid="contact-card"]');
      const currentIndex = Array.from(cards).indexOf(e.currentTarget as Element);
      let nextIndex = currentIndex;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = Math.min(currentIndex + 1, cards.length - 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = Math.max(currentIndex - 1, 0);
      }

      if (nextIndex !== currentIndex) {
        (cards[nextIndex] as HTMLElement).focus();
      }
    }
  }, [onClick]);

  return (
    <AIErrorBoundary>
      <div
        data-testid="contact-card"
        onClick={handleCardClick}
        className={cardClassName}
        role="button"
        tabIndex={0}
        aria-label={`Contact card for ${contact.name}. ${contact.title} at ${contact.company}. ${aiScore ? `AI Score: ${aiScore}` : 'Click to analyze with AI'}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowActions(true)}
        onBlur={() => setShowActions(false)}
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

        {/* Header Actions */}
        <div className="absolute top-4 right-4 z-10">
          {onEdit && (
            <ContactActions
              contact={contact}
              onEdit={onEdit}
              onExport={() => handleExport(contact)}
              onDuplicate={() => handleDuplicate(contact)}
              onArchive={() => handleArchive(contact)}
              onDelete={() => handleDelete(contact)}
              visible={showActions}
              variant="minimal"
            />
          )}
        </div>

        <div className="p-4 sm:p-6">
          {/* Avatar and AI Score Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 mt-4 gap-4 sm:gap-0">
            <div className="flex justify-center sm:justify-start">
              <ContactAvatar
                contact={contact}
                isAnalyzing={analyzing}
              />
            </div>
            <div className="flex justify-center sm:justify-end">
              <AIScoreBadge
                score={aiScore || undefined}
                onAnalyze={handleAnalyze}
                isAnalyzing={analyzing}
              />
            </div>
          </div>

          <ContactInfo contact={contact} />

          {/* Interest Level and Sources */}
          <ContactMetadata contact={contact} />

          {/* AI Insights Section */}
          {(aiScore || aiInsights) && variant !== 'compact' && (
            <AIInsightsPreview
              insights={aiInsights}
              score={aiScore}
              onPositiveFeedback={() => handleFeedback('positive')}
              onNegativeFeedback={() => handleFeedback('negative')}
            />
          )}

          {/* AI Tools Section */}
          {(aiScore || aiInsights) && variant === 'detailed' && (
            <div data-testid="ai-tools-section" className="mb-4">
              <CustomizableAIToolbar
                entityType="contact"
                entityId={contact.id}
                entityData={contact}
                location="contactCards"
                layout="grid"
                size="sm"
                showCustomizeButton={false}
              />
            </div>
          )}

          {/* Action Buttons */}
          {variant !== 'compact' && (
            <ContactActions
              contact={contact}
              onEmail={() => console.log('Email contact:', contact.id)}
              onCall={() => console.log('Call contact:', contact.id)}
              onView={onClick}
              variant="full"
            />
          )}

          {/* Click indicator */}
          <div className="mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">
              {aiScore ? 'Click to view details' : 'Click AI button to score • Click card for details'}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
              {error}
              <button
                onClick={(e) => { e.stopPropagation(); clearError(); }}
                className="ml-2 text-red-500 hover:text-red-700"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </AIErrorBoundary>
  );
});

export const AIEnhancedContactCard = AIEnhancedContactCardComponent;

AIEnhancedContactCard.displayName = 'AIEnhancedContactCard';

export default AIEnhancedContactCard;