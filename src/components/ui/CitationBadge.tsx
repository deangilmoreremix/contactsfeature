import React, { useState } from 'react';
import { ExternalLink, Info, Globe, Newspaper, Building, Users, TrendingUp, Calendar } from 'lucide-react';

interface CitationSource {
  url: string;
  title: string;
  domain: string;
  type: 'news' | 'company' | 'social' | 'industry' | 'academic' | 'government';
  confidence: number;
  timestamp: Date;
  snippet?: string;
}

interface CitationBadgeProps {
  sources: CitationSource[];
  size?: 'xs' | 'sm' | 'md';
  showTooltip?: boolean;
  maxDisplay?: number;
  className?: string;
}

const sourceTypeConfig = {
  news: {
    icon: Newspaper,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'News'
  },
  company: {
    icon: Building,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Company'
  },
  social: {
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Social'
  },
  industry: {
    icon: TrendingUp,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Industry'
  },
  academic: {
    icon: Globe,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    label: 'Academic'
  },
  government: {
    icon: Building,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Government'
  }
};

export const CitationBadge: React.FC<CitationBadgeProps> = ({
  sources,
  size = 'sm',
  showTooltip = true,
  maxDisplay = 3,
  className = ''
}) => {
  const [showTooltipContent, setShowTooltipContent] = useState(false);

  if (!sources || sources.length === 0) return null;

  const displaySources = sources.slice(0, maxDisplay);
  const remainingCount = sources.length - maxDisplay;

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5'
  };

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      {/* Citation Icons */}
      {displaySources.map((source, index) => {
        const config = sourceTypeConfig[source.type];
        const Icon = config.icon;

        return (
          <div
            key={index}
            className={`
              relative inline-flex items-center space-x-1
              ${config.bgColor} ${config.borderColor} border rounded-full
              ${sizeClasses[size]} cursor-pointer
              hover:shadow-sm transition-all duration-200
              group
            `}
            onClick={() => window.open(source.url, '_blank')}
            title={`View source: ${source.title}`}
          >
            <Icon className={`${iconSizes[size]} ${config.color} flex-shrink-0`} />

            {/* Confidence indicator */}
            <div className="flex items-center space-x-0.5">
              <div className={`
                w-1 h-1 rounded-full
                ${source.confidence >= 80 ? 'bg-green-500' :
                  source.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
              `} />
              <span className={`font-medium ${config.color}`}>
                {index + 1}
              </span>
            </div>

            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                  <div className="font-medium">{source.title}</div>
                  <div className="text-gray-300">{source.domain}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {source.confidence}% confidence • {source.timestamp.toLocaleDateString()}
                  </div>
                  {source.snippet && (
                    <div className="text-gray-300 text-xs mt-1 max-w-xs truncate">
                      {source.snippet}
                    </div>
                  )}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Remaining count indicator */}
      {remainingCount > 0 && (
        <div className={`
          inline-flex items-center space-x-1
          bg-gray-50 border border-gray-200 rounded-full
          ${sizeClasses[size]} cursor-pointer
          hover:bg-gray-100 transition-colors
        `}>
          <span className="text-gray-600 font-medium">+{remainingCount}</span>
        </div>
      )}

      {/* Info button for detailed view */}
      {showTooltip && sources.length > 1 && (
        <button
          onClick={() => setShowTooltipContent(!showTooltipContent)}
          className={`
            inline-flex items-center justify-center
            bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full
            ${size === 'xs' ? 'w-4 h-4' : size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'}
            transition-colors
          `}
          title="View all citations"
        >
          <Info className={`${iconSizes[size]} text-gray-600`} />
        </button>
      )}

      {/* Detailed citations modal/popup */}
      {showTooltipContent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Research Sources</h3>
                <button
                  onClick={() => setShowTooltipContent(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {sources.map((source, index) => {
                  const config = sourceTypeConfig[source.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => window.open(source.url, '_blank')}
                    >
                      <div className={`${config.bgColor} p-2 rounded-lg`}>
                        <Icon className="w-4 h-4 text-current" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {source.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                            {config.label}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-sm text-gray-600 mb-2">
                          <span>{source.domain}</span>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{source.timestamp.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className={`
                              w-2 h-2 rounded-full
                              ${source.confidence >= 80 ? 'bg-green-500' :
                                source.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
                            `} />
                            <span>{source.confidence}% confidence</span>
                          </div>
                        </div>

                        {source.snippet && (
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {source.snippet}
                          </p>
                        )}
                      </div>

                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Citation summary component for displaying citation statistics
export const CitationSummary: React.FC<{
  sources: CitationSource[];
  className?: string;
}> = ({ sources, className = '' }) => {
  if (!sources || sources.length === 0) return null;

  const sourceTypes = sources.reduce((acc, source) => {
    acc[source.type] = (acc[source.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgConfidence = sources.reduce((sum, source) => sum + source.confidence, 0) / sources.length;

  return (
    <div className={`flex items-center space-x-4 text-sm text-gray-600 ${className}`}>
      <div className="flex items-center space-x-1">
        <Globe className="w-4 h-4" />
        <span>{sources.length} sources</span>
      </div>

      <div className="flex items-center space-x-2">
        {Object.entries(sourceTypes).map(([type, count]) => {
          const config = sourceTypeConfig[type as keyof typeof sourceTypeConfig];
          const Icon = config.icon;
          return (
            <div key={type} className="flex items-center space-x-1">
              <Icon className="w-3 h-3 text-current" />
              <span>{count}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center space-x-1">
        <div className={`
          w-2 h-2 rounded-full
          ${avgConfidence >= 80 ? 'bg-green-500' :
            avgConfidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
        `} />
        <span>{Math.round(avgConfidence)}% avg confidence</span>
      </div>
    </div>
  );
};