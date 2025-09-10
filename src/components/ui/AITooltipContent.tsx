import React from 'react';

// Tooltip content for AI Research Button
export const ResearchTooltip: React.FC = () => (
  <div className="space-y-3">
    <div>
      <h4 className="font-semibold text-gray-900 text-sm">AI Contact Research</h4>
      <p className="text-gray-700 text-xs mt-1 leading-relaxed">
        Automatically research and enrich contact information using multiple AI sources and social platforms.
      </p>
    </div>

    <div>
      <h5 className="font-medium text-gray-800 text-xs mb-2">Supported Research Methods:</h5>
      <ul className="space-y-1">
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs">Email-based research</span>
        </li>
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs">Name and company lookup</span>
        </li>
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs">LinkedIn profile analysis</span>
        </li>
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs">Social media research</span>
        </li>
      </ul>
    </div>

    <div>
      <h5 className="font-medium text-gray-800 text-xs mb-1">Usage:</h5>
      <p className="text-gray-600 text-xs">Fill in contact details and click to see AI-enriched information with confidence scores.</p>
    </div>

    <div className="flex items-center space-x-2 pt-2 border-t border-gray-200/50">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-gray-500 text-xs">~3-5 seconds processing time</span>
    </div>
  </div>
);

// Tooltip content for AI Auto-Fill Button
export const AutoFillTooltip: React.FC = () => (
  <div className="space-y-3">
    <div>
      <h4 className="font-semibold text-gray-900 text-sm">Smart Auto-Fill</h4>
      <p className="text-gray-700 text-xs mt-1 leading-relaxed">
        Intelligently fill contact forms using AI research with customizable merge strategies.
      </p>
    </div>

    <div>
      <h5 className="font-medium text-gray-800 text-xs mb-2">Fill Modes:</h5>
      <ul className="space-y-1">
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs"><strong>Smart:</strong> Keeps your data, fills gaps</span>
        </li>
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs"><strong>Conservative:</strong> Only empty fields</span>
        </li>
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs"><strong>Aggressive:</strong> Replace all data</span>
        </li>
      </ul>
    </div>

    <div>
      <h5 className="font-medium text-gray-800 text-xs mb-1">Research Options:</h5>
      <p className="text-gray-600 text-xs">Choose from email, name, LinkedIn, or let AI auto-select the best method.</p>
    </div>

    <div className="flex items-center space-x-2 pt-2 border-t border-gray-200/50">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      <span className="text-gray-500 text-xs">Interactive dropdown with preview</span>
    </div>
  </div>
);

// Tooltip content for AI Toolbar
export const ToolbarTooltip: React.FC<{ toolName?: string }> = ({ toolName }) => {
  const getToolDescription = () => {
    switch (toolName) {
      case 'leadScoring':
        return {
          title: 'Lead Scoring',
          description: 'Calculate lead quality scores using AI analysis of contact data and behavior patterns.',
          features: ['Predictive scoring', 'Confidence metrics', 'Conversion probability']
        };
      case 'emailPersonalization':
        return {
          title: 'Email Personalization',
          description: 'Generate personalized email content based on contact research and communication history.',
          features: ['Context-aware content', 'Tone matching', 'Personalized subject lines']
        };
      case 'contactEnrichment':
        return {
          title: 'Contact Enrichment',
          description: 'Expand contact profiles with additional information from multiple data sources.',
          features: ['Social media data', 'Company insights', 'Contact verification']
        };
      case 'businessIntelligence':
        return {
          title: 'Business Intelligence',
          description: 'Analyze business relationships and opportunities using AI-powered insights.',
          features: ['Opportunity identification', 'Relationship mapping', 'Trend analysis']
        };
      default:
        return {
          title: 'AI Tools',
          description: 'Access various AI-powered tools for contact and business analysis.',
          features: ['Multiple AI operations', 'Real-time processing', 'Smart insights']
        };
    }
  };

  const tool = getToolDescription();

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-gray-900 text-sm">{tool.title}</h4>
        <p className="text-gray-700 text-xs mt-1 leading-relaxed">{tool.description}</p>
      </div>

      <div>
        <h5 className="font-medium text-gray-800 text-xs mb-2">Features:</h5>
        <ul className="space-y-1">
          {tool.features.map((feature, index) => (
            <li key={index} className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-600 text-xs">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center space-x-2 pt-2 border-t border-gray-200/50">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        <span className="text-gray-500 text-xs">Click to execute AI operation</span>
      </div>
    </div>
  );
};

// Tooltip content for AI Goals Button
export const GoalsTooltip: React.FC = () => (
  <div className="space-y-3">
    <div>
      <h4 className="font-semibold text-gray-900 text-sm">AI Goals & Objectives</h4>
      <p className="text-gray-700 text-xs mt-1 leading-relaxed">
        Access advanced AI goal-setting and objective management tools for strategic planning.
      </p>
    </div>

    <div>
      <h5 className="font-medium text-gray-800 text-xs mb-2">Capabilities:</h5>
      <ul className="space-y-1">
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs">Strategic goal planning</span>
        </li>
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs">Progress tracking</span>
        </li>
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs">AI-powered insights</span>
        </li>
        <li className="flex items-start space-x-2">
          <div className="w-1 h-1 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
          <span className="text-gray-600 text-xs">Performance analytics</span>
        </li>
      </ul>
    </div>

    <div>
      <h5 className="font-medium text-gray-800 text-xs mb-1">Usage:</h5>
      <p className="text-gray-600 text-xs">Opens dedicated AI goals management interface in new tab.</p>
    </div>

    <div className="flex items-center space-x-2 pt-2 border-t border-gray-200/50">
      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
      <span className="text-gray-500 text-xs">External application</span>
    </div>
  </div>
);

// Quick access tooltip for simple buttons
export const QuickTooltip: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="space-y-2">
    <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
    <p className="text-gray-700 text-xs leading-relaxed">{description}</p>
  </div>
);