import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Send, TrendingUp, AlertTriangle, CheckCircle, Zap, MessageSquare } from 'lucide-react';

interface CommunicationContext {
  type: 'email' | 'call_script' | 'social_message' | 'proposal_followup';
  recipient: {
    name: string;
    role?: string;
    company?: string;
    relationship: 'new' | 'existing' | 'champion' | 'decision_maker';
  };
  purpose: 'nurture' | 'qualify' | 'close' | 'follow_up' | 're_engage';
  previousInteractions?: number;
}

interface OptimizationResult {
  score: number;
  suggestions: Array<{
    aspect: string;
    score: number;
    feedback: string;
    suggestion: string;
  }>;
  optimizedContent?: {
    subject?: string;
    body?: string;
    callScript?: string;
  };
  performance: {
    openRate?: number;
    responseRate?: number;
    conversionPotential: number;
  };
  insights: string[];
}

interface CommunicationOptimizerProps {
  content: string;
  context: CommunicationContext;
  onOptimize?: (optimized: OptimizationResult) => void;
  onApplyOptimization?: () => void;
  onViewAnalytics?: () => void;
}

export const CommunicationOptimizer: React.FC<CommunicationOptimizerProps> = ({
  content,
  context,
  onOptimize,
  onApplyOptimization,
  onViewAnalytics
}) => {
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedOptimizations, setAppliedOptimizations] = useState<Set<string>>(new Set());

  const optimizeCommunication = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('communication-optimization', {
        body: {
          content,
          context,
          optimizationGoals: getOptimizationGoals(context),
          targetMetrics: getTargetMetrics(context.type)
        }
      });

      if (response.data?.optimization) {
        const result = response.data.optimization;
        setOptimization(result);
        onOptimize?.(result);
      }
    } catch (error) {
      console.error('Failed to optimize communication:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOptimizationGoals = (context: CommunicationContext) => {
    switch (context.purpose) {
      case 'nurture':
        return ['engagement', 'relationship_building', 'value_demonstration'];
      case 'qualify':
        return ['information_gathering', 'need_identification', 'qualification'];
      case 'close':
        return ['urgency_creation', 'objection_handling', 'commitment'];
      case 'follow_up':
        return ['next_step_creation', 'momentum_maintenance'];
      case 're_engage':
        return ['attention_grabbing', 'value_reminder', 'reconnection'];
      default:
        return ['general_engagement'];
    }
  };

  const getTargetMetrics = (type: string) => {
    switch (type) {
      case 'email':
        return { openRate: 0.25, responseRate: 0.08, clickRate: 0.03 };
      case 'call_script':
        return { connectionRate: 0.60, conversionRate: 0.15 };
      case 'social_message':
        return { engagementRate: 0.08, responseRate: 0.05 };
      default:
        return { engagementRate: 0.10 };
    }
  };

  const applyOptimization = (suggestionId: string) => {
    setAppliedOptimizations(prev => new Set([...prev, suggestionId]));
    onApplyOptimization?.();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  const getPerformanceIndicator = (metric: string, value: number) => {
    const colors = {
      excellent: 'text-green-600 bg-green-50',
      good: 'text-blue-600 bg-blue-50',
      average: 'text-yellow-600 bg-yellow-50',
      poor: 'text-red-600 bg-red-50'
    };

    let performance = 'average';
    if (value >= 0.8) performance = 'excellent';
    else if (value >= 0.6) performance = 'good';
    else if (value < 0.3) performance = 'poor';

    return colors[performance as keyof typeof colors];
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Send className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Communication Optimizer</h2>
            <p className="text-sm text-gray-600">AI-powered message optimization for maximum impact</p>
          </div>
        </div>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={optimizeCommunication}
          loading={loading}
        >
          {loading ? 'Optimizing...' : '⚡ Optimize'}
        </ModernButton>
      </div>

      {/* Context Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Type</div>
            <div className="text-sm font-medium text-gray-900 capitalize">
              {context.type.replace('_', ' ')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Recipient</div>
            <div className="text-sm font-medium text-gray-900">{context.recipient.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Purpose</div>
            <div className="text-sm font-medium text-gray-900 capitalize">
              {context.purpose.replace('_', ' ')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Relationship</div>
            <div className="text-sm font-medium text-gray-900 capitalize">
              {context.recipient.relationship.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {optimization && (
        <>
          {/* Overall Score */}
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold mb-2 ${getScoreColor(optimization.score)}`}>
              {optimization.score}/100
            </div>
            <div className="text-sm text-gray-600">Communication Score</div>
            <div className="text-xs text-gray-500 mt-1">
              Potential: {Math.round(optimization.performance.conversionPotential * 100)}% conversion rate
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Expected Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {optimization.performance.openRate !== undefined && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className={`text-lg font-bold ${getPerformanceIndicator('openRate', optimization.performance.openRate)}`}>
                    {Math.round(optimization.performance.openRate * 100)}%
                  </div>
                  <div className="text-xs text-gray-600">Open Rate</div>
                </div>
              )}
              {optimization.performance.responseRate !== undefined && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className={`text-lg font-bold ${getPerformanceIndicator('responseRate', optimization.performance.responseRate)}`}>
                    {Math.round(optimization.performance.responseRate * 100)}%
                  </div>
                  <div className="text-xs text-gray-600">Response Rate</div>
                </div>
              )}
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className={`text-lg font-bold ${getPerformanceIndicator('conversion', optimization.performance.conversionPotential)}`}>
                  {Math.round(optimization.performance.conversionPotential * 100)}%
                </div>
                <div className="text-xs text-gray-600">Conversion</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  +{Math.round((optimization.score / 100) * 25)}%
                </div>
                <div className="text-xs text-gray-600">Improvement</div>
              </div>
            </div>
          </div>

          {/* Optimization Suggestions */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Optimization Suggestions</h3>
            <div className="space-y-4">
              {optimization.suggestions.map((suggestion, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getScoreIcon(suggestion.score)}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{suggestion.aspect}</h4>
                        <div className={`text-xs ${getScoreColor(suggestion.score)}`}>
                          Score: {suggestion.score}/100
                        </div>
                      </div>
                    </div>
                    {!appliedOptimizations.has(`suggestion-${index}`) && (
                      <ModernButton
                        variant="outline"
                        size="sm"
                        onClick={() => applyOptimization(`suggestion-${index}`)}
                      >
                        Apply
                      </ModernButton>
                    )}
                    {appliedOptimizations.has(`suggestion-${index}`) && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">Applied</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-gray-700">
                      <strong>Current:</strong> {suggestion.feedback}
                    </div>
                    <div className="text-sm text-blue-700">
                      <strong>Suggestion:</strong> {suggestion.suggestion}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          {optimization.insights && optimization.insights.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">AI Insights</h3>
              <div className="space-y-3">
                {optimization.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Zap className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimized Content Preview */}
          {optimization.optimizedContent && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Optimized Content Preview</h3>
              <div className="space-y-4">
                {optimization.optimizedContent.subject && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Subject Line:</div>
                    <div className="text-sm font-medium text-gray-900">
                      {optimization.optimizedContent.subject}
                    </div>
                  </div>
                )}
                {optimization.optimizedContent.body && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Message Body:</div>
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {optimization.optimizedContent.body}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <ModernButton
              variant="primary"
              onClick={onApplyOptimization || (() => {})}
              className="flex-1"
            >
              ✨ Apply Optimizations
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={onViewAnalytics || (() => {})}
              className="flex-1"
            >
              📊 View Analytics
            </ModernButton>
          </div>
        </>
      )}

      {!optimization && !loading && (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Optimize Your Communication</h3>
          <p className="text-gray-600 mb-6">
            Get AI-powered suggestions to improve your message effectiveness and increase response rates.
          </p>
          <ModernButton
            variant="primary"
            onClick={optimizeCommunication}
          >
            ⚡ Optimize Message
          </ModernButton>
        </div>
      )}
    </GlassCard>
  );
};
