import React from 'react';
import { Contact } from '../../types/contact';
import { ColdEmailSDRAgent } from '../sdr/ColdEmailSDRAgent';
import { FollowUpSDRAgent } from '../sdr/FollowUpSDRAgent';
import { ObjectionHandlerSDRAgent } from '../sdr/ObjectionHandlerSDRAgent';
import { ReactivationSDRAgent } from '../sdr/ReactivationSDRAgent';
import { WinBackSDRAgent } from '../sdr/WinBackSDRAgent';
import { DiscoverySDRAgent } from '../sdr/DiscoverySDRAgent';
import { Target, Mail, MessageSquare, AlertTriangle, RotateCcw, Trophy, Search } from 'lucide-react';

interface ContactSDRPanelProps {
  contact: Contact;
}

export const ContactSDRPanel: React.FC<ContactSDRPanelProps> = ({ contact }) => {
  const sdrAgents = [
    {
      id: 'cold-email',
      component: ColdEmailSDRAgent,
      icon: Mail,
      title: 'Cold Email SDR',
      description: 'Send personalized cold emails to initiate contact'
    },
    {
      id: 'follow-up',
      component: FollowUpSDRAgent,
      icon: MessageSquare,
      title: 'Follow-Up SDR',
      description: 'Automated follow-up sequences for nurturing leads'
    },
    {
      id: 'objection-handler',
      component: ObjectionHandlerSDRAgent,
      icon: AlertTriangle,
      title: 'Objection Handler SDR',
      description: 'Handle common sales objections intelligently'
    },
    {
      id: 'reactivation',
      component: ReactivationSDRAgent,
      icon: RotateCcw,
      title: 'Re-Activation SDR',
      description: 'Re-engage dormant or inactive contacts'
    },
    {
      id: 'win-back',
      component: WinBackSDRAgent,
      icon: Trophy,
      title: 'Win-Back SDR',
      description: 'Recover lost deals and churned customers'
    },
    {
      id: 'discovery',
      component: DiscoverySDRAgent,
      icon: Search,
      title: 'Discovery SDR',
      description: 'Research and qualify prospects with AI intelligence'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Target className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">SDR Agents</h3>
          <p className="text-sm text-gray-600">
            AI-powered Sales Development Representatives for {contact.firstName || contact.name}
          </p>
        </div>
      </div>

      {/* SDR Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sdrAgents.map((agent) => {
          const AgentComponent = agent.component;
          const Icon = agent.icon;

          return (
            <div key={agent.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{agent.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                </div>
              </div>

              <AgentComponent contact={contact} />
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Target className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">About SDR Agents</h4>
            <p className="text-sm text-blue-800 mt-1">
              These AI-powered Sales Development Representatives automate various stages of your sales process.
              Each agent is specialized for different scenarios and can work independently or in coordination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};