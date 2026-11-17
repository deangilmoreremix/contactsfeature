import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AgentConfig, AgentExecutionResult } from '../../types/agent';
import { ModernButton } from '../ui/ModernButton';
import { AgentModal } from './AgentModal';
import { streamFunction } from '../../services/liveFunction';
import { useLiveCall } from '../../hooks/useLiveCall';
import { LiveRunStatus } from '../ui/LiveRunStatus';
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

/** The agent's answer as readable text: its output_text, else what streamed, else a text-like field of the payload. */
function finalText(result: AgentExecutionResult, streamed: string): string {
  const r = result as unknown as Record<string, unknown>;
  const data = (r.data ?? {}) as Record<string, unknown>;
  const candidates = [result.response?.output_text, r.content, r.text, r.summary, data.text, data.summary, streamed];
  const hit = candidates.find((c): c is string => typeof c === 'string' && c.trim().length > 0 && !/^\s*[{[]/.test(c));
  return hit ?? '';
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
  const [resultText, setResultText] = useState('');
  // Live run: status line + the agent's answer typing in (dual-mode functions stream; others answer as plain JSON)
  const live = useLiveCall();

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
    setResultText('');

    try {
      let result: AgentExecutionResult;

      if (functionName) {
        // Call the Netlify function over SSE (dual-mode); a plain JSON reply is handled the same way
        const run = await live.run((opts) => streamFunction<AgentExecutionResult>(`/.netlify/functions/${functionName}`, {
          ...(contactId && { contactId }),
          ...(dealId && { dealId }),
          ...(input && { input })
        }, opts));
        if (!run) return; // stopped by the user
        result = (run.result ?? {}) as AgentExecutionResult;
        setResultText(finalText(result, run.outcome?.text ?? ""));
      } else {
        // Generic runner: dispatches the agent id to its dual-mode function server-side (allow-list) and streams
        // the agent's own answer through; ownership of the contact / deal is checked there.
        const run = await live.run((opts) => streamFunction<AgentExecutionResult>('/.netlify/functions/agent-runner', {
          agentId,
          ...(contactId && { contactId }),
          ...(dealId && { dealId }),
          ...(input && { input })
        }, opts));
        if (!run) return; // stopped by the user
        result = (run.result ?? {}) as AgentExecutionResult;
        setResultText(finalText(result, run.outcome?.text ?? ""));
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
        size="toolbar"
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
        size="toolbar"
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

      {/* The agent's answer, typing in while it runs and kept beneath the button once finished */}
      {live.state.active && (
        <LiveRunStatus live={live} showText className="w-full basis-full mt-2 text-left" placeholder="Agent is working…" />
      )}
      {!live.state.active && resultText && (
        <div className="w-full basis-full mt-2 text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3" aria-label={`${agent.name} result`}>
          <pre className="whitespace-pre-wrap break-words text-sm font-sans text-gray-800 dark:text-gray-100 m-0">{resultText}</pre>
        </div>
      )}

      {/* Success/Error Feedback */}
      {executionResult && (
        <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm shadow-lg z-50">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <div className="font-medium text-green-900">{agent.name} completed</div>
              <div className="text-sm text-green-700">
                {executionResult.response?.usage?.total_tokens
                  ? `${executionResult.response.usage.total_tokens} tokens used`
                  : 'Finished'}
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