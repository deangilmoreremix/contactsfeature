import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Search, Eye, TrendingUp, Zap, Target, BarChart3, Upload, Image as ImageIcon } from 'lucide-react';

interface FeatureAnalysis {
  productName: string;
  analysis: {
    summary: string;
    keyFeatures: Array<{
      name: string;
      description: string;
      competitiveAdvantage: string;
      marketPosition: string;
      adoptionRate: number;
    }>;
    competitiveLandscape: {
      directCompetitors: Array<{
        name: string;
        strengths: string[];
        weaknesses: string[];
        marketShare: number;
      }>;
      indirectCompetitors: string[];
      marketGaps: string[];
    };
    marketInsights: {
      totalAddressableMarket: string;
      serviceableAvailableMarket: string;
      serviceableObtainableMarket: string;
      growthRate: number;
      keyTrends: string[];
    };
    recommendations: Array<{
      type: 'feature' | 'pricing' | 'positioning' | 'go_to_market';
      priority: 'high' | 'medium' | 'low';
      recommendation: string;
      rationale: string;
      expectedImpact: string;
    }>;
  };
  visualAnalysis?: {
    screenshots: Array<{
      url: string;
      analysis: string;
      keyInsights: string[];
    }>;
    uiUxAssessment: {
      score: number;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    };
  };
}

interface FeatureAnalysisStudioProps {
  onAnalysisComplete?: (analysis: FeatureAnalysis) => void;
  onGenerateReport?: () => void;
  onCompareFeatures?: () => void;
}

export const FeatureAnalysisStudio: React.FC<FeatureAnalysisStudioProps> = ({
  onAnalysisComplete,
  onGenerateReport,
  onCompareFeatures
}) => {
  const [analysis, setAnalysis] = useState<FeatureAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'features' | 'competition' | 'market' | 'recommendations'>('overview');

  const analyzeProduct = async () => {
    if (!productUrl.trim()) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('feature-analysis', {
        body: {
          productUrl,
          includeVisualAnalysis: uploadedImages.length > 0,
          analysisDepth: 'comprehensive',
          competitorResearch: true,
          marketAnalysis: true
        }
      });

      if (response.data?.analysis) {
        const result = response.data.analysis;
        setAnalysis(result);
        onAnalysisComplete?.(result);
      }
    } catch (error) {
      console.error('Failed to analyze product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getMarketShareColor = (share: number) => {
    if (share >= 20) return 'text-green-600';
    if (share >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Search className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Feature Analysis Studio</h2>
            <p className="text-sm text-gray-600">AI-powered competitive intelligence and feature analysis</p>
          </div>
        </div>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={analyzeProduct}
          loading={loading}
          disabled={!productUrl.trim()}
        >
          {loading ? 'Analyzing...' : '🔍 Analyze'}
        </ModernButton>
      </div>

      {/* Input Section */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product URL or Description
          </label>
          <input
            type="text"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="Enter product website URL or detailed description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Screenshots (Optional)
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload Images</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {uploadedImages.length > 0 && (
              <span className="text-sm text-gray-600">
                {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} uploaded
              </span>
            )}
          </div>

          {uploadedImages.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {analysis && (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'features', label: 'Features', icon: Target },
              { id: 'competition', label: 'Competition', icon: TrendingUp },
              { id: 'market', label: 'Market', icon: Eye },
              { id: 'recommendations', label: 'Recommendations', icon: Zap }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center gap-2 flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  selectedTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {analysis.productName}
                </h3>
                <p className="text-gray-700">{analysis.analysis.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {analysis.analysis.keyFeatures.length}
                  </div>
                  <div className="text-sm text-gray-600">Key Features</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {analysis.analysis.competitiveLandscape.directCompetitors.length}
                  </div>
                  <div className="text-sm text-gray-600">Direct Competitors</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {Math.round(analysis.analysis.marketInsights.growthRate * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Market Growth</div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'features' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Key Features Analysis</h3>
              {analysis.analysis.keyFeatures.map((feature, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-md font-medium text-gray-900">{feature.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">
                        {Math.round(feature.adoptionRate * 100)}% adoption
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {feature.marketPosition}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-800">
                      <strong>Competitive Advantage:</strong> {feature.competitiveAdvantage}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'competition' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Direct Competitors</h3>
                <div className="space-y-4">
                  {analysis.analysis.competitiveLandscape.directCompetitors.map((competitor, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-medium text-gray-900">{competitor.name}</h4>
                        <div className={`text-sm font-medium ${getMarketShareColor(competitor.marketShare)}`}>
                          {competitor.marketShare}% market share
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium text-green-700 mb-2">Strengths</h5>
                          <ul className="space-y-1">
                            {competitor.strengths.map((strength, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-green-500 mt-1">•</span>
                                <span className="text-sm text-gray-700">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-red-700 mb-2">Weaknesses</h5>
                          <ul className="space-y-1">
                            {competitor.weaknesses.map((weakness, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                <span className="text-sm text-gray-700">{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Market Gaps</h3>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <ul className="space-y-2">
                    {analysis.analysis.competitiveLandscape.marketGaps.map((gap, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'market' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600 mb-1">
                    {analysis.analysis.marketInsights.totalAddressableMarket}
                  </div>
                  <div className="text-sm text-gray-600">Total Addressable Market</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600 mb-1">
                    {analysis.analysis.marketInsights.serviceableAvailableMarket}
                  </div>
                  <div className="text-sm text-gray-600">Serviceable Available Market</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600 mb-1">
                    {analysis.analysis.marketInsights.serviceableObtainableMarket}
                  </div>
                  <div className="text-sm text-gray-600">Serviceable Obtainable Market</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Key Market Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.analysis.marketInsights.keyTrends.map((trend, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{trend}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'recommendations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Strategic Recommendations</h3>
              {analysis.analysis.recommendations.map((rec, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {rec.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Expected Impact: {rec.expectedImpact}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-gray-900 font-medium">{rec.recommendation}</div>
                    <div className="text-sm text-gray-600">
                      <strong>Rationale:</strong> {rec.rationale}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <ModernButton
              variant="primary"
              onClick={onGenerateReport || (() => {})}
              className="flex-1"
            >
              📊 Generate Report
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={onCompareFeatures || (() => {})}
              className="flex-1"
            >
              ⚖️ Compare Features
            </ModernButton>
          </div>
        </>
      )}

      {!analysis && !loading && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analyze Product Features</h3>
          <p className="text-gray-600 mb-6">
            Enter a product URL or description to get comprehensive feature analysis, competitive intelligence, and strategic recommendations.
          </p>
          <div className="text-sm text-gray-500">
            💡 Tip: Upload screenshots for enhanced visual analysis
          </div>
        </div>
      )}
    </GlassCard>
  );
};
