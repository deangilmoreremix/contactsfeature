import { useState } from 'react';
import { executeDealAi } from '../ai/deal/executeDealAi';
import { useFunctionStream } from './useFunctionStream';

export interface SDRResult {
  task: string;
  sequence: any;
  generatedAt: Date;
}

export interface UseSDRExecutionOptions {
  dealId?: string;
  workspaceId?: string;
  personaId?: string;
  onSequenceGenerated?: (sequence: any) => void;
}

export const useSDRExecution = (options: UseSDRExecutionOptions = {}) => {
  const { dealId, workspaceId, personaId, onSequenceGenerated } = options;

  const [loading, setLoading] = useState<string | null>(null);
  /** Live state of the running task (render with <StreamingOutput state={stream.state} onStop={stream.stop} />). */
  const stream = useFunctionStream<string>();
  const [results, setResults] = useState<SDRResult[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SDRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeSDRTask = async (task: string, taskOptions: any = {}) => {
    if (!dealId || !workspaceId) {
      setError('Deal ID and Workspace ID are required');
      return;
    }

    setLoading(task);
    setError(null);

    const t = stream.start();
    try {
      const result = await executeDealAi({
        live: t.h,
        task: task as any,
        dealId,
        workspaceId,
        options: {
          personaId,
          lengthDays: 7,
          channel: 'email',
          tone: 'friendly',
          ...taskOptions
        }
      });

      const sdrResult: SDRResult = {
        task,
        sequence: result,
        generatedAt: new Date()
      };

      t.finish();
      setResults(prev => [sdrResult, ...prev]);
      setSelectedResult(sdrResult);
      setShowModal(true);

      if (onSequenceGenerated) onSequenceGenerated(result);
    } catch (err: any) {
      t.fail(err);
      console.error('SDR generation failed:', err);
      setError(err.message || 'Failed to generate SDR sequence');
    } finally {
      setLoading(null);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedResult(null);
  };

  const clearError = () => setError(null);

  return {
    loading,
    stream,
    results,
    showModal,
    selectedResult,
    error,
    executeSDRTask,
    closeModal,
    clearError
  };
};