import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AgentConfig, AgentExecutionRequest, AgentExecutionResult } from '../../types/agent';
import { ModernButton } from '../ui/ModernButton';
import { AgentModal } from './AgentModal';
import { Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

interface AgentButtonProps {
  agentId: string;
  functionName?: string;
  contactId?: string;
  dealId?: string;
  variant?: 'primary' | 'outline' | 'glass' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSuccess?: (result: AgentExecutionResult) => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}

export const AgentButton: React.FC<AgentButtonProps> = ({
  agentId,
  functionName,
  contactId,
  dealId,
  variant = 'outline',
  size = 'sm',
  className = '',
  onSuccess,
  onError,
  children
}) => {
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [executionResult, setExecutionResult] = useState<AgentExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use functionName if provided, otherwise use agentId as function name
  const activeFunctionName = functionName || agentId;

  // Load agent metadata when component mounts (only if no functionName)
  React.useEffect(() => {
    if (functionName) {
      // Skip database lookup if we have a direct function name
      setAgent({ id: agentId, name: activeFunctionName } as AgentConfig);
    } else {
      loadAgentMetadata();
    }
  }, [agentId, functionName]);

  const loadAgentMetadata = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_metadata')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      setAgent(data);
    } catch (err) {
      console.error('Failed to load agent metadata:', err);
      setError('Failed to load agent');
    }
  };

  const handleExecuteAgent = async (input?: Record<string, any>) => {
    if (!agent && !functionName) return;

    setLoading(true);
    setError(null);
    setExecutionResult(null);

    try {
      let result: AgentExecutionResult;

      if (functionName) {
        // Call Netlify function directly
        const response = await fetch(`/.netlify/functions/${functionName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(contactId && { contactId }),
            ...(dealId && { dealId }),
            ...(input && { input })
          })
        });

        if (!response.ok) {
          throw new Error(`Function ${functionName} failed: ${response.statusText}`);
        }

        result = await response.json();
      } else {
        // Use agent-runner (database lookup)
        const request: AgentExecutionRequest = {
          agentId,
          userId: 'current-user',
          ...(contactId && { contactId }),
          ...(dealId && { dealId }),
          ...(input && { input })
        };

        const response = await supabase.functions.invoke('agent-runner', {
          body: request
        });

        if (response.error) throw new Error(response.error.message);
        result = response.data;
      }

      setExecutionResult(result);
      onSuccess?.(result);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Agent execution failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  const getAgentIcon = (agentName: string) => {
    const name = agentName.toLowerCase();
    if (name.includes('sdr')) return '🎯';
    if (name.includes('dialer')) return '📞';
    if (name.includes('signals')) return '📊';
    if (name.includes('lead')) return '👥';
    if (name.includes('meetings')) return '📅';
    if (name.includes('journeys')) return '🚀';
    if (name.includes('crm')) return '⚙️';
    if (name.includes('ae')) return '💼';
    if (name.includes('builder')) return '🔧';
    if (name.includes('voice')) return '🎤';
    if (name.includes('social')) return '💬';
    return '🤖';
  };

  if (!agent) {
    return (
      <ModernButton
        variant={variant}
        size={size}
        className={className}
        disabled
      >
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading...
      </ModernButton>
    );
  }

  return (
    <>
      <ModernButton
        variant={variant}
        size={size}
        className={className}
        onClick={() => setShowModal(true)}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Running...
          </>
        ) : (
          <>
            <span className="mr-2">{getAgentIcon(agent.name)}</span>
            {children || agent.name}
            <Sparkles className="w-3 h-3 ml-1 text-yellow-400" />
          </>
        )}
      </ModernButton>

      {showModal && (
        <AgentModal
          agent={agent}
          onExecute={handleExecuteAgent}
          onClose={() => setShowModal(false)}
          loading={loading}
        />
      )}

      {/* Success/Error Feedback */}
      {executionResult && (
        <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm shadow-lg z-50">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <div className="font-medium text-green-900">{agent.name} completed</div>
              <div className="text-sm text-green-700">
                Execution time: {executionResult.response?.usage?.total_tokens || 0} tokens
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm shadow-lg z-50">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <div className="font-medium text-red-900">{agent.name} failed</div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};