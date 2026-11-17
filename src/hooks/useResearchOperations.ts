import { useState, useCallback } from 'react';
import { webSearchService } from '../services/webSearchService';
import { useResearchThinking } from '../components/ui/ResearchThinkingAnimation';
import { useResearchStatus } from '../components/ui/ResearchStatusOverlay';

interface ResearchConfig {
  includeSources?: boolean;
  searchContextSize?: 'low' | 'medium' | 'high';
}

interface UseResearchOperationsReturn {
  performResearch: (
    searchQuery: string,
    systemPrompt: string,
    userPrompt: string,
    config?: ResearchConfig
  ) => Promise<any>;
  isResearching: boolean;
  error: string | null;
  clearError: () => void;
}

export const useResearchOperations = (): UseResearchOperationsReturn => {
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const researchThinking = useResearchThinking();
  useResearchStatus();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const performResearch = useCallback(async (
    searchQuery: string,
    systemPrompt: string,
    userPrompt: string,
    config: ResearchConfig = {}
  ) => {
    setIsResearching(true);
    setError(null);

    researchThinking.startResearch('🔍 Starting research operation...');

    try {
      researchThinking.moveToAnalyzing('🌐 Searching web for relevant information...');

      const result = await webSearchService.searchWithAI(
        searchQuery,
        systemPrompt,
        userPrompt,
        config
      );

      researchThinking.moveToSynthesizing('🧠 Synthesizing research findings...');

      researchThinking.complete('✅ Research completed successfully!');

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Research operation failed';
      setError(errorMessage);
      researchThinking.complete(`❌ ${errorMessage}`);
      throw err;
    } finally {
      setIsResearching(false);
    }
  }, [researchThinking]);

  return {
    performResearch,
    isResearching,
    error,
    clearError
  };
};