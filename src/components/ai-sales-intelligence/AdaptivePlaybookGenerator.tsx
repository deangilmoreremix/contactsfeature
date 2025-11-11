import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { analyticsService } from '../../services/analyticsService';
import { cacheService } from '../../services/cacheService';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { BookOpen, Target, TrendingUp, CheckCircle, Clock, Users, DollarSign, Sparkles, Brain, Zap, Loader2 } from 'lucide-react';
import { ResearchThinkingAnimation, useResearchThinking } from '../ui/ResearchThinkingAnimation';
import { ResearchStatusOverlay, useResearchStatus } from '../ui/ResearchStatusOverlay';

interface Deal {
  id: string;
  name: string;
  value?: number;
  company: string;
  stage: string;
  competitors?: string[];
  stakeholders?: any[];
  industry?: string;
  companySize?: number;
}

interface PlaybookStrategy {
  dealId: string;
  strategy: {
    name: string;
    description: string;
    confidence: number;
    rationale: string;
  };
  phases: Array<{
    id: string;
    name: string;
    timeline: string;
    objectives: string[];
    tactics: Array<{
      id: string;
      name: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      estimatedEffort: string;
      successMetrics: string[];
      dependencies?: string[];
    }>;
    milestones: Array<{
      id: string;
      name: string;
      description: string;
      dueDate: string;
      owner: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
  }>;
  riskMitigation: Array<{
    risk: string;
    probability: number;
    impact: string;
    mitigation: string;
  }>;
  successIndicators: Array<{
    metric: string;
    target: string;
    current: string;
    status: 'on_track' | 'at_risk' | 'behind';
  }>;
  competitivePositioning: {
    strengths: string[];
    weaknesses: string[];
    differentiation: string[];
    winThemes: string[];
  };
}

interface StreamingUpdate {
  type: 'progress' | 'phase' | 'strategy' | 'complete' | 'error';
  progress?: number;
  phase?: any;
  strategy?: any;
  error?: string;
}

interface AdaptivePlaybookGeneratorProps {
  deal: Deal;
  onGenerate?: () => void;
  onCustomize?: () => void;
  onExecutePhase?: (phaseId: string) => void;
}

export const AdaptivePlaybookGenerator: React.FC<AdaptivePlaybookGeneratorProps> = ({
  deal,
  onGenerate,
  onCustomize,
  onExecutePhase
}) => {
  const [playbook, setPlaybook] = useState<PlaybookStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [draggedPhase, setDraggedPhase] = useState<string | null>(null);
  const [playbookType, setPlaybookType] = useState<'comprehensive' | 'aggressive' | 'conservative' | 'relationship' | 'transactional'>('comprehensive');

  // Streaming features
  const [isStreamingMode, setIsStreamingMode] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [streamingPhases, setStreamingPhases] = useState<any[]>([]);
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set());

  const streamingControllerRef = useRef<AbortController | null>(null);

  // Research state management (matching AIInsightsPanel pattern)
  const researchThinking = useResearchThinking();
  const researchStatus = useResearchStatus();

  const stopStreaming = useCallback(() => {
    streamingControllerRef.current?.abort();
    setActiveStreams(new Set());
    setStreamingProgress(0);
    setStreamingPhases([]);
  }, []);

