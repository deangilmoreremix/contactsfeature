import React, { memo } from 'react';
import { Contact } from '../../../types';
import { AdaptivePlaybookGenerator } from '../../ai-sales-intelligence/AdaptivePlaybookGenerator';
import { CommunicationOptimizer } from '../../ai-sales-intelligence/CommunicationOptimizer';
import { DiscoveryQuestionsGenerator } from '../../ai-sales-intelligence/DiscoveryQuestionsGenerator';
import { DealHealthPanel } from '../../ai-sales-intelligence/DealHealthPanel';
import { Target } from 'lucide-react';

interface ContactSalesIntelligenceTabProps {
  contact: Contact;
}

export const ContactSalesIntelligenceTab: React.FC<ContactSalesIntelligenceTabProps> = memo(({
  contact
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
              4 AI Tools Available
            </span>
          </div>
        </div>
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
            onOptimize={(optimized) => console.log('Communication optimized:', optimized)}
            onApplyOptimization={() => console.log('Applied optimization')}
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
            onSaveTemplate={() => console.log('Save template')}
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
            onGenerateReport={() => console.log('Generate report')}
            onViewRecommendations={() => console.log('View recommendations')}
          />
        </div>
      </div>
    </div>
  );
});