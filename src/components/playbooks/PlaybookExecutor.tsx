import React, { useState } from 'react';
import { Playbook } from '../../data/playbooks';
import { Contact } from '../../types/contact';
import { SDRModal } from '../modals/SDRModal';
import { ModernButton } from '../ui/ModernButton';
import { SmartTooltip } from '../ui/SmartTooltip';
import {
  Play,
  CheckCircle,
  Clock,
  Users,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Target,
  TrendingUp,
  Zap,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface PlaybookExecutorProps {
  playbook: Playbook;
  contact: Contact;
  onBack: () => void;
}

export const PlaybookExecutor: React.FC<PlaybookExecutorProps> = ({
  playbook,
  contact,
  onBack
}) => {
  const [currentPhase, setCurrentPhase] = useState(0);
  // Mock excellent customer progress - show realistic completion
  const [completedPhases, setCompletedPhases] = useState<Set<number>>(new Set([0, 1]));
  const [showSDRModal, setShowSDRModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');

  // Mock execution data showing excellent customer results
  const mockExecutionData = {
    phaseProgress: [
      { completed: true, results: "Successfully identified marketing pain points, established credibility through case studies, and scheduled discovery call. Lead qualified with $15K monthly marketing budget." },
      { completed: true, results: "Conducted comprehensive marketing audit revealing 40% wasted ad spend. Presented ROI-focused value proposition showing 300% improvement potential. Client engaged and requested detailed proposal." },
      { completed: false, results: "Currently in proposal phase - client reviewing $6,000/month retainer proposal with performance bonuses. Decision maker is CEO with timeline for implementation within 30 days." }
    ],
    contactActivity: [
      { date: "2024-12-15", action: "Initial SDR campaign sent", type: "email", result: "Opened and clicked case study link" },
      { date: "2024-12-16", action: "Discovery call scheduled", type: "phone", result: "30-minute call booked for tomorrow" },
      { date: "2024-12-17", action: "Marketing audit delivered", type: "email", result: "Client responded positively, requested meeting extension" },
      { date: "2024-12-18", action: "Proposal delivered", type: "presentation", result: "Client reviewing internally, follow-up scheduled" }
    ],
    aiInsights: {
      sentiment: "Highly Engaged",
      nextBestAction: "Schedule stakeholder presentation",
      conversionProbability: "85%",
      estimatedValue: "$72,000 annual recurring revenue"
    }
  };

  const handlePhaseComplete = (phaseIndex: number) => {
    setCompletedPhases(prev => new Set([...prev, phaseIndex]));
    if (phaseIndex < playbook.phases.length - 1) {
      setCurrentPhase(phaseIndex + 1);
    }
  };

  const handlePlatformAction = (action: string) => {
    setSelectedAction(action);
    setShowSDRModal(true);
  };

  const getContactIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'email': return Mail;
      case 'phone': return Phone;
      case 'linkedin': return MessageSquare;
      case 'in-person': case 'presentation': case 'workshop': return Users;
      case 'video call': return Calendar;
      default: return MessageSquare;
    }
  };

  const getPhaseStatus = (phaseIndex: number) => {
    if (completedPhases.has(phaseIndex)) return 'completed';
    if (phaseIndex === currentPhase) return 'current';
    if (phaseIndex < currentPhase) return 'completed';
    return 'upcoming';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <ModernButton
              variant="outline"
              size="sm"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Playbooks</span>
            </ModernButton>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{playbook.name}</h1>
              <p className="text-gray-600">Executing for {contact.firstName || contact.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="text-lg font-semibold text-gray-900">
                {completedPhases.size}/{playbook.phases.length} Phases
              </div>
            </div>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Playbook Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Strategy</h3>
              <p className="text-gray-700">{playbook.strategy}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue Focus</h3>
              <p className="text-gray-700">{playbook.revenueFocus}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Growth Potential</h3>
              <p className="text-gray-700 font-medium text-green-600">{playbook.growthPotential}</p>
            </div>
          </div>
        </div>

        {/* AI Insights Dashboard */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-600" />
              AI Insights Dashboard
            </h2>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              GPT-5.2 Analysis
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 font-medium mb-1">Lead Sentiment</div>
              <div className="text-2xl font-bold text-blue-900">{mockExecutionData.aiInsights.sentiment}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium mb-1">Conversion Probability</div>
              <div className="text-2xl font-bold text-green-900">{mockExecutionData.aiInsights.conversionProbability}</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 font-medium mb-1">Next Best Action</div>
              <div className="text-lg font-bold text-purple-900">{mockExecutionData.aiInsights.nextBestAction}</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-orange-600 font-medium mb-1">Estimated Value</div>
              <div className="text-lg font-bold text-orange-900">{mockExecutionData.aiInsights.estimatedValue}</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-600" />
            Recent Contact Activity
          </h2>
          <div className="space-y-3">
            {mockExecutionData.contactActivity.map((activity, index) => {
              const Icon = getContactIcon(activity.type);
              return (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{activity.action}</span>
                      <span className="text-sm text-gray-500">{activity.date}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.result}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">60-Day Execution Timeline</h2>
            <p className="text-gray-600 mt-1">Follow each phase to convert this lead into a recurring revenue client</p>
          </div>

          <div className="divide-y divide-gray-200">
            {playbook.phases.map((phase, index) => {
              const status = getPhaseStatus(index);
              const isExpanded = index === currentPhase;

              return (
                <div key={index} className="p-6">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setCurrentPhase(index)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        status === 'completed' ? 'bg-green-500 text-white' :
                        status === 'current' ? 'bg-blue-500 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {status === 'completed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
                        <p className="text-sm text-gray-600">{phase.duration}</p>
                      </div>
                    </div>

                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`} />
                  </div>

                  {isExpanded && (
                    <div className="mt-6 space-y-6">
                      {/* Phase Results (for completed phases) */}
                      {mockExecutionData.phaseProgress[index] && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-900">Phase Results</span>
                          </div>
                          <p className="text-green-800">{mockExecutionData.phaseProgress[index].results}</p>
                        </div>
                      )}

                      {/* Objectives */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Phase Objectives</h4>
                        <div className="space-y-2">
                          {phase.objectives.map((objective, objIndex) => (
                            <div key={objIndex} className="flex items-start space-x-3">
                              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{objective}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Contact Methods */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Contact Methods & Cadence</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {playbook.contactCadence.map((cadence, cadenceIndex) => {
                            const Icon = getContactIcon(cadence.method);
                            return (
                              <div key={cadenceIndex} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                  <div className="font-medium text-gray-900">{cadence.method}</div>
                                  <div className="text-sm text-gray-600">{cadence.frequency}</div>
                                  <div className="text-xs text-gray-500 mt-1">{cadence.purpose}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Platform Actions */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Platform Actions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {phase.platformActions.map((action, actionIndex) => (
                            <SmartTooltip key={actionIndex} featureId={`phase-action-${index}-${actionIndex}`}>
                              <button
                                onClick={() => handlePlatformAction(action)}
                                className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left w-full"
                              >
                                <Zap className="w-5 h-5 text-blue-600" />
                                <div>
                                  <div className="font-medium text-blue-900">{action}</div>
                                  <div className="text-sm text-blue-700">Click to execute</div>
                                </div>
                              </button>
                            </SmartTooltip>
                          ))}
                        </div>
                      </div>

                      {/* Phase Actions */}
                      {status !== 'completed' && (
                        <div className="flex justify-end pt-4 border-t border-gray-200">
                          <ModernButton
                            onClick={() => handlePhaseComplete(index)}
                            className="flex items-center space-x-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Mark Phase Complete</span>
                          </ModernButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Success Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Success Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playbook.successMetrics.map((metric, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">{metric.metric}</span>
                </div>
                <div className="text-2xl font-bold text-green-600 mb-1">{metric.target}</div>
                <div className="text-sm text-gray-600">{metric.timeframe}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SDR Modal */}
      {showSDRModal && (
        <SDRModal
          isOpen={showSDRModal}
          onClose={() => setShowSDRModal(false)}
          contact={contact}
        />
      )}
    </>
  );
};