import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { 
  Brain, 
  Sparkles, 
  User, 
  Building, 
  Mail, 
  TrendingUp, 
  Target, 
  CheckCircle,
  Loader2,
  Award
} from 'lucide-react';

export const InteractiveContactScorer: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    industry: '',
    interestLevel: 'medium',
    sources: ''
  });
  const [isScoring, setIsScoring] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [breakdown, setBreakdown] = useState<{fitScore: number, engagementScore: number, conversionProbability: number, urgencyScore: number} | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setScore(null);
    setInsights([]);
    setBreakdown(null);
  };

  const calculateScore = () => {
    setIsScoring(true);
    
    // Simulate AI processing
    setTimeout(() => {
      let calculatedScore = 50; // Base score
      
      // Score based on title
      if (formData.title.toLowerCase().includes('ceo') || formData.title.toLowerCase().includes('founder')) {
        calculatedScore += 25;
      } else if (formData.title.toLowerCase().includes('director') || formData.title.toLowerCase().includes('vp')) {
        calculatedScore += 15;
      } else if (formData.title.toLowerCase().includes('manager')) {
        calculatedScore += 10;
      }
      
      // Score based on interest level
      if (formData.interestLevel === 'hot') calculatedScore += 20;
      else if (formData.interestLevel === 'medium') calculatedScore += 10;
      else if (formData.interestLevel === 'cold') calculatedScore -= 10;
      
      // Score based on industry
      if (formData.industry === 'Technology') calculatedScore += 15;
      else if (formData.industry === 'Finance') calculatedScore += 10;
      
      // Score based on company
      if (formData.company.toLowerCase().includes('corp') || formData.company.toLowerCase().includes('inc')) {
        calculatedScore += 10;
      }
      
      // Score based on sources
      if (formData.sources.toLowerCase().includes('referral')) calculatedScore += 15;
      else if (formData.sources.toLowerCase().includes('linkedin')) calculatedScore += 10;
      
      calculatedScore = Math.max(0, Math.min(100, calculatedScore));
      
      // Generate breakdown scores
      const generatedBreakdown = {
        fitScore: Math.max(0, Math.min(100, calculatedScore + Math.random() * 20 - 10)),
        engagementScore: Math.max(0, Math.min(100, calculatedScore + Math.random() * 30 - 15)),
        conversionProbability: Math.max(0, Math.min(100, calculatedScore + Math.random() * 25 - 12)),
        urgencyScore: Math.max(0, Math.min(100, calculatedScore + Math.random() * 35 - 17))
      };
      
      // Generate insights
      const generatedInsights = [];
      if (calculatedScore >= 80) {
        generatedInsights.push('High conversion potential - prioritize immediate follow-up');
        generatedInsights.push('Decision-making authority detected');
        generatedInsights.push('Strong industry alignment');
        generatedInsights.push('Optimal engagement window identified');
      } else if (calculatedScore >= 60) {
        generatedInsights.push('Good engagement potential - schedule follow-up within 48 hours');
        generatedInsights.push('Moderate influence in decision process');
        generatedInsights.push('Consider personalized approach');
      } else {
        generatedInsights.push('Lower priority - consider nurturing campaign');
        generatedInsights.push('May require additional qualification');
        generatedInsights.push('Focus on relationship building');
      }
      
      setScore(calculatedScore);
      setInsights(generatedInsights);
      setBreakdown(generatedBreakdown);
      setIsScoring(false);
    }, 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const canScore = formData.name && formData.title && formData.company && formData.email;

  return (
    <GlassCard className="p-8">
      <div className="flex items-center justify-center mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-xl mr-3">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Interactive AI Contact Scorer</h3>
          <p className="text-gray-600">Enter contact information to see AI scoring in action</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Marketing Director"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company *
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Tech Corp Inc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john.smith@techcorp.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <select
              value={formData.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Industry</option>
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lead Sources
            </label>
            <input
              type="text"
              value={formData.sources}
              onChange={(e) => handleInputChange('sources', e.target.value)}
              placeholder="LinkedIn, Referral, Website"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple sources with commas</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interest Level
            </label>
            <select
              value={formData.interestLevel}
              onChange={(e) => handleInputChange('interestLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hot">Hot - Very Interested</option>
              <option value="medium">Medium - Some Interest</option>
              <option value="low">Low - Limited Interest</option>
              <option value="cold">Cold - No Interest</option>
            </select>
          </div>

          <ModernButton
            variant="primary"
            onClick={calculateScore}
            loading={isScoring}
            disabled={!canScore || isScoring}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600"
          >
            {isScoring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI is analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Score with AI</span>
              </>
            )}
          </ModernButton>
        </div>

        {/* Results Display */}
        <div className="space-y-6">
          {score !== null ? (
            <>
              {/* Score Display */}
              <div className="text-center">
                <div className={`w-24 h-24 rounded-full ${getScoreColor(score)} text-white flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <span className="text-2xl font-bold">{score}</span>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">AI Score: {score}/100</h4>
                <div className="flex items-center justify-center space-x-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <span className="text-gray-600">
                    {score >= 80 ? 'High Priority' : score >= 60 ? 'Medium Priority' : 'Low Priority'}
                  </span>
                </div>
              </div>

              {/* Insights */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                  AI Insights
                </h5>
                <div className="space-y-2">
                  {insights.map((insight, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h5 className="font-semibold text-green-900 mb-2">Recommended Actions:</h5>
                <div className="space-y-1">
                  {score >= 80 ? (
                    <>
                      <p className="text-sm text-green-800">• Schedule immediate follow-up call</p>
                      <p className="text-sm text-green-800">• Send personalized proposal</p>
                      <p className="text-sm text-green-800">• Connect on LinkedIn</p>
                    </>
                  ) : score >= 60 ? (
                    <>
                      <p className="text-sm text-green-800">• Send follow-up email within 48 hours</p>
                      <p className="text-sm text-green-800">• Share relevant case studies</p>
                      <p className="text-sm text-green-800">• Schedule discovery call</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-green-800">• Add to nurturing campaign</p>
                      <p className="text-sm text-green-800">• Research company updates</p>
                      <p className="text-sm text-green-800">• Reassess in 30 days</p>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Brain className="w-16 h-16 text-gray-300 mb-4" />
              <h4 className="text-lg font-semibold text-gray-500 mb-2">Ready to Score</h4>
              <p className="text-gray-400 text-sm">
                Fill in the contact information and click "Score with AI" to see the magic happen
              </p>
            </div>
          )}
        </div>
          {/* Score Breakdown */}
          {breakdown && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h5 className="font-semibold text-gray-900 mb-3">Score Breakdown</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{Math.round(breakdown.fitScore)}</div>
                  <div className="text-xs text-gray-600">Fit Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{Math.round(breakdown.engagementScore)}</div>
                  <div className="text-xs text-gray-600">Engagement</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{Math.round(breakdown.conversionProbability)}</div>
                  <div className="text-xs text-gray-600">Conversion</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{Math.round(breakdown.urgencyScore)}</div>
                  <div className="text-xs text-gray-600">Urgency</div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Demo Notice */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Interactive Demo</span>
        </div>
        <p className="text-sm text-blue-800 mt-1">
          This is a simplified version of our AI scoring engine. The real application uses advanced machine learning models from OpenAI and Google Gemini for even more accurate predictions, with detailed breakdown scores and confidence levels.
        </p>
      </div>
    </GlassCard>
  );
};