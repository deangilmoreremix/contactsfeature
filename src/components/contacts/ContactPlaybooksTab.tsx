import React, { useState } from 'react';
import { Contact } from '../../types/contact';
import { PlaybookSelector } from '../playbooks/PlaybookSelector';
import { PlaybookExecutor } from '../playbooks/PlaybookExecutor';
import { AdaptivePlaybookGenerator } from '../ai-sales-intelligence/AdaptivePlaybookGenerator';
import { CommunicationOptimizer } from '../ai-sales-intelligence/CommunicationOptimizer';
import { DiscoveryQuestionsGenerator } from '../ai-sales-intelligence/DiscoveryQuestionsGenerator';
import { DealHealthPanel } from '../ai-sales-intelligence/DealHealthPanel';
import { ModernButton } from '../ui/ModernButton';
import { SmartTooltip } from '../ui/SmartTooltip';
import {
  BookOpen,
  Target,
  ArrowLeft,
  Sparkles,
  Brain,
  MessageSquare,
  TrendingUp
} from 'lucide-react';

interface ContactPlaybooksTabProps {
  contact: Contact;
  showAPIConfig: boolean;
  setShowAPIConfig: (show: boolean) => void;
  showAISettings: boolean;
  setShowAISettings: (show: boolean) => void;
}

type PlaybookView = 'selector' | 'executor' | 'adaptive';

