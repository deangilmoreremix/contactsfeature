import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { analyticsService } from '../../services/analyticsService';
import { cacheService } from '../../services/cacheService';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { BookOpen, Sparkles, Brain, Loader2 } from 'lucide-react';
import { ResearchThinkingAnimation, useResearchThinking } from '../ui/ResearchThinkingAnimation';
import { ResearchStatusOverlay, useResearchStatus } from '../ui/ResearchStatusOverlay';
import { PlaybookHeader } from './PlaybookHeader';
import { StreamingProgress } from './StreamingProgress';
import { PlaybookStrategy } from './PlaybookStrategy';
import { PlaybookPhases } from './PlaybookPhases';
import { PlaybookRisks } from './PlaybookRisks';

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
        <PlaybookHeader
          deal={deal}
          loading={loading}
          isStreamingMode={isStreamingMode}
          playbookType={playbookType}
          onStreamingModeChange={setIsStreamingMode}
          onPlaybookTypeChange={(type) => setPlaybookType(type as any)}
          onGenerate={() => generatePlaybook()}
          onStopStreaming={activeStreams.size > 0 ? stopStreaming : undefined}
          activeStreams={activeStreams}
        />

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

      <StreamingProgress
        isStreamingMode={isStreamingMode}
        loading={loading}
        streamingProgress={streamingProgress}
        streamingPhases={streamingPhases}
        activeStreams={activeStreams}
      />

      {playbook && (
        <>
          <PlaybookStrategy strategy={playbook.strategy} />

          <PlaybookPhases
            phases={playbook.phases}
            onExecutePhase={onExecutePhase || (() => {})}
          />

          <PlaybookRisks
            riskMitigation={playbook.riskMitigation}
            successIndicators={playbook.successIndicators}
            competitivePositioning={playbook.competitivePositioning}
          />

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

