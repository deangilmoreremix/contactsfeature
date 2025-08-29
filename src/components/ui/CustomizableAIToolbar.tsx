import React, { useState } from 'react';
import { useContactAI, useCommunicationAI } from '../../contexts/AIContext';
import { 
  BarChart3, 
  Mail, 
  TrendingUp, 
  AlertTriangle, 
  Navigation, 
  FileText, 
  Send, 
  Calendar, 
  DollarSign, 
  Heart, 
  UserPlus, 
  Search, 
  BarChart, 
  Zap, 
  Clock, 
  GitBranch, 
  PenTool, 
  Video, 
  FileSearch, 
  Package, 
  Settings, 
  Plus,
  Brain,
  Target,
  Phone,
  Loader2,
  CheckCircle
} from 'lucide-react';

interface QuickAIButtonProps {
  icon: React.ComponentType<any>;
  label: string;
  toolName: string;
  entityType: string;
  entityId: string;
  entityData: any;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary';
  className?: string;
  onClick?: () => void;
}

interface CustomizableAIToolbarProps {
  entityType: string;
  entityId: string;
  entityData: any;
  location: string;
  layout: 'grid' | 'row';
  size: 'sm' | 'md';
  showCustomizeButton?: boolean;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  BarChart3,
  Mail,
  TrendingUp,
  AlertTriangle,
  Navigation,
  FileText,
  Send,
  Calendar,
  DollarSign,
  Heart,
  UserPlus,
  Search,
  BarChart,
  Zap,
  Clock,
  GitBranch,
  PenTool,
  Video,
  FileSearch,
  Package,
  Settings,
  Plus,
  Brain,
  Target,
  Phone
};

const toolMapping: Record<string, string> = {
  'leadScoring': 'business-analyzer',
  'emailPersonalization': 'email-composer', 
  'contactEnrichment': 'smart-search',
  'dealRiskAssessment': 'business-analyzer',
  'nextBestAction': 'business-analyzer',
  'proposalGeneration': 'proposal-generator',
  'businessIntelligence': 'smart-search',
  'companyHealthScoring': 'business-analyzer',
  'opportunityIdentification': 'business-analyzer'
};

const defaultQuickActions = [
  { icon: 'BarChart3', label: 'Lead Score', toolName: 'leadScoring', variant: 'primary' },
  { icon: 'Mail', label: 'Email AI', toolName: 'emailPersonalization', variant: 'secondary' },
  { icon: 'Search', label: 'Enrich', toolName: 'contactEnrichment', variant: 'secondary' },
  { icon: 'TrendingUp', label: 'Insights', toolName: 'businessIntelligence', variant: 'secondary' }
];

