import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import {
  TrendingUp,
  Sparkles,
  Target,
  Users,
  BarChart3,
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

export const InteractiveAISalesIntelligence: React.FC = () => {
  const [dealData, setDealData] = useState({
    company: '',
    dealValue: '',
    stage: 'prospecting',
    lastActivity: '',
    competitorActivity: '',
    marketConditions: ''
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    healthScore: number;
    riskLevel: string;
    nextActions: string[];
    insights: string[];
    forecast: { probability: number; expectedClose: string; confidence: number };
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setDealData(prev => ({ ...prev, [field]: value }));
    setAnalysis(null);
  };

  const analyzeDeal = () => {
    setIsAnalyzing(true);

    // Simulate AI analysis
    setTimeout(() => {
      const healthScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const riskLevel = healthScore >= 80 ? 'Low' : healthScore >= 70 ? 'Medium' : 'High';

      const nextActions = [
        'Schedule stakeholder alignment meeting',
        'Prepare competitive analysis presentation',
        'Develop risk mitigation strategy',
        'Update forecast with latest market data'
      ];

      const insights = [
        'Competitor activity indicates increased market pressure',
        'Customer engagement metrics show strong interest signals',
        'Market conditions favor accelerated timeline',
        'Internal alignment needed for final approval process'
      ];

      const forecast = {
        probability: Math.floor(Math.random() * 30) + 70, // 70-100%
        expectedClose: 'Q2 2024',
        confidence: Math.floor(Math.random() * 20) + 80 // 80-100%
      };

      setAnalysis({
        healthScore,
        riskLevel,
        nextActions,
        insights,
        forecast
      });
      setIsAnalyzing(false);
    }, 2500);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const canAnalyze = dealData.company && dealData.dealValue && dealData.stage;

  return (
    <GlassCard className="p-8">
      <div className="flex items-center justify-center mb-6">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-xl mr-3">
          <TrendingUp className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">AI Sales Intelligence Demo</h3>
          <p className="text-gray-600">Experience real-time deal analysis and predictive insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={dealData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Acme Corporation"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deal Value *
            </label>
            <input
              type="text"
              value={dealData.dealValue}
              onChange={(e) => handleInputChange('dealValue', e.target.value)}
              placeholder="$250,000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Stage *
            </label>
            <select
              value={dealData.stage}
              onChange={(e) => handleInputChange('stage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="prospecting">Prospecting</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closing">Closing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Activity
            </label>
            <input
              type="text"
              value={dealData.lastActivity}
              onChange={(e) => handleInputChange('lastActivity', e.target.value)}
              placeholder="Demo call completed 3 days ago"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Competitor Activity
            </label>
            <input
              type="text"
              value={dealData.competitorActivity}
              onChange={(e) => handleInputChange('competitorActivity', e.target.value)}
              placeholder="Competitor X presenting next week"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Market Conditions
            </label>
            <input
              type="text"
              value={dealData.marketConditions}
              onChange={(e) => handleInputChange('marketConditions', e.target.value)}
              placeholder="Economic uncertainty, budget freezes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <ModernButton
            variant="primary"
            onClick={analyzeDeal}
            loading={isAnalyzing}
            disabled={!canAnalyze || isAnalyzing}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI Analyzing Deal...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze with AI</span>
              </>
            )}
          </ModernButton>
        </div>

        {/* Results Display */}
        <div className="space-y-6">
          {analysis ? (
            <>
              {/* Health Score */}
              <div className="text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold ${getHealthColor(analysis.healthScore)}`}>
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Health Score: {analysis.healthScore}/100
                </div>
                <div className="mt-2 flex items-center justify-center space-x-2">
                  <AlertTriangle className={`w-5 h-5 ${analysis.riskLevel === 'Low' ? 'text-green-500' : analysis.riskLevel === 'Medium' ? 'text-yellow-500' : 'text-red-500'}`} />
                  <span className="text-gray-600">Risk Level: {analysis.riskLevel}</span>
                </div>
              </div>

              {/* Forecast */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-500" />
                  Deal Forecast
                </h5>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-blue-600">{analysis.forecast.probability}%</div>
                    <div className="text-xs text-gray-600">Win Probability</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-600">{analysis.forecast.expectedClose}</div>
                    <div className="text-xs text-gray-600">Expected Close</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600">{analysis.forecast.confidence}%</div>
                    <div className="text-xs text-gray-600">Confidence</div>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-purple-500" />
                  AI Insights
                </h5>
                <div className="space-y-2">
                  {analysis.insights.map((insight, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Actions */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h5 className="font-semibold text-green-900 mb-2 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Recommended Actions:
                </h5>
                <div className="space-y-1">
                  {analysis.nextActions.map((action, index) => (
                    <p key={index} className="text-sm text-green-800">• {action}</p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mb-4" />
              <h4 className="text-lg font-semibold text-gray-500 mb-2">Ready for Analysis</h4>
              <p className="text-gray-400 text-sm">
                Enter deal details and click "Analyze with AI" to see predictive insights and recommendations
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Demo Notice */}
      <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-900">Interactive Demo</span>
        </div>
        <p className="text-sm text-emerald-800 mt-1">
          This demo showcases our AI Sales Intelligence engine, which analyzes thousands of data points including market trends, competitor activity, customer behavior, and internal metrics to provide actionable insights.
        </p>
      </div>
    </GlassCard>
  );
};