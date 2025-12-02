import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { analyticsService } from '../../services/analyticsService';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { AgentButton } from './AgentButton';
import { Heart, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  value?: number;
  company: string;
  stage: string;
  closeDate?: string;
  competitors?: string[];
  stakeholders?: any[];
  lastActivity?: string;
}

interface DealHealth {
  overall: number;
  indicators: Array<{
    name: string;
    score: number;
    status: 'good' | 'warning' | 'critical';
  }>;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  nextSteps: string[];
}

interface DealHealthPanelProps {
  deal: Deal;
  onRunAnalysis?: () => void;
  onGenerateReport?: () => void;
  onViewRecommendations?: () => void;
}

export const DealHealthPanel: React.FC<DealHealthPanelProps> = ({
  deal,
  onRunAnalysis,
  onGenerateReport,
  onViewRecommendations
}) => {
  const [healthScore, setHealthScore] = useState<DealHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const analyzeDealHealth = async () => {
    setLoading(true);

    // Start analytics tracking
    const sessionId = analyticsService.startTracking('DealHealthPanel', 'analyze', deal.id, deal.id);

    try {
      // Check if this is mock data (similar to other components)
      const isMockData = deal.name.includes('Demo') || deal.company === 'Demo Company' || deal.name.startsWith('Mock');

      if (isMockData) {
        // For mock contacts, simulate health analysis with mock data
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate mock health analysis data
        const mockHealthScore: DealHealth = {
          overall: 78,
          indicators: [
            {
              name: 'Stakeholder Alignment',
              score: 85,
              status: 'good'
            },
            {
              name: 'Timeline Risk',
              score: 72,
              status: 'warning'
            },
            {
              name: 'Budget Fit',
              score: 88,
              status: 'good'
            },
            {
              name: 'Competition',
              score: 65,
              status: 'warning'
            }
          ],
          recommendations: [
            'Schedule follow-up meeting with key stakeholders',
            'Address competitive concerns proactively',
            'Review and confirm timeline expectations',
            'Strengthen relationship with decision makers'
          ],
          riskLevel: 'medium',
          nextSteps: [
            'Schedule stakeholder alignment call within 48 hours',
            'Prepare competitive differentiation materials',
            'Update deal stage in CRM',
            'Send personalized follow-up email'
          ]
        };

        setHealthScore(mockHealthScore);

        // End analytics tracking - success
        analyticsService.endTracking(sessionId, true, undefined, 'mock', 'mock');
      } else {
        // Real health analysis for non-mock contacts
        const response = await supabase.functions.invoke('deal-health-analysis', {
          body: {
            deal,
            healthMetrics: [],
            analysisDepth: 'comprehensive',
            riskFactors: [],
            aiProvider: 'openai'
          }
        });

        if (response.data?.data) {
          // Transform the API response to match the expected health structure
          const apiData = response.data.data;
          const transformedHealth: DealHealth = {
            overall: apiData.healthScore || 75,
            indicators: apiData.healthIndicators?.map((indicator: any) => ({
              name: indicator.metric || indicator.name || 'Health Indicator',
              score: indicator.value || indicator.score || 75,
              status: indicator.status || 'good'
            })) || [
              {
                name: 'Stakeholder Alignment',
                score: 85,
                status: 'good'
              },
              {
                name: 'Timeline Risk',
                score: 72,
                status: 'warning'
              },
              {
                name: 'Budget Fit',
                score: 88,
                status: 'good'
              },
              {
                name: 'Competition',
                score: 65,
                status: 'warning'
              }
            ],
            recommendations: apiData.recommendations || [
              'Schedule follow-up meeting with key stakeholders',
              'Address competitive concerns proactively',
              'Review and confirm timeline expectations'
            ],
            riskLevel: apiData.riskLevel || 'medium',
            nextSteps: apiData.nextActions?.map((action: any) => action.action || action) || [
              'Schedule stakeholder alignment call within 48 hours',
              'Prepare competitive differentiation materials',
              'Update deal stage in CRM'
            ]
          };

          setHealthScore(transformedHealth);

          // End analytics tracking - success
          analyticsService.endTracking(sessionId, true, undefined, response.data.provider, 'gpt-4o');
        } else {
          throw new Error('No health analysis data received');
        }
      }
    } catch (error) {
      console.error('Failed to analyze deal health:', error);

      // End analytics tracking - failure
      analyticsService.endTracking(sessionId, false, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeline = (deal: Deal): number => {
    if (!deal.closeDate) return 90; // Default 90 days

    const closeDate = new Date(deal.closeDate);
    const today = new Date();
    const diffTime = closeDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  };

  const determineRiskLevel = (analysis: any): 'low' | 'medium' | 'high' | 'critical' => {
    const score = analysis.score || 75;
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  };

  const generateNextSteps = (analysis: any): string[] => {
    const steps = [];

    if (analysis.risks?.some((r: any) => r.severity === 'high')) {
      steps.push('Address high-priority risks immediately');
    }

    if (analysis.recommendations?.length > 0) {
      steps.push('Review and implement recommendations');
    }

    steps.push('Schedule next stakeholder touchpoint');
    steps.push('Update deal progress in CRM');

    return steps;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Heart className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Deal Health Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">AI-powered risk assessment</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <AgentButton
            agentId="ai-ae-agent"
            dealId={deal.id}
            variant="outline"
            size="sm"
          >
            AI AE
          </AgentButton>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={analyzeDealHealth}
            loading={loading}
          >
            {loading ? 'Analyzing...' : '🔍 Analyze'}
          </ModernButton>
        </div>
      </div>

      {healthScore && (
        <>
          {/* Overall Health Score */}
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold mb-2 ${getHealthColor(healthScore.overall)} dark:text-opacity-90`}>
              {healthScore.overall}/100
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">Overall Health Score</div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(healthScore.riskLevel)}`}>
              <span className="capitalize">{healthScore.riskLevel} Risk</span>
            </div>
          </div>

          {/* Health Indicators */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Health Indicators</h4>
            {healthScore.indicators.map((indicator, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getHealthIcon(indicator.score)}
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{indicator.name}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${getHealthColor(indicator.score)}`}>
                    {indicator.score}/100
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{indicator.status}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {healthScore.recommendations.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Action Required</h4>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {expanded ? 'Show Less' : 'Show All'}
                </button>
              </div>

              <div className="space-y-2">
                {healthScore.recommendations.slice(0, expanded ? undefined : 2).map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Next Steps</h4>
            <div className="space-y-2">
              {healthScore.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-blue-500 dark:text-blue-400 mt-1">→</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <ModernButton
              variant="primary"
              onClick={onGenerateReport || (() => {})}
              className="flex-1"
            >
              📋 Generate Report
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={onViewRecommendations || (() => {})}
              className="flex-1"
            >
              💡 View Recommendations
            </ModernButton>
          </div>
        </>
      )}

      {!healthScore && !loading && (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Health Analysis Yet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Run an AI-powered analysis to get insights on deal health, risks, and recommendations.
          </p>
          <ModernButton
            variant="primary"
            onClick={analyzeDealHealth}
          >
            🚀 Run Health Analysis
          </ModernButton>
        </div>
      )}
    </GlassCard>
  );
};