  const generatePlaybook = useCallback(async (onProgress?: (update: StreamingUpdate) => void) => {
    setLoading(true);
    setStreamingProgress(0);
    setStreamingPhases([]);
    setActiveStreams(new Set());

    streamingControllerRef.current = new AbortController();

    researchThinking.startResearch('🎯 Generating AI-powered sales playbook...', 4);

    // Start analytics tracking
    const sessionId = analyticsService.startTracking('AdaptivePlaybookGenerator', 'generate', deal.id, deal.id);

    try {
      researchThinking.updateProgress(10, '🧠 Analyzing deal data and market conditions...');
      setStreamingProgress(10);
      onProgress?.({ type: 'progress', progress: 10 });

      // Check cache first
      const cacheKey = {
        dealId: deal.id,
        stage: deal.stage,
        company: deal.company,
        industry: deal.industry
      };

      const cachedPlaybook = cacheService.get<PlaybookStrategy>('AdaptivePlaybookGenerator', cacheKey);
      if (cachedPlaybook) {
        setPlaybook(cachedPlaybook);
        researchThinking.complete('✅ Cached playbook loaded successfully!');
        analyticsService.endTracking(sessionId, true, undefined, 'cache', 'cache');
        return;
      }

      // Real playbook generation
      researchThinking.updateProgress(30, '🔍 Researching company and market data...');
      setStreamingProgress(30);
      onProgress?.({ type: 'progress', progress: 30 });

      if (isStreamingMode) {
        // Streaming generation with real-time updates
        const streamId = `playbook-${Date.now()}`;
        setActiveStreams(prev => new Set([...prev, streamId]));

        // Simulate streaming phases
        const mockPhases = [
          { name: 'Discovery & Research', progress: 40 },
          { name: 'Strategy Development', progress: 60 },
          { name: 'Tactics Planning', progress: 80 },
          { name: 'Risk Assessment', progress: 90 }
        ];

        for (const phase of mockPhases) {
          if (streamingControllerRef.current?.signal.aborted) break;

          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
          setStreamingProgress(phase.progress);
          setStreamingPhases(prev => [...prev, phase]);
          researchThinking.updateProgress(phase.progress, `📋 ${phase.name}...`);
          onProgress?.({ type: 'phase', phase });
        }

        setActiveStreams(prev => {
          const newSet = new Set(prev);
          newSet.delete(streamId);
          return newSet;
        });
      }

      const response = await supabase.functions.invoke('adaptive-playbook', {
        body: {
          contact: deal,
          currentStage: deal.stage,
          businessGoals: ['increase_revenue', 'improve_efficiency', 'expand_market'],
          automationType: playbookType,
          playbookType: playbookType,
          aiProvider: 'openai'
        }
      });

      researchThinking.updateProgress(60, '📋 Synthesizing strategic recommendations...');
      setStreamingProgress(60);
      onProgress?.({ type: 'progress', progress: 60 });

      if (response.data?.data) {
        // Transform the API response to match the expected playbook structure
        const apiData = response.data.data;
        const transformedPlaybook: PlaybookStrategy = {
          dealId: deal.id,
          strategy: {
            name: apiData.strategy?.name || 'AI-Generated Sales Strategy',
            description: apiData.strategy?.description || `Comprehensive sales strategy for ${deal.name} at ${deal.company}`,
            confidence: apiData.strategy?.confidence || 0.85,
            rationale: apiData.strategy?.rationale || 'Generated based on deal analysis and market conditions'
          },
          phases: apiData.phases?.map((phase: any, index: number) => ({
            id: phase.id || `phase-${index + 1}`,
            name: phase.name || `Phase ${index + 1}`,
            timeline: phase.timeline || '2-4 weeks',
            objectives: phase.objectives || [phase.description || 'Execute strategic action'],
            tactics: phase.tactics?.map((tactic: any, tacticIndex: number) => ({
              id: tactic.id || `tactic-${index}-${tacticIndex}`,
              name: tactic.name || tactic.action || 'Strategic Action',
              description: tactic.description || 'Execute the planned action',
              priority: tactic.priority || 'high',
              estimatedEffort: tactic.estimatedEffort || '2-3 hours',
              successMetrics: tactic.successMetrics || ['Action completed', 'Positive outcome achieved'],
              dependencies: tactic.dependencies || []
            })) || [{
              id: `tactic-${index + 1}`,
              name: phase.action || 'Strategic Action',
              description: phase.description || 'Execute the planned action',
              priority: 'high',
              estimatedEffort: phase.estimatedEffort || '2-3 hours',
              successMetrics: ['Action completed', 'Positive outcome achieved'],
              dependencies: []
            }],
            milestones: phase.milestones?.map((milestone: any, milestoneIndex: number) => ({
              id: milestone.id || `milestone-${index}-${milestoneIndex}`,
              name: milestone.name || `${phase.name} Complete`,
              description: milestone.description || 'Successfully execute the planned action',
              dueDate: milestone.dueDate || new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
              owner: milestone.owner || 'Sales Rep',
              status: milestone.status || 'pending'
            })) || [{
              id: `milestone-${index + 1}`,
              name: `${phase.name} Complete`,
              description: 'Successfully execute the planned action',
              dueDate: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
              owner: 'Sales Rep',
              status: 'pending'
            }]
          })) || [],
          riskMitigation: apiData.riskMitigation || [
            {
              risk: 'Implementation delays',
              probability: 0.3,
              impact: 'Medium',
              mitigation: 'Regular check-ins and proactive communication'
            }
          ],
          successIndicators: apiData.successIndicators || [
            {
              metric: 'Deal Progression',
              target: '100%',
              current: '75%',
              status: 'on_track'
            }
          ],
          competitivePositioning: apiData.competitivePositioning || {
            strengths: ['AI-powered insights', 'Personalized approach'],
            weaknesses: [],
            differentiation: ['Advanced analytics', 'Predictive recommendations'],
            winThemes: ['Innovation', 'Results-driven']
          }
        };

        setPlaybook(transformedPlaybook);
        researchThinking.updateProgress(90, '✨ Finalizing playbook...');
        setStreamingProgress(90);
        onProgress?.({ type: 'strategy', strategy: transformedPlaybook.strategy });
        onProgress?.({ type: 'progress', progress: 90 });

        researchThinking.complete('✅ AI playbook generated successfully!');
        setStreamingProgress(100);
        onProgress?.({ type: 'complete' });

        // Cache the playbook
        cacheService.set('AdaptivePlaybookGenerator', cacheKey, transformedPlaybook, 30 * 60 * 1000, {
          contactId: deal.id,
          dealId: deal.id,
          toolName: 'AdaptivePlaybookGenerator',
          parameters: cacheKey
        });

        // End analytics tracking - success
        analyticsService.endTracking(sessionId, true, undefined, response.data.provider, 'gpt-4o');
      } else {
        throw new Error('No playbook data received from API');
      }
    } catch (error) {
      console.error('Failed to generate playbook:', error);

      // Provide user-friendly error messages
      let errorMessage = '❌ Failed to generate playbook';
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = '❌ API key not configured. Please check your OpenAI API key.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = '❌ Network error. Please check your internet connection.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = '❌ API rate limit exceeded. Please try again later.';
        } else {
          errorMessage = `❌ Failed to generate playbook: ${error.message}`;
        }
      }

      researchThinking.setError(errorMessage);
      onProgress?.({ type: 'error', error: errorMessage });

      // End analytics tracking - failure
      analyticsService.endTracking(sessionId, false, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
      setStreamingProgress(0);
      setStreamingPhases([]);
      streamingControllerRef.current = null;
    }
  }, [deal, playbookType, isStreamingMode, researchThinking, analyticsService, cacheService]);

  const getCompanyProfile = (companyName: string) => {
    // This would integrate with your CRM/company data
    return {
      industry: deal.industry,
      size: deal.companySize,
      growthStage: 'growth', // startup, growth, mature, enterprise
      decisionMaking: 'committee', // single, committee, consensus
      budgetCycle: 'annual',
      technologyStack: ['crm', 'marketing_automation']
    };
  };

  const getCompetitiveAnalysis = (competitors: string[]) => {
    return competitors.map(competitor => ({
      name: competitor,
      strengths: ['Strong brand recognition', 'Established relationships'],
      weaknesses: ['Higher pricing', 'Complex implementation'],
      marketPosition: 'leader',
      winProbability: 0.6
    }));
  };

  const getSimilarDeals = (deal: Deal) => {
    // This would query your historical deal data
    return {
      similarDeals: [
        { value: deal.value, duration: 45, won: true },
        { value: deal.value, duration: 60, won: false }
      ],
      averageWinRate: 0.65,
      averageDuration: 52,
      commonObjections: ['budget', 'timeline', 'competition']
    };
  };

  const getPhaseIcon = (phaseName: string) => {
    if (phaseName.toLowerCase().includes('discovery')) return <Users className="w-5 h-5" />;
    if (phaseName.toLowerCase().includes('proposal')) return <BookOpen className="w-5 h-5" />;
    if (phaseName.toLowerCase().includes('negotiation')) return <DollarSign className="w-5 h-5" />;
    if (phaseName.toLowerCase().includes('closing')) return <Target className="w-5 h-5" />;
    return <Clock className="w-5 h-5" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-50';
      case 'at_risk': return 'text-yellow-600 bg-yellow-50';
      case 'behind': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleDragStart = (phaseId: string) => {
    setDraggedPhase(phaseId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetPhaseId: string) => {
    e.preventDefault();
    if (!draggedPhase || draggedPhase === targetPhaseId) return;

    setPlaybook(prev => {
      if (!prev) return prev;
      const phases = [...prev.phases];
      const draggedIndex = phases.findIndex(p => p.id === draggedPhase);
      const targetIndex = phases.findIndex(p => p.id === targetPhaseId);

      const [draggedPhaseData] = phases.splice(draggedIndex, 1);
      if (draggedPhaseData) {
        phases.splice(targetIndex, 0, draggedPhaseData);
      }

      return { ...prev, phases };
    });

    setDraggedPhase(null);
  };

  return (
    <>
      {/* Research Status Overlay */}
      <ResearchStatusOverlay
        status={researchStatus.status}
        onClose={() => researchStatus.reset()}
        position="top"
        size="md"
      />

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                Adaptive Sales Playbook
                <Sparkles className="w-5 h-5 ml-2 text-yellow-500" />
              </h2>
              <p className="text-sm text-gray-600">GPT-5 powered strategy for {deal.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Streaming Mode Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isStreamingMode}
                  onChange={(e) => setIsStreamingMode(e.target.checked)}
                  className="rounded"
                  disabled={loading}
                />
                <Zap className="w-4 h-4" />
                Streaming
              </label>
            </div>

            <select
              value={playbookType}
              onChange={(e) => setPlaybookType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              disabled={loading}
            >
              <option value="comprehensive">Comprehensive</option>
              <option value="aggressive">Aggressive</option>
              <option value="conservative">Conservative</option>
              <option value="relationship">Relationship-Focused</option>
              <option value="transactional">Transactional</option>
            </select>

            <div className="flex items-center gap-2">
              <ModernButton
                variant="outline"
                size="sm"
                onClick={() => generatePlaybook()}
                loading={loading}
                className="flex items-center space-x-2"
                aria-label="Generate adaptive sales playbook"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isStreamingMode ? 'Streaming...' : 'Generating...'}</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>🎯 Generate</span>
                  </>
                )}
              </ModernButton>

              {loading && activeStreams.size > 0 && (
                <ModernButton
                  variant="outline"
                  size="sm"
                  onClick={stopStreaming}
                  className="text-red-600 hover:text-red-700"
                >
                  Stop
                </ModernButton>
              )}
            </div>
          </div>
        </div>

      {/* Deal Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Deal Value</div>
            <div className="text-sm font-medium text-gray-900">
              ${deal.value?.toLocaleString() || 'TBD'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Stage</div>
            <div className="text-sm font-medium text-gray-900 capitalize">
              {deal.stage}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Company</div>
            <div className="text-sm font-medium text-gray-900">{deal.company}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Industry</div>
            <div className="text-sm font-medium text-gray-900 capitalize">
              {deal.industry || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Streaming Progress */}
      {isStreamingMode && (loading || streamingProgress > 0) && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Generation Progress
            </span>
            <span className="text-sm text-blue-600">{Math.round(streamingProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${streamingProgress}%` }}
            ></div>
          </div>

          {streamingPhases.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-blue-800">Completed Phases:</p>
              {streamingPhases.map((phase, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-blue-700">
                  <CheckCircle className="w-3 h-3" />
                  <span>{phase.name}</span>
                </div>
              ))}
            </div>
          )}

          {activeStreams.size > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              Active streams: {activeStreams.size}
            </p>
          )}
        </div>
      )}

      {playbook && (
        <>
          {/* Strategy Overview */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {playbook.strategy.name}
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  {playbook.strategy.description}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {Math.round(playbook.strategy.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Phases:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {playbook.phases.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Indicators */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Success Indicators</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playbook.successIndicators.map((indicator, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {indicator.metric}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(indicator.status)}`}>
                      {indicator.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Current: {indicator.current}</span>
                    <span className="text-xs text-gray-600">Target: {indicator.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phases */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Strategy Phases</h3>
            <div className="space-y-4">
              {playbook.phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                  draggable
                  onDragStart={() => handleDragStart(phase.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, phase.id)}
                >
                  <div
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setSelectedPhase(
                      selectedPhase === phase.id ? null : phase.id
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          {getPhaseIcon(phase.name)}
                        </div>
                        <div>
                          <h4 className="text-md font-medium text-gray-900">
                            Phase {index + 1}: {phase.name}
                          </h4>
                          <p className="text-sm text-gray-600">{phase.timeline}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {phase.tactics.length} tactics
                        </span>
                        <ModernButton
                          variant="outline"
                          size="sm"
                          onClick={() => onExecutePhase?.(phase.id)}
                          aria-label={`Execute phase ${phase.name}`}
                        >
                          Execute
                        </ModernButton>
                      </div>
                    </div>
                  </div>

                  {selectedPhase === phase.id && (
                    <div className="p-4 border-t border-gray-200">
                      {/* Objectives */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Objectives</h5>
                        <ul className="space-y-1">
                          {phase.objectives.map((objective, objIndex) => (
                            <li key={objIndex} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Tactics */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Tactics</h5>
                        <div className="space-y-3">
                          {phase.tactics.map((tactic) => (
                            <div key={tactic.id} className="p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between mb-2">
                                <h6 className="text-sm font-medium text-gray-900">
                                  {tactic.name}
                                </h6>
                                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(tactic.priority)}`}>
                                  {tactic.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{tactic.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-600">
                                <span>Effort: {tactic.estimatedEffort}</span>
                                <span>{tactic.successMetrics.length} metrics</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Milestones */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Milestones</h5>
                        <div className="space-y-2">
                          {phase.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                              <div>
                                <span className="text-sm font-medium text-gray-900">
                                  {milestone.name}
                                </span>
                                <span className="text-xs text-gray-600 ml-2">
                                  Due: {new Date(milestone.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">{milestone.owner}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  milestone.status === 'completed' ? 'bg-green-100 text-green-600' :
                                  milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {milestone.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Risk Mitigation */}
          {playbook.riskMitigation.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Mitigation</h3>
              <div className="space-y-3">
                {playbook.riskMitigation.map((risk, index) => (
                  <div key={index} className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-yellow-600 mt-1" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          {risk.risk}
                        </h4>
                        <div className="flex items-center gap-4 mb-2">
                          <span className="text-xs text-gray-600">
                            Probability: {Math.round(risk.probability * 100)}%
                          </span>
                          <span className="text-xs text-gray-600">
                            Impact: {risk.impact}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          <strong>Mitigation:</strong> {risk.mitigation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitive Positioning */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Competitive Positioning</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Our Strengths</h4>
                <ul className="space-y-1">
                  {playbook.competitivePositioning.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Win Themes</h4>
                <ul className="space-y-1">
                  {playbook.competitivePositioning.winThemes.map((theme, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{theme}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <ModernButton
              variant="primary"
              onClick={onCustomize || (() => {})}
              className="flex-1"
              aria-label="Customize the sales strategy"
            >
              🎨 Customize Strategy
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={onGenerate || (() => {})}
              className="flex-1"
              aria-label="Regenerate the playbook"
            >
              🔄 Regenerate
            </ModernButton>
          </div>
        </>
      )}

      {!playbook && !loading && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generate Sales Playbook</h3>
          <p className="text-gray-600 mb-6">
            Create a comprehensive, AI-powered strategy tailored to this specific deal and competitive landscape.
          </p>
          <ModernButton
            variant="primary"
            onClick={generatePlaybook}
            aria-label="Generate adaptive sales playbook"
          >
            🎯 Generate Playbook
          </ModernButton>
        </div>
      )}
    </GlassCard>
    </>
  );
};

