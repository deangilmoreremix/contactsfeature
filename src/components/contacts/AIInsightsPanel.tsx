import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Clock, 
  DollarSign, 
  Users, 
  BarChart3,
  Lightbulb,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Star,
  Zap,
  Eye,
  CheckCircle
} from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'prediction' | 'recommendation' | 'risk' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  actionable: boolean;
  suggestedActions?: string[];
}

interface AIInsightsPanelProps {
  contact: Contact;
}

const insightIcons = {
  prediction: TrendingUp,
  recommendation: Lightbulb,
  risk: AlertTriangle,
  opportunity: Target
};

const insightColors = {
  prediction: 'bg-blue-500',
  recommendation: 'bg-green-500',
  risk: 'bg-red-500',
  opportunity: 'bg-purple-500'
};

const impactColors = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-green-600 bg-green-50'
};

// Sample AI insights
const generateInsights = (contact: Contact): AIInsight[] => [
  {
    id: '1',
    type: 'prediction',
    title: 'High Conversion Probability',
    description: `Based on ${contact.name}'s engagement pattern and profile, there's an 85% likelihood of conversion within the next 30 days.`,
    confidence: 85,
    impact: 'high',
    category: 'Sales Forecast',
    actionable: true,
    suggestedActions: [
      'Schedule a follow-up call within 48 hours',
      'Send personalized proposal with case studies',
      'Offer a limited-time discount'
    ]
  },
  {
    id: '2',
    type: 'opportunity',
    title: 'Upsell Potential Identified',
    description: `${contact.company} shows characteristics similar to clients who upgraded to enterprise plans. Potential additional revenue: $45K.`,
    confidence: 72,
    impact: 'high',
    category: 'Revenue Growth',
    actionable: true,
    suggestedActions: [
      'Present enterprise features comparison',
      'Share ROI calculator for enterprise features',
      'Connect with decision makers'
    ]
  },
  {
    id: '3',
    type: 'recommendation',
    title: 'Optimal Contact Time',
    description: `AI analysis suggests ${contact.name} is most responsive on Tuesdays and Thursdays between 2-4 PM.`,
    confidence: 78,
    impact: 'medium',
    category: 'Communication Strategy',
    actionable: true,
    suggestedActions: [
      'Schedule calls during optimal time windows',
      'Set automated follow-up reminders',
      'Adjust email send times'
    ]
  },
  {
    id: '4',
    type: 'risk',
    title: 'Competitor Activity Detected',
    description: `Recent LinkedIn activity suggests ${contact.name} may be evaluating competitor solutions. Immediate action recommended.`,
    confidence: 65,
    impact: 'high',
    category: 'Competitive Intelligence',
    actionable: true,
    suggestedActions: [
      'Schedule urgent competitive differentiation call',
      'Send comparison document highlighting advantages',
      'Offer exclusive demo of unique features'
    ]
  },
  {
    id: '5',
    type: 'prediction',
    title: 'Budget Approval Timeline',
    description: `Based on ${contact.company}'s fiscal calendar and decision patterns, budget approval likely in Q2.`,
    confidence: 70,
    impact: 'medium',
    category: 'Sales Planning',
    actionable: false
  }
];

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ contact }) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});

  useEffect(() => {
    setInsights(generateInsights(contact));
  }, [contact]);

  const handleRegenerateInsights = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setInsights(generateInsights(contact));
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedback = (insightId: string, feedback: 'positive' | 'negative') => {
    setFeedbackGiven(prev => ({ ...prev, [insightId]: feedback }));
  };

  const categories = ['all', ...Array.from(new Set(insights.map(insight => insight.category)))];
  const filteredInsights = selectedCategory === 'all' 
    ? insights 
    : insights.filter(insight => insight.category === selectedCategory);

  const avgConfidence = Math.round(insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="w-7 h-7 mr-3 text-purple-600" />
            AI Intelligence Dashboard
          </h3>
          <p className="text-gray-600">Advanced insights powered by machine learning</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={handleRegenerateInsights}
            loading={isGenerating}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isGenerating ? 'Analyzing...' : 'Refresh Insights'}</span>
          </ModernButton>
        </div>
      </div>

      {/* AI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgConfidence}%</p>
              <p className="text-sm text-gray-600">Avg Confidence</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {insights.filter(i => i.type === 'opportunity').length}
              </p>
              <p className="text-sm text-gray-600">Opportunities</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {insights.filter(i => i.type === 'risk').length}
              </p>
              <p className="text-sm text-gray-600">Risk Alerts</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lightbulb className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {insights.filter(i => i.actionable).length}
              </p>
              <p className="text-sm text-gray-600">Actionable</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {isGenerating ? (
          <GlassCard className="p-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">AI is analyzing contact data and generating insights...</p>
              </div>
            </div>
          </GlassCard>
        ) : (
          filteredInsights.map((insight) => {
            const Icon = insightIcons[insight.type];
            const iconColor = insightColors[insight.type];
            const impactColor = impactColors[insight.impact];
            const userFeedback = feedbackGiven[insight.id];
            
            return (
              <GlassCard key={insight.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-lg ${iconColor}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{insight.title}</h4>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm text-gray-500">{insight.category}</span>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${impactColor}`}>
                            {insight.impact.toUpperCase()} IMPACT
                          </span>
                          {insight.actionable && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                              ACTIONABLE
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Confidence Score */}
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
                              style={{ width: `${insight.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{insight.confidence}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Confidence</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-4">{insight.description}</p>
                    
                    {/* Suggested Actions */}
                    {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                          <Zap className="w-4 h-4 mr-1 text-yellow-500" />
                          Suggested Actions:
                        </h5>
                        <ul className="space-y-1">
                          {insight.suggestedActions.map((action, index) => (
                            <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ModernButton variant="primary" size="sm" className="flex items-center space-x-2">
                          <Target className="w-4 h-4" />
                          <span>Take Action</span>
                        </ModernButton>
                        <ModernButton variant="outline" size="sm" className="flex items-center space-x-2">
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </ModernButton>
                      </div>
                      
                      {/* Feedback */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Was this helpful?</span>
                        <button
                          onClick={() => handleFeedback(insight.id, 'positive')}
                          className={`p-1 rounded transition-colors ${
                            userFeedback === 'positive' 
                              ? 'bg-green-100 text-green-600' 
                              : 'text-gray-400 hover:text-green-600'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFeedback(insight.id, 'negative')}
                          className={`p-1 rounded transition-colors ${
                            userFeedback === 'negative' 
                              ? 'bg-red-100 text-red-600' 
                              : 'text-gray-400 hover:text-red-600'
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
};