const QuickAIButton: React.FC<QuickAIButtonProps> = ({
  icon: IconComponent,
  label,
  toolName,
  entityType,
  entityId,
  entityData,
  size = 'sm',
  variant = 'secondary',
  className = '',
  onClick
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  
  // Connect to AI services based on entity type
  const contactAI = entityType === 'contact' ? useContactAI(entityId) : null;
  const communicationAI = useCommunicationAI();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      executeAITool();
    }
  };

  const executeAITool = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      let result;
      
      switch (toolName) {
        case 'leadScoring':
          if (contactAI) {
            result = await contactAI.scoreContact(entityData);
            setLastResult({ type: 'score', value: result.overall });
          }
          break;
          
        case 'emailPersonalization':
          result = await communicationAI.generateEmail(entityData, 'introduction');
          setLastResult({ type: 'email', value: 'Generated' });
          break;
          
        case 'contactEnrichment':
          if (contactAI) {
            result = await contactAI.enrichContact(entityData);
            setLastResult({ type: 'enrichment', value: 'Enhanced' });
          }
          break;
          
        case 'businessIntelligence':
          if (contactAI) {
            result = await contactAI.generateInsights(entityData, ['opportunity', 'prediction']);
            setLastResult({ type: 'insights', value: result.length });
          }
          break;
          
        default:
          console.log(`Executing ${toolName} for ${entityType} ${entityId}`);
      }
      
      // Clear result after 3 seconds
      setTimeout(() => setLastResult(null), 3000);
      
    } catch (error) {
      console.error(`AI tool execution failed for ${toolName}:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const sizeClasses = size === 'sm' ? 'p-2 text-xs' : 'p-3 text-sm';
  
  let variantClasses;
  if (lastResult) {
    variantClasses = 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200';
  } else if (isProcessing) {
    variantClasses = 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200';
  } else if (variant === 'primary') {
    variantClasses = 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700';
  } else {
    variantClasses = 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-900 hover:from-gray-100 hover:to-gray-200';
  }

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      className={`
        ${sizeClasses} ${variantClasses} ${className}
        flex flex-col items-center justify-center rounded-lg font-medium transition-all duration-200 
        border shadow-sm hover:shadow-md hover:scale-105 min-h-[3rem] disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'primary' ? 'border-blue-300/50' : 'border-gray-200/50'}
      `}
    >
      {isProcessing ? (
        <Loader2 size={size === 'sm' ? 12 : 16} className="mb-1 animate-spin" />
      ) : lastResult ? (
        <CheckCircle size={size === 'sm' ? 12 : 16} className="mb-1" />
      ) : (
        <IconComponent size={size === 'sm' ? 12 : 16} className="mb-1" />
      )}
      <span className="leading-tight text-center">
        {isProcessing ? 'Processing...' : lastResult ? 'Done!' : label}
      </span>
    </button>
  );
};

export const AIGoalsButton: React.FC<{
  entityType: string;
  entityId: string;
  entityData: any;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary';
  className?: string;
}> = ({ entityType, entityId, entityData, size = 'sm', variant = 'primary', className = '' }) => {
  return (
    <button
      className={`
        ${className}
        flex items-center justify-center py-2 px-3 
        bg-gradient-to-r from-indigo-500 to-purple-500 text-white 
        rounded-lg hover:from-indigo-600 hover:to-purple-600 
        ${size === 'sm' ? 'text-sm' : 'text-base'} font-medium 
        transition-all duration-200 border border-indigo-300/50 shadow-sm hover:shadow-md hover:scale-105
      `}
    >
      <Target size={size === 'sm' ? 14 : 16} className="mr-2" />
      AI Goals
    </button>
  );
};

// Helper function to get tooltip text for actions
const getTooltipForAction = (toolName: string): string => {
  const tooltips = {
    leadScoring: 'AI analyzes contact data to predict conversion likelihood and assign priority score',
    emailPersonalization: 'Generate personalized emails using AI based on contact profile and history',
    contactEnrichment: 'AI researches and fills missing contact information from multiple data sources',
    businessIntelligence: 'Advanced AI insights about contact behavior, preferences, and opportunities'
  };
  
  return tooltips[toolName as keyof typeof tooltips] || 'AI-powered tool for enhanced productivity';
};

export const CustomizableAIToolbar: React.FC<CustomizableAIToolbarProps> = ({
  entityType,
  entityId,
  entityData,
  location,
  layout,
  size,
  showCustomizeButton = true
}) => {
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [customQuickActions, setCustomQuickActions] = useState(defaultQuickActions);

  return (
    <div className="space-y-3">
      {/* AI Goals Button */}
      <Tooltip content="Access AI-powered business goals and automation suggestions" position="top">
      <AIGoalsButton
        entityType={entityType}
        entityId={entityId}
        entityData={entityData}
        size={size}
        variant="primary"
        className="w-full justify-center"
      />
      </Tooltip>

      {/* Quick AI Actions Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {customQuickActions.map((action, index) => {
          const IconComponent = iconMap[action.icon as keyof typeof iconMap];
          return (
            <Tooltip key={index} content={getTooltipForAction(action.toolName)} position="top">
            <QuickAIButton
              icon={IconComponent}
              label={action.label}
              toolName={action.toolName}
              entityType={entityType}
              entityId={entityId}
              entityData={entityData}
              size={size}
              variant={action.variant as 'primary' | 'secondary'}
              className="w-full justify-center text-center"
            />
            </Tooltip>
          );
        })}
      </div>

      {/* Customize Button */}
      {showCustomizeButton && (
        <div className="flex items-center justify-between">
          <Tooltip content="Add custom AI tools and automation goals tailored to your workflow" position="top">
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="flex-1 flex items-center justify-center py-2 px-3 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-lg hover:from-indigo-100 hover:to-purple-100 text-sm font-medium transition-all duration-200 border border-indigo-200/50 shadow-sm border-dashed mr-2"
          >
            <Plus size={14} className="mr-2" />
            Add Custom AI Goals
          </button>
          </Tooltip>
          <Tooltip content="Customize AI tools and arrange them according to your preferences" position="top">
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Customize buttons"
          >
            <Settings size={16} />
          </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
};