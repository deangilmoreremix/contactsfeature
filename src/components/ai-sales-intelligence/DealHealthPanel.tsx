import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
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
      } else {
        // Real health analysis for non-mock contacts
        const response = await supabase.functions.invoke('deal-health-analysis', {
          body: {
            dealData: {
              id: deal.id,
              name: deal.name,
              value: deal.value,
              company: deal.company,
              stage: deal.stage,
              closeDate: deal.closeDate,
              competitors: deal.competitors || [],
              stakeholders: deal.stakeholders || [],
              lastActivity: deal.lastActivity,
              timeline: calculateTimeline(deal),
              budget: deal.value,
              productFit: 75, // Would be calculated based on actual data
              relationshipStrength: 'strong', // Would be determined from engagement history
              champion: deal.stakeholders?.find((s: any) => s.role === 'champion')
            }
          }
        });

        if (response.data?.analysis) {
          const analysis = response.data.analysis;
          setHealthScore({
            overall: analysis.score || 75,
            indicators: [
              {
                name: 'Stakeholder Alignment',
                score: analysis.metrics?.stakeholderScore || 80,
                status: 'good'
              },
              {
                name: 'Timeline Risk',
                score: analysis.metrics?.timelineScore || 70,
                status: analysis.metrics?.timelineScore < 60 ? 'critical' : 'warning'
              },
              {
                name: 'Budget Fit',
                score: 85,
                status: 'good'
              },
              {
                name: 'Competition',
                score: analysis.competitors?.length > 2 ? 60 : 80,
                status: analysis.competitors?.length > 2 ? 'critical' : 'good'
              }
            ],
            recommendations: analysis.recommendations || [
              'Schedule stakeholder alignment meeting',
              'Address competitive positioning',
              'Review timeline expectations'
            ],
            riskLevel: determineRiskLevel(analysis),
            nextSteps: generateNextSteps(analysis)
          });
        }
      }
    } catch (error) {
      console.error('Failed to analyze deal health:', error);
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
            <h3 className="text-lg font-semibold text-gray-900">Deal Health Analysis</h3>
            <p className="text-sm text-gray-600">AI-powered risk assessment</p>
          </div>
        </div>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={analyzeDealHealth}
          loading={loading}
        >
          {loading ? 'Analyzing...' : '🔍 Analyze'}
        </ModernButton>
      </div>

      {healthScore && (
        <>
          {/* Overall Health Score */}
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold mb-2 ${getHealthColor(healthScore.overall)}`}>
              {healthScore.overall}/100
            </div>
            <div className="text-sm text-gray-600 mb-3">Overall Health Score</div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(healthScore.riskLevel)}`}>
              <span className="capitalize">{healthScore.riskLevel} Risk</span>
            </div>
          </div>

          {/* Health Indicators */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-gray-900">Health Indicators</h4>
            {healthScore.indicators.map((indicator, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getHealthIcon(indicator.score)}
                  <span className="text-sm font-medium text-gray-900">{indicator.name}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${getHealthColor(indicator.score)}`}>
                    {indicator.score}/100
                  </div>
                  <div className="text-xs text-gray-600 capitalize">{indicator.status}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {healthScore.recommendations.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Action Required</h4>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {expanded ? 'Show Less' : 'Show All'}
                </button>
              </div>

              <div className="space-y-2">
                {healthScore.recommendations.slice(0, expanded ? undefined : 2).map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Next Steps</h4>
            <div className="space-y-2">
              {healthScore.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-blue-500 mt-1">→</span>
                  <span className="text-sm text-gray-700">{step}</span>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Health Analysis Yet</h3>
          <p className="text-gray-600 mb-6">
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