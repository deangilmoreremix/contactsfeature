import React from 'react';
import { AgentButton } from '../ai-sales-intelligence/AgentButton';

interface PipelineAIToolbarProps {
  dealId?: string;
}

export const PipelineAIToolbar: React.FC<PipelineAIToolbarProps> = ({ dealId }) => {
  const agentButtonProps = dealId ? { dealId } : {};

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">Pipeline AI Agents</h3>
          <span className="text-sm text-gray-500">Smart automation for your sales pipeline</span>
        </div>
        <div className="flex items-center space-x-2">
          <AgentButton
            agentId="ai-journeys-agent"
            variant="outline"
            size="sm"
            {...agentButtonProps}
          >
            AI Journeys
          </AgentButton>
          <AgentButton
            agentId="ai-ae-agent"
            variant="outline"
            size="sm"
            {...agentButtonProps}
          >
            AI AE
          </AgentButton>
          <AgentButton
            agentId="crm-ops-agent"
            variant="outline"
            size="sm"
            {...agentButtonProps}
          >
            CRM Ops
          </AgentButton>
          <AgentButton
            agentId="agent-builder"
            variant="outline"
            size="sm"
            {...agentButtonProps}
          >
            Agent Builder
          </AgentButton>
        </div>
      </div>
    </div>
  );
};