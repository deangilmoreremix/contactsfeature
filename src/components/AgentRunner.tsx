import React, { useState, useEffect } from 'react';
import { agentFramework, type AgentExecutionRequest } from '../services/agentFramework';
import { agentService } from '../services/agentService';
import type { AgentConfig } from '../types/agent';
import { ModernButton } from './ui/ModernButton';
import { GlassCard } from './ui/GlassCard';
import {
  Bot,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Settings,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Users,
  TrendingUp,
  Database,
  Phone,
  Calendar,
  Zap
} from 'lucide-react';

interface AgentRunnerProps {
  contactId?: string;
  dealId?: string;
  onAgentComplete?: (result: any) => void;
}

export const AgentRunner: React.FC<AgentRunnerProps> = ({
  contactId,
  dealId,
  onAgentComplete
}) => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const agentList = await agentService.loadAllAgents();
      setAgents(agentList);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const getAgentIcon = (agentName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'AI SDR Agent': <MessageSquare className="w-5 h-5" />,
      'AI Dialer Agent': <Phone className="w-5 h-5" />,
      'AI Journeys Agent': <Zap className="w-5 h-5" />,
      'Signals Agent': <TrendingUp className="w-5 h-5" />,
      'Lead DB Agent': <Database className="w-5 h-5" />,
      'CRM Ops Agent': <Settings className="w-5 h-5" />,
      'Meetings Agent': <Calendar className="w-5 h-5" />,
      'AI AE Agent': <Users className="w-5 h-5" />,
      'Agent Builder': <Bot className="w-5 h-5" />,
      'Voice Agent': <Phone className="w-5 h-5" />
    };
    return iconMap[agentName] || <Bot className="w-5 h-5" />;
  };

  const runAgent = async () => {
    if (!selectedAgent) return;

    setIsRunning(true);
    setError(null);
    setExecutionResult(null);

    try {
      const request: AgentExecutionRequest = {
        agentId: selectedAgent.id,
        ...(contactId && { contactId }),
        ...(dealId && { dealId }),
        userId: 'current-user', // This should come from auth context
        ...(customInstructions && { instructions: customInstructions })
      };

      const result = await agentFramework.executeAgent(request);

      setExecutionResult(result);
      onAgentComplete?.(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const renderAgentCard = (agent: AgentConfig) => (
    <GlassCard
      key={agent.id}
      className={`p-4 cursor-pointer transition-all duration-200 ${
        selectedAgent?.id === agent.id
          ? 'ring-2 ring-blue-500 bg-blue-50'
          : 'hover:shadow-lg'
      }`}
      onClick={() => setSelectedAgent(agent)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getAgentIcon(agent.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {agent.name}
          </h3>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {agent.description}
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
              {agent.tools.length} tools
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              {agent.model}
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );

  const renderExecutionResult = () => {
    if (!executionResult) return null;

    return (
      <GlassCard className="p-4 mt-4">
        <div className="flex items-center space-x-2 mb-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <h3 className="text-sm font-semibold text-gray-900">Agent Execution Complete</h3>
        </div>

        <div className="space-y-3">
          {/* Response Output */}
          {executionResult.response?.output_text && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Response</h4>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                {executionResult.response.output_text}
              </div>
            </div>
          )}

          {/* Generated Images */}
          {executionResult.response?.images && executionResult.response.images.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Generated Images</h4>
              <div className="grid grid-cols-2 gap-2">
                {executionResult.response.images.slice(0, 4).map((image: any, index: number) => (
                  <div key={index} className="relative">
                    <img
                      src={image.thumbnail_url || image.url}
                      alt={`Generated ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool Calls */}
          {executionResult.response?.tool_calls && executionResult.response.tool_calls.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Tools Used</h4>
              <div className="space-y-1">
                {executionResult.response.tool_calls.map((tool: any, index: number) => (
                  <div key={index} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                    {tool.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execution Stats */}
          <div className="flex items-center space-x-4 text-xs text-gray-500 pt-2 border-t">
            <span>Tokens: {executionResult.response?.usage?.total_tokens || 'N/A'}</span>
            <span>Duration: {executionResult.run?.execution_time_ms || 0}ms</span>
          </div>
        </div>
      </GlassCard>
    );
  };

  return (
    <div className="space-y-4">
      {/* Agent Selection */}
      <GlassCard className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Bot className="w-5 h-5" />
          <span>SmartCRM Agent System</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {agents.map(renderAgentCard)}
        </div>

        {/* Custom Instructions */}
        {selectedAgent && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Add specific instructions for this agent execution..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
            />
          </div>
        )}

        {/* Execute Button */}
        <div className="mt-4 flex justify-end">
          <ModernButton
            onClick={runAgent}
            disabled={!selectedAgent || isRunning}
            className="flex items-center space-x-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running {selectedAgent?.name}...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Execute Agent</span>
              </>
            )}
          </ModernButton>
        </div>
      </GlassCard>

      {/* Error Display */}
      {error && (
        <GlassCard className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </GlassCard>
      )}

      {/* Execution Result */}
      {renderExecutionResult()}
    </div>
  );
};