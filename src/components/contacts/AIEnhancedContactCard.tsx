import React, { useState, useCallback, useEffect } from 'react';
import { useContactAI } from '../../contexts/AIContext';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { CustomizableAIToolbar } from '../ui/CustomizableAIToolbar';
import { AIErrorBoundary } from '../ui/ErrorBoundary';
import { ContactCardSkeleton } from '../ui/LoadingSkeleton';
import { Contact } from '../../types';
import { useContactStore } from '../../store/contactStore';
import {
  AI_SCORE_COLORS,
  AI_SCORE_THRESHOLDS,
  INTEREST_LEVELS,
  INTEREST_COLORS,
  INTEREST_LABELS,
  SOURCE_COLORS,
  ERROR_MESSAGES
} from '../../utils/constants';
import { validateContactData, safeClipboardWrite, sanitizeString } from '../../utils/validation';
import {
  Edit,
  MoreHorizontal,
  Mail,
  Phone,
  User,
  BarChart,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Star,
  Brain,
  Loader2,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';

interface AIEnhancedContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onEdit?: (contact: Contact) => void;
  onAnalyze?: (contact: Contact) => Promise<boolean>;
  isAnalyzing?: boolean;
}

// Status mapping for AvatarWithStatus component
const getStatusForAvatar = (contactStatus: string): "active" | "pending" | "inactive" | "error" | "success" | "warning" => {
  switch (contactStatus) {
    case 'active':
    case 'customer':
      return 'active';
    case 'lead':
    case 'prospect':
      return 'pending';
    case 'inactive':
    case 'churned':
      return 'inactive';
    default:
      return 'pending';
  }
};

const getScoreColor = (score: number): string => {
  if (score >= AI_SCORE_THRESHOLDS.EXCELLENT) return AI_SCORE_COLORS.EXCELLENT;
  if (score >= AI_SCORE_THRESHOLDS.GOOD) return AI_SCORE_COLORS.GOOD;
  if (score >= AI_SCORE_THRESHOLDS.FAIR) return AI_SCORE_COLORS.FAIR;
  return AI_SCORE_COLORS.POOR;
};

