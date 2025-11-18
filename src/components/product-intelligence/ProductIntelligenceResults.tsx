import React, { useState, memo } from 'react';
import {
  Building,
  Package,
  Users,
  TrendingUp,
  DollarSign,
  Target,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Download,
  Share,
  Zap,
  BarChart3,
  Globe,
  FileText,
  Mail,
  Phone,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { AnalysisResults, GeneratedContent } from '../../types/productIntelligence';
import { ModernButton } from '../ui/ModernButton';
import { GlassCard } from '../ui/GlassCard';

interface ProductIntelligenceResultsProps {
  analysis: AnalysisResults;
  generatedContent?: GeneratedContent;
  onGenerateContent?: () => void;
  onCreateCRMRecords?: () => void;
  onExportReport?: () => void;
  isGeneratingContent?: boolean;
  isCreatingCRM?: boolean;
}

export const ProductIntelligenceResults: React.FC<ProductIntelligenceResultsProps> = memo(({
  analysis,
  generatedContent,
  onGenerateContent,
  onCreateCRMRecords,
  onExportReport,
  isGeneratingContent = false,
  isCreatingCRM = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'company', label: 'Company', icon: Building },
    { id: 'product', label: 'Product', icon: Package },
    { id: 'market', label: 'Market', icon: TrendingUp },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'content', label: 'Generated Content', icon: Zap }
  ];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Product Intelligence Results</h2>
          <p className="text-gray-600 mt-1">
            Analysis completed on {analysis.timestamp.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${getConfidenceColor(analysis.confidence)}`}>
            {getConfidenceIcon(analysis.confidence)}
            <span>{analysis.confidence}% Confidence</span>
          </div>
          <ModernButton
            variant="outline"
            onClick={onExportReport}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </ModernButton>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {onGenerateContent && (
          <ModernButton
            onClick={onGenerateContent}
            loading={isGeneratingContent}
            className="flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>Generate Sales Content</span>
          </ModernButton>
        )}

        {generatedContent && onCreateCRMRecords && (
          <ModernButton
            onClick={onCreateCRMRecords}
            loading={isCreatingCRM}
            variant="primary"
            className="flex items-center space-x-2"
          >
            <Target className="w-4 h-4" />
            <span>Create CRM Records</span>
          </ModernButton>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Insights */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                Key Insights
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{analysis.company.name}</strong> is a {analysis.company.size} company in the {analysis.company.industry} sector
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>{analysis.product.name}</strong> targets {analysis.product.targetMarket} with pricing starting at ${analysis.product.pricing.ranges.min}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">
                    Market size: {analysis.market.size} with {analysis.market.growth} growth rate
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Quick Stats */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{analysis.contacts.length}</div>
                  <div className="text-sm text-gray-600">Contacts Found</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{analysis.sources.length}</div>
                  <div className="text-sm text-gray-600">Data Sources</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{analysis.product.features.length}</div>
                  <div className="text-sm text-gray-600">Product Features</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{analysis.market.competitors.length}</div>
                  <div className="text-sm text-gray-600">Competitors</div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'company' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Company Name</label>
                  <p className="text-gray-900">{analysis.company.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Industry</label>
                  <p className="text-gray-900">{analysis.company.industry}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Size</label>
                  <p className="text-gray-900">{analysis.company.size}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <p className="text-gray-900">{analysis.company.location}</p>
                </div>
                {analysis.company.website && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Website</label>
                    <a href={analysis.company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {analysis.company.website}
                    </a>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-700 leading-relaxed">{analysis.company.description}</p>

              {Object.keys(analysis.company.socialProfiles).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Social Profiles</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analysis.company.socialProfiles).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                      >
                        {platform}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {activeTab === 'product' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Overview</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Product Name</label>
                  <p className="text-gray-900">{analysis.product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <p className="text-gray-900">{analysis.product.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Target Market</label>
                  <p className="text-gray-900">{analysis.product.targetMarket}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pricing Model</label>
                  <p className="text-gray-900 capitalize">{analysis.product.pricing.model}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Price Range</label>
                  <p className="text-gray-900">
                    ${analysis.product.pricing.ranges.min} - ${analysis.product.pricing.ranges.max} {analysis.product.pricing.ranges.currency}
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Features & Advantages</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features</h4>
                  <ul className="space-y-1">
                    {analysis.product.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Competitive Advantages</h4>
                  <ul className="space-y-1">
                    {analysis.product.competitiveAdvantages.map((advantage, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <Target className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                        {advantage}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'market' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Analysis</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Market Size</label>
                  <p className="text-gray-900">{analysis.market.size}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Growth Rate</label>
                  <p className="text-gray-900">{analysis.market.growth}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Trends</label>
                  <ul className="space-y-1 mt-1">
                    {analysis.market.trends.map((trend, index) => (
                      <li key={index} className="text-sm text-gray-600">• {trend}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Opportunities & Threats</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2">Opportunities</h4>
                  <ul className="space-y-1">
                    {analysis.market.opportunities.map((opportunity, index) => (
                      <li key={index} className="text-sm text-gray-600">• {opportunity}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-red-700 mb-2">Threats</h4>
                  <ul className="space-y-1">
                    {analysis.market.threats.map((threat, index) => (
                      <li key={index} className="text-sm text-gray-600">• {threat}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Key Contacts Identified</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.contacts.map((contact, index) => (
                <GlassCard key={index} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{contact.name}</h4>
                      <p className="text-sm text-gray-600">{contact.title}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(contact.confidence)}`}>
                      {contact.confidence}%
                    </div>
                  </div>

                  <div className="space-y-2">
                    {contact.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {contact.phone}
                      </div>
                    )}
                    {contact.linkedin && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Globe className="w-4 h-4 mr-2" />
                        LinkedIn
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      contact.role === 'decision-maker' ? 'bg-red-100 text-red-800' :
                      contact.role === 'influencer' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {contact.role.replace('-', ' ')}
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
              <div className="space-y-4">
                {analysis.financial.revenue && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Revenue</label>
                    <p className="text-gray-900">{analysis.financial.revenue}</p>
                  </div>
                )}
                {analysis.financial.funding && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Funding</label>
                    <p className="text-gray-900">{analysis.financial.funding}</p>
                  </div>
                )}
                {analysis.financial.valuation && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Valuation</label>
                    <p className="text-gray-900">{analysis.financial.valuation}</p>
                  </div>
                )}
                {analysis.financial.profitability && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Profitability</label>
                    <p className="text-gray-900">{analysis.financial.profitability}</p>
                  </div>
                )}
              </div>
            </GlassCard>

            {analysis.financial.growthMetrics && (
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Metrics</h3>
                <div className="space-y-4">
                  {analysis.financial.growthMetrics.revenue && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Revenue Growth</label>
                      <p className="text-gray-900">{analysis.financial.growthMetrics.revenue}</p>
                    </div>
                  )}
                  {analysis.financial.growthMetrics.users && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">User Growth</label>
                      <p className="text-gray-900">{analysis.financial.growthMetrics.users}</p>
                    </div>
                  )}
                  {analysis.financial.growthMetrics.marketShare && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Market Share</label>
                      <p className="text-gray-900">{analysis.financial.growthMetrics.marketShare}</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === 'content' && generatedContent && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard className="p-4 text-center">
                <Mail className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{generatedContent.emails.length}</div>
                <div className="text-sm text-gray-600">Emails Generated</div>
              </GlassCard>

              <GlassCard className="p-4 text-center">
                <Phone className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{generatedContent.callScripts.length}</div>
                <div className="text-sm text-gray-600">Call Scripts</div>
              </GlassCard>

              <GlassCard className="p-4 text-center">
                <MessageSquare className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{generatedContent.smsMessages.length}</div>
                <div className="text-sm text-gray-600">SMS Messages</div>
              </GlassCard>

              <GlassCard className="p-4 text-center">
                <FileText className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">1</div>
                <div className="text-sm text-gray-600">Sales Playbook</div>
              </GlassCard>
            </div>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Content Preview</h3>
              <div className="space-y-4">
                {generatedContent.emails.length > 0 && generatedContent.emails[0] && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Sample Email</h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">{generatedContent.emails[0].subject}</div>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-3">
                        {generatedContent.emails[0].body?.substring(0, 150)}...
                      </div>
                    </div>
                  </div>
                )}

                {generatedContent.callScripts.length > 0 && generatedContent.callScripts[0] && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Sample Call Script</h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">{generatedContent.callScripts[0].name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {generatedContent.callScripts[0].steps?.[0]}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
});