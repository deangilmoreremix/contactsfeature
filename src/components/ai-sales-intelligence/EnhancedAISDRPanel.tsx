import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { AgentButton } from './AgentButton';
import {
  Target,
  Phone,
  TrendingUp,
  Users,
  Calendar,
  Rocket,
  Settings,
  Briefcase,
  Wrench,
  Mic,
  MessageSquare,
  Mail,
  BarChart3,
  Zap,
  Brain,
  Bot,
  Sparkles,
  ArrowRight,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface AISDRFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'outreach' | 'intelligence' | 'automation' | 'analysis';
  agentId: string;
  capabilities: string[];
  metrics: {
    successRate: number;
    avgResponseTime: string;
    monthlyUsage: number;
  };
  premium?: boolean;
}

export const EnhancedAISDRPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'outreach' | 'intelligence' | 'automation' | 'analysis'>('all');
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<Record<string, any>>({});

  const aiSdrFeatures: AISDRFeature[] = [
    // Enhanced SDR Agents
    {
      id: 'ai-sdr-pro',
      name: 'AI SDR Pro',
      description: 'Advanced sales development with multi-channel outreach, A/B testing, and predictive analytics',
      icon: <Target className="w-6 h-6" />,
      category: 'outreach',
      agentId: 'ai-sdr-agent',
      capabilities: [
        'Multi-channel outreach (Email, LinkedIn, Phone)',
        'A/B testing for messaging',
        'Predictive response scoring',
        'Automated follow-up sequences',
        'Personalization engine',
        'Performance analytics'
      ],
      metrics: {
        successRate: 87,
        avgResponseTime: '2.3s',
        monthlyUsage: 1250
      },
      premium: true
    },
    {
      id: 'smart-dialer-ai',
      name: 'Smart Dialer AI',
      description: 'AI-powered calling with conversation analysis, objection handling, and optimal timing',
      icon: <Phone className="w-6 h-6" />,
      category: 'outreach',
      agentId: 'ai-dialer-agent',
      capabilities: [
        'Real-time conversation analysis',
        'Automated objection handling',
        'Optimal calling time prediction',
        'Call recording and transcription',
        'Sentiment analysis',
        'Follow-up task creation'
      ],
      metrics: {
        successRate: 92,
        avgResponseTime: '1.8s',
        monthlyUsage: 890
      },
      premium: true
    },
    {
      id: 'signals-intelligence',
      name: 'Signals Intelligence',
      description: 'Advanced lead scoring with intent data, technographics, and buying signals',
      icon: <TrendingUp className="w-6 h-6" />,
      category: 'intelligence',
      agentId: 'signals-agent',
      capabilities: [
        'Intent data analysis',
        'Technographics enrichment',
        'Buying signal detection',
        'Competitor monitoring',
        'Industry trend analysis',
        'Lead scoring algorithms'
      ],
      metrics: {
        successRate: 94,
        avgResponseTime: '3.1s',
        monthlyUsage: 2100
      }
    },
    {
      id: 'lead-database-ai',
      name: 'Lead Database AI',
      description: 'Intelligent lead management with duplicate detection, enrichment, and prioritization',
      icon: <Users className="w-6 h-6" />,
      category: 'intelligence',
      agentId: 'lead-db-agent',
      capabilities: [
        'Duplicate lead detection',
        'Real-time data enrichment',
        'Lead prioritization scoring',
        'Account-based marketing',
        'Lead lifecycle management',
        'Data quality validation'
      ],
      metrics: {
        successRate: 96,
        avgResponseTime: '2.7s',
        monthlyUsage: 1800
      }
    },
    {
      id: 'meeting-scheduler-ai',
      name: 'Meeting Scheduler AI',
      description: 'Smart meeting coordination with calendar analysis, timezone optimization, and follow-up',
      icon: <Calendar className="w-6 h-6" />,
      category: 'automation',
      agentId: 'meetings-agent',
      capabilities: [
        'Calendar availability analysis',
        'Timezone optimization',
        'Meeting type recommendations',
        'Automated reminders',
        'Meeting preparation briefs',
        'Post-meeting follow-ups'
      ],
      metrics: {
        successRate: 89,
        avgResponseTime: '4.2s',
        monthlyUsage: 650
      }
    },
    {
      id: 'customer-journey-ai',
      name: 'Customer Journey AI',
      description: 'Complete customer journey mapping with predictive next steps and engagement optimization',
      icon: <Rocket className="w-6 h-6" />,
      category: 'automation',
      agentId: 'ai-journeys-agent',
      capabilities: [
        'Journey mapping and visualization',
        'Predictive next step recommendations',
        'Engagement optimization',
        'Multi-touch campaign management',
        'Conversion funnel analysis',
        'Customer lifetime value prediction'
      ],
      metrics: {
        successRate: 91,
        avgResponseTime: '5.8s',
        monthlyUsage: 420
      },
      premium: true
    },

    // New Enhanced AI Features
    {
      id: 'social-selling-ai',
      name: 'Social Selling AI',
      description: 'AI-powered LinkedIn and social media engagement with personalized outreach',
      icon: <MessageSquare className="w-6 h-6" />,
      category: 'outreach',
      agentId: 'social-selling-agent',
      capabilities: [
        'LinkedIn profile analysis',
        'Personalized connection requests',
        'Social media content creation',
        'Engagement timing optimization',
        'Influencer identification',
        'Social proof gathering'
      ],
      metrics: {
        successRate: 85,
        avgResponseTime: '3.5s',
        monthlyUsage: 780
      },
      premium: true
    },
    {
      id: 'email-personalization-ai',
      name: 'Email Personalization AI',
      description: 'Advanced email personalization with dynamic content and A/B testing',
      icon: <Mail className="w-6 h-6" />,
      category: 'outreach',
      agentId: 'email-personalization-agent',
      capabilities: [
        'Dynamic content insertion',
        'Behavioral email triggers',
        'Personalized subject lines',
        'A/B testing automation',
        'Email deliverability optimization',
        'Open and click prediction'
      ],
      metrics: {
        successRate: 88,
        avgResponseTime: '2.9s',
        monthlyUsage: 1450
      }
    },
    {
      id: 'revenue-intelligence-ai',
      name: 'Revenue Intelligence AI',
      description: 'Predictive revenue analytics with deal forecasting and pipeline optimization',
      icon: <BarChart3 className="w-6 h-6" />,
      category: 'analysis',
      agentId: 'revenue-intelligence-agent',
      capabilities: [
        'Revenue forecasting',
        'Pipeline health analysis',
        'Deal velocity prediction',
        'Quota attainment forecasting',
        'Seasonal trend analysis',
        'Commission optimization'
      ],
      metrics: {
        successRate: 93,
        avgResponseTime: '6.2s',
        monthlyUsage: 320
      },
      premium: true
    },
    {
      id: 'competitive-intelligence-ai',
      name: 'Competitive Intelligence AI',
      description: 'Real-time competitor monitoring and strategic intelligence gathering',
      icon: <Zap className="w-6 h-6" />,
      category: 'intelligence',
      agentId: 'competitive-intelligence-agent',
      capabilities: [
        'Competitor website monitoring',
        'Pricing strategy analysis',
        'Product launch detection',
        'Market share tracking',
        'Win/loss analysis',
        'Strategic recommendations'
      ],
      metrics: {
        successRate: 90,
        avgResponseTime: '7.1s',
        monthlyUsage: 290
      },
      premium: true
    },
    {
      id: 'content-creation-ai',
      name: 'Content Creation AI',
      description: 'AI-powered content generation for marketing, sales, and thought leadership',
      icon: <Brain className="w-6 h-6" />,
      category: 'automation',
      agentId: 'content-creation-agent',
      capabilities: [
        'Blog post generation',
        'Social media content',
        'Email newsletter creation',
        'Case study writing',
        'Video script generation',
        'Presentation content'
      ],
      metrics: {
        successRate: 87,
        avgResponseTime: '8.5s',
        monthlyUsage: 560
      }
    },
    {
      id: 'negotiation-coach-ai',
      name: 'Negotiation Coach AI',
      description: 'Real-time negotiation assistance with strategy recommendations and objection handling',
      icon: <Bot className="w-6 h-6" />,
      category: 'analysis',
      agentId: 'negotiation-coach-agent',
      capabilities: [
        'Real-time negotiation strategy',
        'Objection response generation',
        'BATNA analysis',
        'Concession recommendations',
        'Closing technique suggestions',
        'Post-negotiation debrief'
      ],
      metrics: {
        successRate: 95,
        avgResponseTime: '1.2s',
        monthlyUsage: 180
      },
      premium: true
    }
  ];

  const categories = [
    { id: 'all', label: 'All Agents', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'outreach', label: 'Outreach', icon: <Target className="w-4 h-4" /> },
    { id: 'intelligence', label: 'Intelligence', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'automation', label: 'Automation', icon: <Settings className="w-4 h-4" /> },
    { id: 'analysis', label: 'Analysis', icon: <BarChart3 className="w-4 h-4" /> }
  ];

  const filteredFeatures = selectedCategory === 'all'
    ? aiSdrFeatures
    : aiSdrFeatures.filter(feature => feature.category === selectedCategory);

  const handleAgentExecute = (agentId: string, result: any) => {
    console.log(`Agent ${agentId} executed:`, result);
    setActiveAgents(prev => [...prev, agentId]);
    setTimeout(() => {
      setActiveAgents(prev => prev.filter(id => id !== agentId));
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Enhanced AI SDR & Intelligence Suite</h1>
              <p className="text-gray-600">Advanced AI agents for every aspect of sales development and revenue operations</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{aiSdrFeatures.length}</div>
              <div className="text-sm text-gray-500">AI Agents</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(aiSdrFeatures.reduce((acc, f) => acc + f.metrics.successRate, 0) / aiSdrFeatures.length)}%
              </div>
              <div className="text-sm text-gray-500">Avg Success Rate</div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <ModernButton
              key={category.id}
              variant={selectedCategory === category.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id as any)}
              className="flex items-center space-x-2"
            >
              {category.icon}
              <span>{category.label}</span>
            </ModernButton>
          ))}
        </div>
      </GlassCard>

      {/* AI Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFeatures.map(feature => (
          <GlassCard key={feature.id} className="p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                  {feature.premium && (
                    <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Premium
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">{feature.metrics.successRate}%</div>
                <div className="text-xs text-gray-500">Success Rate</div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{feature.description}</p>

            {/* Capabilities */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Capabilities:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {feature.capabilities.slice(0, 3).map((capability, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                    {capability}
                  </li>
                ))}
                {feature.capabilities.length > 3 && (
                  <li className="text-gray-400">+{feature.capabilities.length - 3} more...</li>
                )}
              </ul>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-500">Response Time</div>
                <div className="font-semibold text-gray-900">{feature.metrics.avgResponseTime}</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-500">Monthly Usage</div>
                <div className="font-semibold text-gray-900">{feature.metrics.monthlyUsage}</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-500">Success Rate</div>
                <div className="font-semibold text-green-600">{feature.metrics.successRate}%</div>
              </div>
            </div>

            {/* Action Button */}
            <AgentButton
              agentId={feature.agentId}
              variant="primary"
              className="w-full"
              onSuccess={(result) => handleAgentExecute(feature.agentId, result)}
            >
              {activeAgents.includes(feature.agentId) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Launch {feature.name}
                </>
              )}
            </AgentButton>
          </GlassCard>
        ))}
      </div>

      {/* Usage Analytics */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          AI Agent Performance Analytics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {aiSdrFeatures.reduce((acc, f) => acc + f.metrics.monthlyUsage, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Monthly Executions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {Math.round(aiSdrFeatures.reduce((acc, f) => acc + f.metrics.successRate, 0) / aiSdrFeatures.length)}%
            </div>
            <div className="text-sm text-gray-600">Average Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {(aiSdrFeatures.reduce((acc, f) => acc + parseFloat(f.metrics.avgResponseTime), 0) / aiSdrFeatures.length).toFixed(1)}s
            </div>
            <div className="text-sm text-gray-600">Average Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {aiSdrFeatures.filter(f => f.premium).length}
            </div>
            <div className="text-sm text-gray-600">Premium Features</div>
          </div>
        </div>
      </GlassCard>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Quick AI Actions
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ModernButton variant="outline" className="h-20 flex-col">
            <Target className="w-6 h-6 mb-2" />
            <span className="text-sm">Bulk Outreach</span>
          </ModernButton>
          <ModernButton variant="outline" className="h-20 flex-col">
            <TrendingUp className="w-6 h-6 mb-2" />
            <span className="text-sm">Lead Scoring</span>
          </ModernButton>
          <ModernButton variant="outline" className="h-20 flex-col">
            <Calendar className="w-6 h-6 mb-2" />
            <span className="text-sm">Meeting Scheduler</span>
          </ModernButton>
          <ModernButton variant="outline" className="h-20 flex-col">
            <BarChart3 className="w-6 h-6 mb-2" />
            <span className="text-sm">Revenue Forecast</span>
          </ModernButton>
        </div>
      </GlassCard>
    </div>
  );
};