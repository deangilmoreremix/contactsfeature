import React from 'react';
import { AgentButton } from '../ai-sales-intelligence/AgentButton';
import { Contact } from '../../types';

interface ContactAIToolbarProps {
  contact: Contact;
}

export const ContactAIToolbar: React.FC<ContactAIToolbarProps> = ({ contact }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">AI Agents</h3>
          <span className="text-sm text-gray-500">Smart automation for {contact.name}</span>
        </div>
        <div className="flex items-center space-x-2">
          <AgentButton
            agentId="ai-sdr-agent"
            contactId={contact.id}
            variant="outline"
            size="sm"
          >
            AI SDR
          </AgentButton>
          <AgentButton
            agentId="ai-dialer-agent"
            contactId={contact.id}
            variant="outline"
            size="sm"
          >
            AI Dialer
          </AgentButton>
          <AgentButton
            agentId="signals-agent"
            contactId={contact.id}
            variant="outline"
            size="sm"
          >
            Signals
          </AgentButton>
          <AgentButton
            agentId="lead-db-agent"
            contactId={contact.id}
            variant="outline"
            size="sm"
          >
            Lead DB
          </AgentButton>
          <AgentButton
            agentId="meetings-agent"
            contactId={contact.id}
            variant="outline"
            size="sm"
          >
            Meetings
          </AgentButton>
        </div>
      </div>
    </div>
  );
};