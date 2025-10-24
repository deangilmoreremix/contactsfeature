import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { BookOpen, Target, TrendingUp, CheckCircle, Clock, Users, DollarSign, Sparkles, Brain } from 'lucide-react';
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

  // Research state management (matching AIInsightsPanel pattern)
  const researchThinking = useResearchThinking();
  const researchStatus = useResearchStatus();

  const generatePlaybook = async () => {
    setLoading(true);
    researchThinking.startResearch('🎯 Generating AI-powered sales playbook...');

    try {
      researchThinking.moveToAnalyzing('🧠 Analyzing deal data and market conditions...');

      // Check if this is mock data (similar to other components)
      const isMockData = deal.id.startsWith('mock') || deal.company === 'Demo Company' || deal.name.includes('Demo');

      if (isMockData) {
        // For mock contacts, simulate playbook generation with mock data
        researchThinking.moveToAnalyzing('🔍 Researching company and market data...');

        // Simulate research delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        researchThinking.moveToSynthesizing('📋 Synthesizing strategic recommendations...');

        // Generate mock playbook data
        const mockPlaybook: PlaybookStrategy = {
          dealId: deal.id,
          strategy: {
            name: 'Strategic Growth Playbook',
            description: `Comprehensive sales strategy for ${deal.name} at ${deal.company}. Focus on relationship building and value demonstration.`,
            confidence: 0.85,
            rationale: 'Based on industry analysis and company profile, this strategy emphasizes consultative selling and ROI-focused messaging.'
          },
          phases: [
            {
              id: 'phase-1',
              name: 'Discovery & Research',
              timeline: 'Week 1-2',
              objectives: [
                'Understand business challenges and goals',
                'Identify key decision makers and influencers',
                'Map current technology stack and processes'
              ],
              tactics: [
                {
                  id: 'tactic-1',
                  name: 'Stakeholder Mapping',
                  description: 'Identify and research all stakeholders involved in the decision process',
                  priority: 'high',
                  estimatedEffort: '2-3 hours',
                  successMetrics: ['Stakeholder map completed', 'Key contacts identified'],
                  dependencies: []
                },
                {
                  id: 'tactic-2',
                  name: 'Needs Assessment',
                  description: 'Conduct thorough discovery to understand pain points and requirements',
                  priority: 'high',
                  estimatedEffort: '1-2 hours',
                  successMetrics: ['Discovery call completed', 'Requirements documented'],
                  dependencies: ['Stakeholder Mapping']
                }
              ],
              milestones: [
                {
                  id: 'milestone-1',
                  name: 'Initial Discovery Complete',
                  description: 'Complete stakeholder mapping and needs assessment',
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  owner: 'Sales Rep',
                  status: 'pending'
                }
              ]
            },
            {
              id: 'phase-2',
              name: 'Solution Presentation',
              timeline: 'Week 3-4',
              objectives: [
                'Present tailored solution addressing identified needs',
                'Demonstrate ROI and value proposition',
                'Address objections and concerns'
              ],
              tactics: [
                {
                  id: 'tactic-3',
                  name: 'Customized Demo',
                  description: 'Deliver personalized product demonstration based on discovery findings',
                  priority: 'high',
                  estimatedEffort: '2-3 hours',
                  successMetrics: ['Demo delivered', 'Feedback collected'],
                  dependencies: ['Needs Assessment']
                },
                {
                  id: 'tactic-4',
                  name: 'ROI Analysis',
                  description: 'Present detailed ROI analysis and business case',
                  priority: 'medium',
                  estimatedEffort: '1-2 hours',
                  successMetrics: ['ROI document shared', 'Business case accepted'],
                  dependencies: ['Customized Demo']
                }
              ],
              milestones: [
                {
                  id: 'milestone-2',
                  name: 'Solution Presented',
                  description: 'Complete demo and ROI presentation',
                  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                  owner: 'Sales Rep',
                  status: 'pending'
                }
              ]
            },
            {
              id: 'phase-3',
              name: 'Negotiation & Close',
              timeline: 'Week 5-6',
              objectives: [
                'Negotiate terms and pricing',
                'Overcome final objections',
                'Secure commitment and close deal'
              ],
              tactics: [
                {
                  id: 'tactic-5',
                  name: 'Contract Negotiation',
                  description: 'Negotiate terms, pricing, and implementation timeline',
                  priority: 'high',
                  estimatedEffort: '3-5 hours',
                  successMetrics: ['Terms agreed', 'Contract drafted'],
                  dependencies: ['Solution Presented']
                },
                {
                  id: 'tactic-6',
                  name: 'Final Close',
                  description: 'Secure signature and transition to implementation',
                  priority: 'high',
                  estimatedEffort: '1-2 hours',
                  successMetrics: ['Contract signed', 'Deal closed'],
                  dependencies: ['Contract Negotiation']
                }
              ],
              milestones: [
                {
                  id: 'milestone-3',
                  name: 'Deal Closed',
                  description: 'Contract signed and deal completed',
                  dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
                  owner: 'Sales Rep',
                  status: 'pending'
                }
              ]
            }
          ],
          riskMitigation: [
            {
              risk: 'Budget constraints',
              probability: 0.3,
              impact: 'High - may delay or cancel purchase',
              mitigation: 'Emphasize ROI and offer flexible payment terms. Prepare alternative pricing tiers.'
            },
            {
              risk: 'Competitor activity',
              probability: 0.4,
              impact: 'Medium - may influence decision',
              mitigation: 'Highlight unique differentiators and provide competitive analysis. Schedule regular check-ins.'
            }
          ],
          successIndicators: [
            {
              metric: 'Engagement Score',
              target: '85%',
              current: '72%',
              status: 'on_track'
            },
            {
              metric: 'Response Time',
              target: '< 24 hours',
              current: '< 12 hours',
              status: 'on_track'
            },
            {
              metric: 'Meeting Attendance',
              target: '100%',
              current: '100%',
              status: 'on_track'
            }
          ],
          competitivePositioning: {
            strengths: [
              'Superior customer support and implementation',
              'Advanced AI capabilities',
              'Flexible pricing and payment options',
              'Strong industry expertise'
            ],
            weaknesses: [],
            differentiation: [
              'AI-powered insights and automation',
              'Proactive customer success management',
              'Industry-specific solutions'
            ],
            winThemes: [
              'ROI-focused messaging',
              'Partnership approach',
              'Innovation and technology leadership'
            ]
          }
        };

        setPlaybook(mockPlaybook);
        researchThinking.complete('✅ Mock playbook generated successfully!');
      } else {
        // Real playbook generation for non-mock contacts
        const response = await supabase.functions.invoke('adaptive-playbook', {
          body: {
            dealData: deal,
            companyProfile: getCompanyProfile(deal.company),
            competitiveAnalysis: getCompetitiveAnalysis(deal.competitors || []),
            historicalData: getSimilarDeals(deal),
            model: 'gpt-5' // Use GPT-5 for advanced reasoning
          }
        });

        researchThinking.moveToSynthesizing('📋 Synthesizing strategic recommendations...');

        if (response.data?.playbook) {
          setPlaybook(response.data.playbook);
          researchThinking.complete('✅ AI playbook generated successfully!');
        } else {
          throw new Error('No playbook data received');
        }
      }
    } catch (error) {
      console.error('Failed to generate playbook:', error);
      researchThinking.complete('❌ Failed to generate playbook');
    } finally {
      setLoading(false);
    }
  };

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
          <ModernButton
            variant="outline"
            size="sm"
            onClick={generatePlaybook}
            loading={loading}
            className="flex items-center space-x-2"
            aria-label="Generate adaptive sales playbook"
          >
            <Brain className="w-4 h-4" />
            <span>{loading ? 'Generating...' : '🎯 Generate'}</span>
          </ModernButton>
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

