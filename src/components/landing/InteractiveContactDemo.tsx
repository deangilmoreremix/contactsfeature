import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import {
  User,
  Brain,
  Sparkles,
  Search,
  Mail,
  Phone,
  MessageSquare,
  BarChart3,
  Loader2,
  CheckCircle,
  TrendingUp,
  Zap
} from 'lucide-react';

export const InteractiveContactDemo: React.FC = () => {
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
    phone: ''
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    score: number;
    insights: string[];
    recommendations: string[];
    enrichment: {
      linkedin?: string;
      industry?: string;
      companySize?: string;
    };
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setContactData(prev => ({ ...prev, [field]: value }));
    setAnalysis(null);
  };

  const analyzeContact = () => {
    setIsAnalyzing(true);

    // Simulate AI analysis
    setTimeout(() => {
      const score = Math.floor(Math.random() * 40) + 60; // 60-100

      const insights = [
        'High engagement potential based on job title and company size',
        'Recent activity suggests active decision-making process',
        'Strong fit for our target market segment',
        'Previous interactions show positive response patterns'
      ];

      const recommendations = [
        'Schedule discovery call within 48 hours',
        'Send personalized value proposition email',
        'Connect on LinkedIn with customized message',
        'Prepare industry-specific case studies'
      ];

      const enrichment = {
        linkedin: `https://linkedin.com/in/${contactData.name.toLowerCase().replace(' ', '')}`,
        industry: 'Technology',
        companySize: '500-1000 employees'
      };

      setAnalysis({
        score,
        insights,
        recommendations,
        enrichment
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  const canAnalyze = contactData.name && contactData.email && contactData.company;

  return (
    <GlassCard className="p-8">
      <div className="flex items-center justify-center mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl mr-3">
          <User className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">AI Contact Intelligence Demo</h3>
          <p className="text-gray-600">Experience real-time contact analysis and enrichment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={contactData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={contactData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john@company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company *
            </label>
            <input
              type="text"
              value={contactData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Acme Corporation"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title
            </label>
            <input
              type="text"
              value={contactData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="VP of Sales"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={contactData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+1-555-0123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <ModernButton
            variant="primary"
            onClick={analyzeContact}
            loading={isAnalyzing}
            disabled={!canAnalyze || isAnalyzing}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI Analyzing...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Analyze Contact</span>
              </>
            )}
          </ModernButton>
        </div>

        {/* Results Display */}
        <div className="space-y-6">
          {analysis ? (
            <>
              {/* AI Score */}
              <div className="text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold ${getScoreColor(analysis.score)}`}>
                  <BarChart3 className="w-5 h-5 mr-2" />
                  AI Score: {analysis.score}/100
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {analysis.score >= 80 ? 'Excellent lead potential' :
                   analysis.score >= 70 ? 'Good lead potential' :
                   'Moderate lead potential'}
                </p>
              </div>

              {/* AI Insights */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
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

              {/* Enrichment Data */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg border border-green-200">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Search className="w-5 h-5 mr-2 text-green-500" />
                  Enriched Data
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Industry:</span>
                    <span className="font-medium">{analysis.enrichment.industry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company Size:</span>
                    <span className="font-medium">{analysis.enrichment.companySize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">LinkedIn:</span>
                    <a href={analysis.enrichment.linkedin} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      View Profile
                    </a>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                  Next Steps
                </h5>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Zap className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <User className="w-16 h-16 text-gray-300 mb-4" />
              <h4 className="text-lg font-semibold text-gray-500 mb-2">Ready for Analysis</h4>
              <p className="text-gray-400 text-sm">
                Enter contact details and click "Analyze Contact" to see AI-powered insights and enrichment
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Demo Notice */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Interactive Demo</span>
        </div>
        <p className="text-sm text-blue-800 mt-1">
          This demo showcases our AI Contact Intelligence engine, which analyzes contact data, enriches profiles with web research,
          and provides actionable insights for sales and marketing teams.
        </p>
      </div>
    </GlassCard>
  );
};