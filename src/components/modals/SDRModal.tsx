import React, { useState, useEffect } from 'react';
import { Contact } from '../../types/contact';
import { SDRPersonaSelector } from '../contacts/SDRPersonaSelector';
import { SDRButtonGroup } from '../deals/SDRButtonGroup';
import { ContactOutboundAgentPanel } from '../contacts/ContactOutboundAgentPanel';
import { FollowUpSDRAgent } from '../sdr/FollowUpSDRAgent';
import { WinBackSDRAgent } from '../sdr/WinBackSDRAgent';
import { ModernButton } from '../ui/ModernButton';
import { SmartTooltip } from '../ui/SmartTooltip';
import {
  X,
  Users,
  Zap,
  Bot,
  Target,
  Settings,
  TrendingUp,
  Activity
} from 'lucide-react';

interface SDRModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
}

type SDRTab = 'personas' | 'sequences' | 'automation' | 'quick-actions';

export const SDRModal: React.FC<SDRModalProps> = ({
  isOpen,
  onClose,
  contact
}) => {
  const [activeTab, setActiveTab] = useState<SDRTab>('personas');
  const [campaignMetrics, setCampaignMetrics] = useState({
    activeSequences: 3,
    responseRate: 24,
    meetingsBooked: 12,
    revenueGenerated: 185000
  });
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);

  // Simulate live campaign updates
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setIsLiveUpdating(true);
      setCampaignMetrics(prev => ({
        activeSequences: Math.min(prev.activeSequences + Math.floor(Math.random() * 2), 8),
        responseRate: Math.min(prev.responseRate + Math.floor(Math.random() * 2), 35),
        meetingsBooked: prev.meetingsBooked + Math.floor(Math.random() * 2),
        revenueGenerated: prev.revenueGenerated + Math.floor(Math.random() * 5000)
      }));

      setTimeout(() => setIsLiveUpdating(false), 1000);
    }, 8000); // Update every 8 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  // Mock excellent SDR results for demo contacts
  const mockSDRExecution = contact.isMockData ? {
    personaResults: {
      'cold_saas_founder': {
        executed: true,
        results: 'Campaign sent to 50 qualified SaaS founders. 23% open rate, 8% click rate. Generated 3 qualified meetings.',
        metrics: { sent: 50, opened: 11, clicked: 4, meetings: 3 }
      },
      'b2b_saas_sdr': {
        executed: true,
        results: 'B2B SDR sequence deployed to 75 enterprise contacts. 31% open rate, 12% response rate. 5 discovery calls scheduled.',
        metrics: { sent: 75, opened: 23, responses: 9, calls: 5 }
      }
    },
    sequenceResults: {
      'sdr_follow_up': {
        executed: true,
        results: '10-day follow-up sequence sent to 25 inactive leads. 18% re-engagement rate, 2 deals reactivated worth $45K.',
        metrics: { sent: 25, reengaged: 4, deals: 2, value: 45000, duration: '10 days' }
      },
      'sdr_cold_email': {
        executed: true,
        results: '30-day cold email sequence deployed to 100 prospects. 15% response rate, 8 discovery calls booked.',
        metrics: { sent: 100, responses: 15, calls: 8, duration: '30 days' }
      },
      'sdr_winback': {
        executed: true,
        results: '20-day win-back sequence sent to 30 churned customers. 23% re-engagement, 4 customers returned worth $75K.',
        metrics: { sent: 30, reengaged: 7, returned: 4, value: 75000, duration: '20 days' }
      },
      'sdr_objection_handler': {
        executed: true,
        results: '15-day objection handling sequence deployed to 12 price-sensitive prospects. 7 overcame objections, 3 moved to proposal stage.',
        metrics: { sent: 12, overcame: 7, proposals: 3, duration: '15 days' }
      }
    },
    automationResults: {
      activeSequences: 3,
      totalContacts: 87,
      responseRate: '24%',
      meetingsBooked: 12,
      dealsClosed: 3,
      revenueGenerated: 185000
    },
    sequenceExamples: {
      shortSequence: {
        name: 'Quick Follow-up (10 days)',
        steps: [
          { day: 1, subject: 'Following up on our conversation', channel: 'email' },
          { day: 3, subject: 'Quick check-in', channel: 'email' },
          { day: 7, subject: 'Value add resource', channel: 'email' },
          { day: 10, subject: 'Final follow-up', channel: 'email' }
        ]
      },
      mediumSequence: {
        name: 'Win-back Campaign (20 days)',
        steps: [
          { day: 1, subject: 'We miss working with you', channel: 'email' },
          { day: 5, subject: 'Special return offer', channel: 'email' },
          { day: 10, subject: 'Customer success story', channel: 'email' },
          { day: 15, subject: 'Personalized solution', channel: 'email' },
          { day: 20, subject: 'Final opportunity', channel: 'email' }
        ]
      },
      longSequence: {
        name: 'Cold Outreach (30 days)',
        steps: [
          { day: 1, subject: 'Introduction and value prop', channel: 'email' },
          { day: 3, subject: 'Social proof and case study', channel: 'email' },
          { day: 7, subject: 'Educational content', channel: 'email' },
          { day: 10, subject: 'Question to engage', channel: 'email' },
          { day: 14, subject: 'Value demonstration', channel: 'email' },
          { day: 18, subject: 'Social validation', channel: 'email' },
          { day: 22, subject: 'Scarcity and urgency', channel: 'email' },
          { day: 26, subject: 'Final value proposition', channel: 'email' },
          { day: 30, subject: 'Last chance offer', channel: 'email' }
        ]
      }
    }
  } : null;

  if (!isOpen) return null;

  const tabs = [
    { id: 'personas' as SDRTab, label: 'Personas', icon: Users, description: 'AI SDR personas for different outreach scenarios' },
    { id: 'sequences' as SDRTab, label: 'Sequences', icon: Zap, description: 'Generate personalized SDR email sequences' },
    { id: 'automation' as SDRTab, label: 'Automation', icon: Bot, description: 'Configure automated email agents' },
    { id: 'quick-actions' as SDRTab, label: 'Quick Actions', icon: Target, description: 'Follow-up and win-back SDR campaigns' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personas':
        return (
          <div className="space-y-6">
            <SDRPersonaSelector
              contact={contact}
              title="All SDR Personas"
              description="Select from all available AI-powered SDR personas for your outreach campaign"
            />
          </div>
        );

      case 'sequences':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Zap className="w-6 h-6 mr-3 text-blue-600" />
                    AI SDR Sequences
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Generate personalized email sequences (7-30 days) for {contact.firstName || contact.name}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    14 Sequence Types
                  </span>
                </div>
              </div>
            </div>

            <SDRButtonGroup
              dealId={contact.id}
              workspaceId="default-workspace"
              personaId="default-persona"
              contact={contact}
              onSequenceGenerated={(sequence) => console.log('SDR sequence generated:', sequence)}
            />
          </div>
        );

      case 'automation':
        return (
          <div className="space-y-6">
            <ContactOutboundAgentPanel
              contact={contact}
              onSettingsChange={(settings) => console.log('Agent settings changed:', settings)}
            />
          </div>
        );

      case 'quick-actions':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FollowUpSDRAgent />
            <WinBackSDRAgent />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white rounded-xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col animate-scale-in shadow-2xl"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                SDR Campaigns
                <span className="ml-2 text-lg font-normal text-gray-600">for {contact.firstName || contact.name}</span>
              </h2>
              <p className="text-gray-600">
                AI-powered sales development tools and automation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Live Campaign Metrics */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green-600 animate-pulse" />
              <span className="text-sm font-medium text-gray-700">Live Campaign Performance</span>
              {isLiveUpdating && <span className="text-xs text-green-600 animate-pulse">● Updating...</span>}
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-1">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{campaignMetrics.activeSequences}</span>
                <span className="text-gray-600">Active</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="font-medium">{campaignMetrics.responseRate}%</span>
                <span className="text-gray-600">Response</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{campaignMetrics.meetingsBooked}</span>
                <span className="text-gray-600">Meetings</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="font-medium text-green-600">${Math.floor(campaignMetrics.revenueGenerated / 1000)}K</span>
                <span className="text-gray-600">Revenue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <SmartTooltip key={tab.id} featureId={`sdr-tab-${tab.id}`}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 text-center border-b-2 transition-all ${
                    isActive
                      ? 'border-blue-500 bg-white text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 mx-auto mb-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="font-medium text-sm">{tab.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{tab.description}</div>
                </button>
              </SmartTooltip>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {/* Mock Results Display for Demo Contacts */}
            {contact.isMockData && mockSDRExecution && (
              <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-green-600" />
                    SDR Campaign Results
                  </h2>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Live Demo Data
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600 font-medium mb-1">Active Sequences</div>
                    <div className="text-2xl font-bold text-green-900">{mockSDRExecution.automationResults.activeSequences}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium mb-1">Response Rate</div>
                    <div className="text-2xl font-bold text-blue-900">{mockSDRExecution.automationResults.responseRate}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-600 font-medium mb-1">Revenue Generated</div>
                    <div className="text-2xl font-bold text-purple-900">${mockSDRExecution.automationResults.revenueGenerated.toLocaleString()}</div>
                  </div>
                </div>

                {/* Sequence Duration Examples */}
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-blue-600" />
                    Sequence Duration Examples
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(mockSDRExecution.sequenceExamples).map(([key, sequence]) => (
                      <div key={key} className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">{sequence.name}</h4>
                        <div className="space-y-1">
                          {sequence.steps.slice(0, 4).map((step, i) => (
                            <div key={i} className="flex items-center text-xs text-gray-600">
                              <span className="w-8 text-gray-400">Day {step.day}:</span>
                              <span className="truncate">{step.subject}</span>
                            </div>
                          ))}
                          {sequence.steps.length > 4 && (
                            <div className="text-xs text-gray-400">+{sequence.steps.length - 4} more steps...</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-gray-600 mt-4">
                  <strong>Demo Results:</strong> {mockSDRExecution.automationResults.meetingsBooked} meetings booked, {mockSDRExecution.automationResults.dealsClosed} deals closed from automated SDR campaigns with varying sequence durations.
                </div>
              </div>
            )}

            {renderTabContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <SmartTooltip featureId="sdr-modal-info">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>All SDR campaigns use GPT-5.2 AI for personalization</span>
              </div>
            </SmartTooltip>
          </div>

          <div className="flex items-center space-x-3">
            <ModernButton
              variant="outline"
              onClick={onClose}
            >
              Close
            </ModernButton>
          </div>
        </div>
      </div>
    </div>
  );
};