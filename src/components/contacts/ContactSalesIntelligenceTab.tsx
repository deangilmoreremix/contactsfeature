import React, { memo } from 'react';
import { Contact } from '../../types/contact';
import { AdaptivePlaybookGenerator } from '../ai-sales-intelligence/AdaptivePlaybookGenerator';
import { CommunicationOptimizer } from '../ai-sales-intelligence/CommunicationOptimizer';
import { DiscoveryQuestionsGenerator } from '../ai-sales-intelligence/DiscoveryQuestionsGenerator';
import { DealHealthPanel } from '../ai-sales-intelligence/DealHealthPanel';
import { SDRPersonaSelector } from './SDRPersonaSelector';
import { SDRButtonGroup } from '../deals/SDRButtonGroup';
import { Target, Settings, Brain } from 'lucide-react';

interface ContactSalesIntelligenceTabProps {
  contact: Contact;
  showAPIConfig: boolean;
  setShowAPIConfig: (show: boolean) => void;
  showAISettings: boolean;
  setShowAISettings: (show: boolean) => void;
}

export const ContactSalesIntelligenceTab: React.FC<ContactSalesIntelligenceTabProps> = memo(({
  contact,
  showAPIConfig,
  setShowAPIConfig,
  showAISettings,
  setShowAISettings
}) => {
  return (
    <div className="p-6 space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <Target className="w-6 h-6 mr-3 text-blue-600" />
              AI Sales Intelligence
            </h3>
            <p className="text-gray-600 mt-2">
              Advanced AI-powered tools for sales qualification and engagement optimization
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              5 AI Tools Available
            </span>
            <button
              onClick={() => setShowAPIConfig(true)}
              className="p-2 bg-white/50 hover:bg-white/70 rounded-lg transition-colors"
              title="API Configuration"
            >
              <Settings className="w-4 h-4 text-gray-600" />
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

      {/* SDR Personas Section */}
      <div className="mb-8">
        <SDRPersonaSelector
          contact={contact}
          categoryFilter={[
            'influencer_collab_hunter',
            'software_affiliate_partnership',
            'newsletter_sponsor_outreach',
            'affiliate_recruitment',
            'partnership_channel_reseller',
            'marketplace_seller_outreach',
            'ecommerce_wholesale_outreach',
            'product_launch_outreach',
            'beta_user_recruitment',
            'review_testimonial_request',
            'product_feedback_research',
            'pr_media_outreach',
            'investor_update_outreach'
          ]}
          title="Partnership & Growth SDRs"
          description="AI-powered SDR personas for partnerships, growth initiatives, and strategic outreach"
        />
      </div>

      {/* SDR Tasks Section */}
      <div className="mb-8">
        <SDRButtonGroup
          dealId={contact.id}
          workspaceId="default-workspace" // TODO: Get actual workspace ID
          personaId="default-persona" // TODO: Get actual persona ID
          onSequenceGenerated={(sequence) => console.log('SDR sequence generated:', sequence)}
        />
      </div>

      {/* AI Tools Grid */}
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
});