export const ContactPlaybooksTab: React.FC<ContactPlaybooksTabProps> = ({
  contact,
  showAPIConfig,
  setShowAPIConfig,
  showAISettings,
  setShowAISettings
}) => {
  const [currentView, setCurrentView] = useState<PlaybookView>('selector');
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null);

  const handleSelectPlaybook = (playbook: any) => {
    setSelectedPlaybook(playbook);
    setCurrentView('executor');
  };

  const handleBackToSelector = () => {
    setSelectedPlaybook(null);
    setCurrentView('selector');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'executor':
        return selectedPlaybook ? (
          <PlaybookExecutor
            playbook={selectedPlaybook}
            contact={contact}
            onBack={handleBackToSelector}
          />
        ) : null;

      case 'adaptive':
        return (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Brain className="w-6 h-6 mr-3 text-purple-600" />
                    Adaptive Sales Playbooks
                  </h3>
                  <p className="text-gray-600 mt-2">
                    AI-powered sales strategies customized for {contact.firstName || contact.name}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    AI-Generated
                  </span>
                  <button
                    onClick={() => setShowAPIConfig(true)}
                    className="p-2 bg-white/50 hover:bg-white/70 rounded-lg transition-colors"
                    title="API Configuration"
                  >
                    <Target className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowAISettings(true)}
                    className="p-2 bg-white/50 hover:bg-white/70 rounded-lg transition-colors"
                    title="AI Settings"
                  >
                    <Brain className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Adaptive Tools Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Adaptive Playbook Generator Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <AdaptivePlaybookGenerator
                  deal={{
                    id: contact.id,
                    name: `${contact.firstName} ${contact.lastName}`.trim() || contact.name,
                    value: contact.aiScore ? contact.aiScore * 1000 : 0,
                    company: contact.company,
                    stage: contact.status || 'prospect',
                    competitors: [],
                    stakeholders: [],
                    industry: contact.industry || '',
                    companySize: 100
                  }}
                  onGenerate={() => console.log('Generate playbook')}
                  onCustomize={() => console.log('Customize playbook')}
                  onExecutePhase={(phaseId) => console.log('Execute phase:', phaseId)}
                />
              </div>

              {/* Communication Optimizer Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <CommunicationOptimizer
                  content={`Hello ${contact.firstName || contact.name.split(' ')[0]},\n\nI wanted to follow up on our previous conversation about opportunities at ${contact.company}.`}
                  context={{
                    type: 'email',
                    recipient: {
                      name: contact.name,
                      role: contact.title,
                      company: contact.company,
                      relationship: contact.interestLevel === 'hot' ? 'champion' :
                                    contact.interestLevel === 'medium' ? 'existing' : 'new'
                    },
                    purpose: 'follow_up',
                    previousInteractions: 1
                  }}
                  onOptimize={(optimized) => console.log('Optimized:', optimized)}
                  onApplyOptimization={() => console.log('Apply optimization')}
                  onViewAnalytics={() => console.log('View analytics')}
                />
              </div>

              {/* Discovery Questions Generator Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <DiscoveryQuestionsGenerator
                  contact={{
                    id: contact.id,
                    name: contact.name,
                    email: contact.email,
                    company: contact.company,
                    role: contact.title,
                    industry: contact.industry || '',
                    companySize: 100
                  }}
                  meetingContext={{
                    type: 'discovery',
                    duration: 30,
                    objective: `Understand ${contact.firstName || contact.name.split(' ')[0]}'s needs and qualify the opportunity`,
                    previousMeetings: 0
                  }}
                  onCopyQuestions={(questions) => {
                    navigator.clipboard.writeText(questions.join('\n\n'));
                    alert('Questions copied to clipboard!');
                  }}
                  onRegenerate={() => console.log('Regenerate questions')}
                  onSaveTemplate={() => {
                    alert('Question template saved!');
                  }}
                />
              </div>

              {/* Deal Health Panel Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <DealHealthPanel
                  deal={{
                    id: contact.id,
                    name: `${contact.firstName} ${contact.lastName}`.trim() || contact.name,
                    value: contact.aiScore ? contact.aiScore * 1000 : 0,
                    company: contact.company,
                    stage: contact.status || 'prospect',
                    closeDate: '',
                    competitors: [],
                    stakeholders: [],
                    lastActivity: contact.updatedAt
                  }}
                  onRunAnalysis={() => console.log('Run analysis')}
                  onGenerateReport={() => {
                    const report = `
Deal Health Report for ${contact.name}

Overall Health Score: ${contact.aiScore || 75}/100
Risk Level: Low
Next Steps: Schedule follow-up meeting
                    `;
                    navigator.clipboard.writeText(report);
                    alert('Health report copied to clipboard!');
                  }}
                  onViewRecommendations={() => {
                    alert('View recommendations clicked');
                  }}
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            {/* Playbook Type Selection */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Playbook Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SmartTooltip featureId="recurring-revenue-playbooks">
                  <button
                    onClick={() => setCurrentView('selector')}
                    className="p-6 border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all text-left group"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Recurring Revenue Playbooks</h4>
                        <p className="text-sm text-gray-600">60-day processes for scalable local businesses</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      Specialized strategies for converting local businesses into long-term recurring revenue clients with proven 60-day execution frameworks.
                    </p>
                  </button>
                </SmartTooltip>

                <SmartTooltip featureId="adaptive-sales-playbooks">
                  <button
                    onClick={() => setCurrentView('adaptive')}
                    className="p-6 border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all text-left group"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <Brain className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Adaptive Sales Playbooks</h4>
                        <p className="text-sm text-gray-600">AI-generated strategies for any deal</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      Dynamic, AI-powered sales strategies that adapt to your specific contact's situation and industry requirements.
                    </p>
                  </button>
                </SmartTooltip>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-green-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ModernButton
                  onClick={() => setCurrentView('selector')}
                  className="flex items-center justify-center space-x-2 h-12"
                  variant="outline"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Browse Recurring Revenue Playbooks</span>
                </ModernButton>

                <ModernButton
                  onClick={() => setCurrentView('adaptive')}
                  className="flex items-center justify-center space-x-2 h-12"
                  variant="outline"
                >
                  <Brain className="w-4 h-4" />
                  <span>Generate AI Playbook</span>
                </ModernButton>

                <ModernButton
                  onClick={() => {/* Open SDR Modal */}}
                  className="flex items-center justify-center space-x-2 h-12"
                  variant="primary"
                >
                  <Target className="w-4 h-4" />
                  <span>Launch SDR Campaign</span>
                </ModernButton>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      {currentView !== 'selector' && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={() => setCurrentView('selector')}
            className="hover:text-blue-600 transition-colors"
          >
            Playbooks
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {currentView === 'executor' ? 'Execute Playbook' : 'Adaptive Strategies'}
          </span>
          {selectedPlaybook && (
            <>
              <span>/</span>
              <span className="text-gray-900 font-medium">{selectedPlaybook.name}</span>
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      {renderContent()}
    </div>
  );
};