import React, { useState } from 'react';
import { ModernButton } from './ModernButton';
import { AIResearchButton } from './AIResearchButton';
import { ContactEnrichmentData } from '../../services/aiEnrichmentService';
import { 
  Wand2, 
  Brain, 
  Sparkles, 
  AlertCircle, 
  CheckCircle,
  Settings,
  ChevronDown,
  Mail,
  User,
  Globe
} from 'lucide-react';

interface AIAutoFillButtonProps {
  formData: any;
  onAutoFill: (data: ContactEnrichmentData) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AIAutoFillButton: React.FC<AIAutoFillButtonProps> = ({
  formData,
  onAutoFill,
  className = '',
  size = 'md'
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [autoFillMode, setAutoFillMode] = useState<'smart' | 'conservative' | 'aggressive'>('smart');

  const getSearchQuery = () => {
    return {
      email: formData.email || '',
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      company: formData.company || '',
      linkedinUrl: formData.socialProfiles?.linkedin || ''
    };
  };

  const handleAutoFill = (data: ContactEnrichmentData) => {
    // Apply different merge strategies based on mode
    let mergedData = { ...data };

    switch (autoFillMode) {
      case 'conservative':
        // Only fill empty fields
        Object.keys(mergedData).forEach(key => {
          const typedKey = key as keyof ContactEnrichmentData;
          if (formData[typedKey] && formData[typedKey] !== '') {
            delete mergedData[typedKey];
          }
        });
        break;

      case 'aggressive':
        // Replace all fields with AI data
        break;

      case 'smart':
      default:
        // Smart merge - keep user data for important fields, AI for others
        const keepUserData = ['email', 'firstName', 'lastName'];
        keepUserData.forEach(field => {
          if (formData[field] && formData[field] !== '') {
            delete mergedData[field as keyof ContactEnrichmentData];
          }
        });
        break;
    }

    onAutoFill(mergedData);
    setIsDropdownOpen(false);
  };

  const getAutoFillOptions = () => {
    const searchQuery = getSearchQuery();
    const options = [];

    // Always provide email option - it will use whatever email is available
    options.push({
      type: 'email' as const,
      label: 'Research by Email',
      icon: Mail,
      description: searchQuery.email ? `Find info for ${searchQuery.email}` : 'Enter an email to research'
    });

    // Always provide name option - it will use whatever name fields are available
    options.push({
      type: 'name' as const,
      label: 'Research by Name',
      icon: User,
      description: (searchQuery.firstName || searchQuery.lastName) ? 
        `Find info for ${searchQuery.firstName} ${searchQuery.lastName}`.trim() : 
        'Enter a name to research'
    });

    // Always provide LinkedIn option
    options.push({
      type: 'linkedin' as const,
      label: 'Research LinkedIn',
      icon: Globe,
      description: searchQuery.linkedinUrl ? 
        'Extract from LinkedIn profile' : 
        'Enter a LinkedIn URL to research'
    });

    // Always add auto option
    options.unshift({
      type: 'auto' as const,
      label: 'Smart Auto-Research',
      icon: Brain,
      description: 'AI chooses best research method'
    });

    return options;
  };

  const autoFillOptions = getAutoFillOptions();
  const hasMinimumData = formData.email || formData.firstName || formData.lastName || 
                         formData.company || formData.socialProfiles?.linkedin;

  return (
    <div className={`relative ${className}`}>
      {/* Main Auto-Fill Button */}
      <div className="flex items-center space-x-2">
        <ModernButton
          variant="primary"
          size={size}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={!hasMinimumData}
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Wand2 className="w-4 h-4" />
          <span>AI Auto-Fill</span>
          <Sparkles className="w-3 h-3 text-yellow-300" />
          <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </ModernButton>

        {/* Settings Button */}
        <ModernButton
          variant="outline"
          size={size}
          onClick={() => {
            // Toggle auto-fill mode
            const modes: Array<typeof autoFillMode> = ['smart', 'conservative', 'aggressive'];
            const currentIndex = modes.indexOf(autoFillMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            setAutoFillMode(nextMode);
          }}
          className="flex items-center space-x-1"
          title={`Mode: ${autoFillMode}`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs capitalize">{autoFillMode}</span>
        </ModernButton>
      </div>

      {!hasMinimumData && (
        <div className="mt-2 text-xs text-gray-500">
          Enter email, name, or LinkedIn URL to enable AI research
        </div>
      )}

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Brain className="w-4 h-4 mr-2 text-purple-600" />
              AI Contact Research
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Choose how to research and fill contact information
            </p>
          </div>

          {/* Auto-Fill Mode Indicator */}
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Fill Mode:</span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                autoFillMode === 'smart' ? 'bg-blue-100 text-blue-800' :
                autoFillMode === 'conservative' ? 'bg-green-100 text-green-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {autoFillMode.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {autoFillMode === 'smart' && 'Smart merge - keeps your data, fills missing fields'}
              {autoFillMode === 'conservative' && 'Only fill empty fields, preserve all existing data'}
              {autoFillMode === 'aggressive' && 'Replace all fields with AI research results'}
            </p>
          </div>

          {/* Research Options */}
          <div className="p-2">
            {autoFillOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <div key={index} className="mb-2">
                  <AIResearchButton
                    searchType={option.type}
                    searchQuery={getSearchQuery()}
                    onDataFound={handleAutoFill}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start p-3 hover:bg-gray-50 border-0 hover:border-gray-200"
                    showConfidence={false}
                    disabled={!hasMinimumData}
                  />
                  
                  {/* Option Description */}
                  <div className="ml-4 mt-1 mb-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {!hasMinimumData && (
              <div className="p-3 bg-blue-50 rounded-lg mb-2">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    Add basic information like an email or name to enable AI research
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-xs text-gray-600">Powered by OpenAI & Gemini</span>
              </div>
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};