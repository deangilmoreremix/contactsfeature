import React, { useState } from 'react';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { CustomizableAIToolbar } from '../ui/CustomizableAIToolbar';
import { Contact } from '../../types/contact';
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
  onAnalyze?: (contact: Contact) => Promise<boolean>;
  isAnalyzing?: boolean;
}

const interestColors = {
  hot: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  cold: 'bg-gray-400'
};

const interestLabels = {
  hot: 'Hot Client',
  medium: 'Medium Interest',
  low: 'Low Interest',
  cold: 'Non Interest'
};

const sourceColors: { [key: string]: string } = {
  'LinkedIn': 'bg-blue-600',
  'Facebook': 'bg-blue-500',
  'Email': 'bg-green-500',
  'Website': 'bg-purple-500',
  'Referral': 'bg-orange-500',
  'Typeform': 'bg-pink-500',
  'Cold Call': 'bg-gray-600'
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

export const AIEnhancedContactCard: React.FC<AIEnhancedContactCardProps> = ({
  contact,
  isSelected,
  onSelect,
  onClick,
  onAnalyze,
  isAnalyzing = false
}) => {
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [localAnalyzing, setLocalAnalyzing] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    onClick();
  };

  const handleAnalyzeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAnalyze || isAnalyzing || localAnalyzing) return;
    
    setLocalAnalyzing(true);
    try {
      await onAnalyze(contact);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLocalAnalyzing(false);
    }
  };

  const analyzing = isAnalyzing || localAnalyzing;

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative border border-gray-200 hover:border-gray-300 overflow-hidden"
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
        />
      </div>

      {/* Header Actions */}
      <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        {/* AI Analysis Button - Prominently Featured */}
        {onAnalyze && (
          <button 
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
          onClick={(e) => {
            e.stopPropagation();
            // Handle edit action
          }}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Edit className="w-3 h-3" />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            // Handle more actions
          }}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>

      <div className="p-6">
        {/* Avatar and AI Score Section */}
        <div className="flex items-start justify-between mb-4 mt-4">
          <div className="text-center flex-1">
            <div className="relative inline-block mb-3">
              <AvatarWithStatus
                src={contact.avatarSrc}
                alt={contact.name}
                size="lg"
                status={contact.status}
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
              <div className={`h-12 w-12 rounded-full ${getScoreColor(contact.aiScore)} text-white flex items-center justify-center font-bold text-lg shadow-lg ring-2 ring-white relative`}>
                {contact.aiScore}
                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-300" />
              </div>
            ) : (
              <button
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
          <div className={`w-2 h-2 rounded-full ${interestColors[contact.interestLevel]} animate-pulse`} />
          <span className="text-xs text-gray-600 font-medium">
            {interestLabels[contact.interestLevel]}
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
                  ${sourceColors[source] || 'bg-gray-600'} 
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
                    ? `${interestColors[contact.interestLevel]} shadow-lg` 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            );
          })}
        </div>

        {/* AI Insights Section */}
        {contact.aiScore && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <BarChart className="w-4 h-4 mr-2 text-blue-500" />
                AI Insights
              </h4>
              <div className="flex space-x-1">
                <button className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-700">
              {contact.aiScore >= 80 ? 'High conversion potential - prioritize for immediate follow-up.' :
               contact.aiScore >= 60 ? 'Good engagement potential - schedule follow-up within 48 hours.' :
               contact.aiScore >= 40 ? 'Moderate interest - nurture with valuable content.' :
               'Low engagement - consider re-qualification.'}
            </p>
            <div className="mt-2 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <span className="text-xs text-purple-700 font-medium">AI-powered analysis</span>
            </div>
          </div>
        )}

        {/* AI Tools Section */}
        {contact.aiScore && (
          <div className="mb-4">
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
            {contact.aiScore ? 'Click to view details' : 'Click AI button to score • Click card for details'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIEnhancedContactCard;