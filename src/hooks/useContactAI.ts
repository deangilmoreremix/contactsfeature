import { useState, useCallback, useEffect } from 'react';
import { useContactAI as useAIContext } from '../contexts/AIContext';
import { ContactInsight } from '../services/contact-ai.service';
import { useContactStore } from './useContactStore';
import { Contact } from '../types';
import { validateContactData, sanitizeString } from '../utils/validation';
import { ERROR_MESSAGES } from '../utils/constants';

interface AIScore {
  overall: number;
  reasoning?: string[];
  confidence?: number;
}

interface UseContactAIResult {
  aiScore: number | null;
  aiInsights: ContactInsight[] | null;
  isAnalyzing: boolean;
  error: string | null;
  scoreContact: () => Promise<void>;
  generateInsights: () => Promise<void>;
  clearError: () => void;
}

export const useContactAI = (contactId: string): UseContactAIResult => {
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<ContactInsight[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to AI services
  const { scoreContact: aiScoreContact, generateInsights: aiGenerateInsights } = useAIContext();
  const { updateContact } = useContactStore();

  // Get contact data from store
  const contact = useContactStore(state =>
    state.contacts.find(c => c.id === contactId)
  );

  // Initialize with existing AI data
  useEffect(() => {
    if (contact) {
      setAiScore(contact.aiScore || null);
      // Note: aiInsights would need to be stored in contact or separate state
    }
  }, [contact]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const scoreContact = useCallback(async () => {
    if (!contact || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Validate contact data before analysis
      const validation = validateContactData(contact);
      if (!validation.isValid) {
        throw new Error(`Invalid contact data: ${validation.errors.join(', ')}`);
      }

      // Check if this is demo/example data that should be protected
      const isDemoData = contact.isExample || contact.createdBy === 'demo' || contact.mockDataType === 'demo';

      if (isDemoData) {
        // For demo contacts, provide mock AI scoring
        await new Promise(resolve => setTimeout(resolve, 1500));
        const mockScore = Math.floor(Math.random() * 40) + 60; // 60-99 range
        setAiScore(mockScore);

        await updateContact(contact.id, {
          aiScore: mockScore,
          notes: contact.notes ?
            `${contact.notes}\n\nAI Analysis: Demo contact scored at ${mockScore}/100` :
            `AI Analysis: Demo contact scored at ${mockScore}/100`
        });
        return;
      }

      // Use real AI services for non-demo contacts
      const score = await aiScoreContact(contact, { skipIfMock: true });

      if (score?.overall) {
        const roundedScore = Math.round(score.overall);
        setAiScore(roundedScore);

        await updateContact(contact.id, {
          aiScore: roundedScore,
          notes: contact.notes ?
            `${contact.notes}\n\nAI Analysis: ${sanitizeString(score.reasoning?.join('. ') || 'Analysis completed')}` :
            `AI Analysis: ${sanitizeString(score.reasoning?.join('. ') || 'Analysis completed')}`
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.AI_ANALYSIS_FAILED;
      console.error('AI analysis failed:', err);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [contact, isAnalyzing, aiScoreContact, updateContact]);

  const generateInsights = useCallback(async () => {
    if (!contact || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const insights = await aiGenerateInsights(contact, ['opportunity', 'recommendation']);

      if (insights) {
        setAiInsights(insights);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.AI_ANALYSIS_FAILED;
      console.error('AI insights generation failed:', err);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [contact, isAnalyzing, aiGenerateInsights]);

  return {
    aiScore,
    aiInsights,
    isAnalyzing,
    error,
    scoreContact,
    generateInsights,
    clearError
  };
};