export const AIEnhancedContactCard: React.FC<AIEnhancedContactCardProps> = React.memo(({
  contact,
  isSelected,
  onSelect,
  onClick,
  onEdit,
  onAnalyze,
  isAnalyzing = false
}) => {
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [localAnalyzing, setLocalAnalyzing] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to AI services
  const { scoreContact, generateInsights, contactScore, contactInsights, isContactProcessing } = useContactAI(contact.id);
  const { updateContact } = useContactStore();

  // Validate contact data on mount
  useEffect(() => {
    const validation = validateContactData(contact);
    if (!validation.isValid) {
      console.warn('Invalid contact data:', validation.errors);
    }
  }, [contact]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    onClick();
  }, [onClick]);

  const handleAnalyzeClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnalyzing || localAnalyzing || isContactProcessing) return;

    setLocalAnalyzing(true);
    setError(null);
    console.log('Starting AI analysis for contact:', contact.id);

    try {
      // Validate contact data before analysis
      const validation = validateContactData(contact);
      if (!validation.isValid) {
        throw new Error(`Invalid contact data: ${validation.errors.join(', ')}`);
      }

      // Check if this is demo/example data that should be protected
      const isDemoData = contact.isExample || contact.createdBy === 'demo' || contact.mockDataType === 'demo';

      if (isDemoData) {
        // Allow AI analysis for demo contacts with mock citation data
        // alert('This is a demo contact. AI analysis is disabled for demo data to preserve the demo experience.');
        // return;
      }

      // Check if this is mock data that should use real AI
      const isMockData = contact.isMockData || contact.dataSource === 'mock';
      const shouldUseRealAI = !isMockData || contact.dataSource === 'imported' || contact.createdBy === 'user';

      // Use the new AI services with mock data detection
      const score = await scoreContact(contact, { skipIfMock: true });
      const insights = await generateInsights(contact, ['opportunity', 'recommendation']);

      // Update the contact with AI score
      if (score?.overall) {
        await updateContact(contact.id, {
          aiScore: Math.round(score.overall),
          notes: contact.notes ?
            `${contact.notes}\n\nAI Analysis: ${sanitizeString(score.reasoning?.join('. ') || 'Analysis completed')}` :
            `AI Analysis: ${sanitizeString(score.reasoning?.join('. ') || 'Analysis completed')}`
        });
      }

      console.log('AI analysis completed:', { score, insights });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.AI_ANALYSIS_FAILED;
      console.error('AI analysis failed:', error);
      setError(errorMessage);
      // Show user-friendly error message
      alert(errorMessage);
    } finally {
      setLocalAnalyzing(false);
    }
  }, [isAnalyzing, localAnalyzing, isContactProcessing, contact, scoreContact, generateInsights, updateContact]);

  const analyzing = isAnalyzing || localAnalyzing || isContactProcessing;

  return (
    <AIErrorBoundary>
      <div
        data-testid="contact-card"
        onClick={handleCardClick}
        className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative border border-gray-200 hover:border-gray-300 overflow-hidden text-gray-900"
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

      {/* Header Actions */}
      <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        {/* AI Analysis Button - Prominently Featured */}
        {onAnalyze && (
          <button
            data-testid="ai-analyze-button"
            onClick={handleAnalyzeClick}
            disabled={analyzing}
            className={`p-2 rounded-lg transition-all duration-200 relative ${
              contact.aiScore
                ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg'
            }`}
            title={contact.aiScore ? 'Re-analyze with AI' : 'Analyze with AI'}
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            {!contact.aiScore && !analyzing && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            )}
          </button>
        )}
        
        <button
          data-testid="edit-contact-button"
          onClick={(e) => {
            e.stopPropagation();
            if (onEdit) {
              onEdit(contact);
            }
          }}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Edit contact"
        >
          <Edit className="w-3 h-3" />
        </button>
        <button
          data-testid="more-actions-button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMoreActions(!showMoreActions);
          }}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="More actions"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>

      {/* More Actions Dropdown */}
      {showMoreActions && (
        <div className="absolute top-16 right-4 z-20 bg-white border border-gray-200 rounded-lg shadow-xl min-w-48">
          <div className="py-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Export contact
                const contactData = JSON.stringify(contact, null, 2);
                const blob = new Blob([contactData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${contact.name.replace(/\s+/g, '_')}_contact.json`;
                a.click();
                URL.revokeObjectURL(url);
                setShowMoreActions(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Export Contact
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Duplicate contact
                if (window.confirm('Create a duplicate of this contact?')) {
                  // This would need to be implemented in the parent component
                  console.log('Duplicate contact:', contact.id);
                }
                setShowMoreActions(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Duplicate Contact
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Archive contact
                if (window.confirm('Archive this contact?')) {
                  console.log('Archive contact:', contact.id);
                }
                setShowMoreActions(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Archive Contact
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Delete contact
                if (window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
                  console.log('Delete contact:', contact.id);
                }
                setShowMoreActions(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete Contact
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Avatar and AI Score Section */}
        <div className="flex items-start justify-between mb-4 mt-4">
          <div className="text-center flex-1">
            <div className="relative inline-block mb-3">
              <AvatarWithStatus
                src={contact.avatarSrc}
                alt={contact.name}
                size="lg"
                status={getStatusForAvatar(contact.status)}
              />
              
              {/* Analysis Loading Indicator */}
              {analyzing && (
                <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <h3 className="text-gray-900 font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
              {contact.name}
            </h3>
            <p className="text-gray-600 text-sm">{contact.title}</p>
            <p className="text-gray-500 text-xs">{contact.company}</p>
          </div>
          
          {/* AI Score Display */}
          <div className="flex flex-col items-center space-y-2">
            {contact.aiScore ? (
              <div
                data-testid="ai-score-display"
                className={`h-12 w-12 rounded-full ${getScoreColor(contact.aiScore)} text-white flex items-center justify-center font-bold text-lg shadow-lg ring-2 ring-white relative`}
              >
                {contact.aiScore}
                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-300" />
              </div>
            ) : (
              <button
                data-testid="ai-score-button"
                onClick={handleAnalyzeClick}
                disabled={analyzing}
                className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-lg shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-110 relative"
                title="Click to get AI score"
              >
                {analyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Brain className="w-5 h-5" />
                )}
                {!analyzing && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse">
                    <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping"></div>
                  </div>
                )}
              </button>
            )}
            <span className="text-xs text-gray-500 font-medium">
              {contact.aiScore ? 'AI Score' : 'Click to Score'}
            </span>
          </div>
        </div>

        {/* Interest Level */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${INTEREST_COLORS[contact.interestLevel as keyof typeof INTEREST_COLORS] || INTEREST_COLORS.cold} animate-pulse`} />
          <span className="text-xs text-gray-600 font-medium">
            {INTEREST_LABELS[contact.interestLevel as keyof typeof INTEREST_LABELS] || INTEREST_LABELS.cold}
          </span>
        </div>

        {/* Sources */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2 text-center">Source</p>
          <div className="flex justify-center flex-wrap gap-1">
            {contact.sources.map((source, index) => (
              <span
                key={index}
                className={`
                  ${SOURCE_COLORS[source as keyof typeof SOURCE_COLORS] || 'bg-gray-600'}
                  text-white text-xs px-2 py-1 rounded-md font-medium hover:scale-110 transition-transform cursor-pointer
                `}
              >
                {source}
              </span>
            ))}
          </div>
        </div>

        {/* Interest Level Dots */}
        <div className="flex items-center justify-center space-x-1 mb-4">
          {Array.from({ length: 5 }, (_, i) => {
            const isActive = 
              (contact.interestLevel === 'hot' && i < 5) ||
              (contact.interestLevel === 'medium' && i < 3) ||
              (contact.interestLevel === 'low' && i < 2) ||
              (contact.interestLevel === 'cold' && i < 1);
            
            return (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? `${INTEREST_COLORS[contact.interestLevel as keyof typeof INTEREST_COLORS] || INTEREST_COLORS.cold} shadow-lg`
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            );
          })}
        </div>

        {/* AI Insights Section */}
        {(contact.aiScore || contactScore) && (
          <div data-testid="ai-insights-section" className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <BarChart className="w-4 h-4 mr-2 text-blue-500" />
                AI Insights
              </h4>
              <div className="flex space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Positive AI feedback
                    console.log('Positive AI feedback for contact:', contact.id);
                    // Could send feedback to improve AI model
                  }}
                  className="p-1 bg-gray-100 hover:bg-green-100 hover:text-green-600 rounded text-gray-600 transition-colors"
                  title="Good AI analysis"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Negative AI feedback
                    console.log('Negative AI feedback for contact:', contact.id);
                    // Could send feedback to improve AI model
                  }}
                  className="p-1 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded text-gray-600 transition-colors"
                  title="Poor AI analysis"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-900">
              {(() => {
                const score = contact.aiScore || contactScore?.overall || 0;
                if (score >= 80) return 'High conversion potential - prioritize for immediate follow-up.';
                if (score >= 60) return 'Good engagement potential - schedule follow-up within 48 hours.';
                if (score >= 40) return 'Moderate interest - nurture with valuable content.';
                return 'Low engagement - consider re-qualification.';
              })()}
            </p>
            {contactInsights && contactInsights.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-blue-700 font-medium">Latest AI Insights:</p>
                <ul className="text-xs text-gray-700 mt-1">
                  {contactInsights.slice(0, 2).map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-1">•</span>
                      <span>{insight.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-2 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <span className="text-xs text-purple-700 font-medium">AI-powered analysis</span>
            </div>
          </div>
        )}

        {/* AI Tools Section */}
        {(contact.aiScore || contactScore) && (
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

        {/* Traditional Action Buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Handle email action
            }}
            className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full hover:from-blue-100 hover:to-blue-200 text-xs font-medium transition-all duration-200 border border-blue-200/50 shadow-sm"
          >
            <Mail className="w-3 h-3 mr-1" /> Email
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Handle call action
            }}
            className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-full hover:from-green-100 hover:to-green-200 text-xs font-medium transition-all duration-200 border border-green-200/50 shadow-sm"
          >
            <Phone className="w-3 h-3 mr-1" /> Call
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-full hover:from-purple-100 hover:to-purple-200 text-xs font-medium transition-all duration-200 border border-purple-200/50 shadow-sm"
          >
            <User className="w-3 h-3 mr-1" /> View
          </button>
        </div>

        {/* Click indicator */}
        <div className="mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-xs text-blue-500 font-medium">
            {(contact.aiScore || contactScore) ? 'Click to view details' : 'Click AI button to score • Click card for details'}
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}
      </div>
    </AIErrorBoundary>
  );
});

AIEnhancedContactCard.displayName = 'AIEnhancedContactCard';

export default AIEnhancedContactCard;