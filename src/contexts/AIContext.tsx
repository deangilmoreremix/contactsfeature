/**
 * AI Context Provider
 * Provides shared AI state and operations across components
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { aiOrchestrator, AIRequest, AIResponse } from '../services/ai-orchestrator.service';
import { contactAI, ContactInsight, ContactScore } from '../services/contact-ai.service';
import { communicationAI } from '../services/communication-ai.service';
import { logger } from '../services/logger.service';
import { Contact } from '../types';

interface AIState {
  // Processing states
  isProcessing: boolean;
  activeRequests: Map<string, { type: string; progress: number }>;
  
  // Results cache
  contactScores: Map<string, ContactScore>;
  contactInsights: Map<string, ContactInsight[]>;
  emailAnalyses: Map<string, any>;
  communicationStrategies: Map<string, any>;
  
  // System status
  providerStatus: any[];
  performanceMetrics: any;
  
  // User preferences
  aiPreferences: {
    autoScoring: boolean;
    autoInsights: boolean;
    preferredProvider: 'auto' | 'openai' | 'gemini';
    insightTypes: ContactInsight['type'][];
  };
  
  // Error handling
  errors: Map<string, string>;
  lastError: string | null;
}

interface AIActions {
  // Contact operations
  scoreContact: (contact: Contact, options?: any) => Promise<ContactScore>;
  generateInsights: (contact: Contact, types?: ContactInsight['type'][]) => Promise<ContactInsight[]>;
  enrichContact: (contact: Contact, level?: string) => Promise<any>;
  
  // Communication operations
  generateEmail: (contact: Contact, purpose: string, context?: any) => Promise<any>;
  analyzeEmail: (content: any, recipient?: Contact) => Promise<any>;
  getCommunicationStrategy: (contact: Contact) => Promise<any>;
  
  // Batch operations
  scoreBulkContacts: (contacts: Contact[]) => Promise<void>;
  generateBulkInsights: (contacts: Contact[]) => Promise<void>;
  
  // State management
  clearContactData: (contactId: string) => void;
  clearAllCache: () => void;
  updatePreferences: (preferences: Partial<AIState['aiPreferences']>) => void;
  
  // Request tracking
  trackRequest: (requestId: string, type: string) => void;
  updateRequestProgress: (requestId: string, progress: number) => void;
  completeRequest: (requestId: string, result?: any) => void;
  
  // Error handling
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
}

type AIAction = 
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'ADD_ACTIVE_REQUEST'; payload: { id: string; type: string } }
  | { type: 'UPDATE_REQUEST_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'REMOVE_ACTIVE_REQUEST'; payload: string }
  | { type: 'SET_CONTACT_SCORE'; payload: { contactId: string; score: ContactScore } }
  | { type: 'SET_CONTACT_INSIGHTS'; payload: { contactId: string; insights: ContactInsight[] } }
  | { type: 'SET_EMAIL_ANALYSIS'; payload: { key: string; analysis: any } }
  | { type: 'SET_COMMUNICATION_STRATEGY'; payload: { contactId: string; strategy: any } }
  | { type: 'SET_PROVIDER_STATUS'; payload: any[] }
  | { type: 'SET_PERFORMANCE_METRICS'; payload: any }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AIState['aiPreferences']> }
  | { type: 'SET_ERROR'; payload: { key: string; error: string } }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'CLEAR_CONTACT_DATA'; payload: string }
  | { type: 'CLEAR_ALL_CACHE' };

const initialState: AIState = {
  isProcessing: false,
  activeRequests: new Map(),
  contactScores: new Map(),
  contactInsights: new Map(),
  emailAnalyses: new Map(),
  communicationStrategies: new Map(),
  providerStatus: [],
  performanceMetrics: null,
  aiPreferences: {
    autoScoring: true,
    autoInsights: true,
    preferredProvider: 'auto',
    insightTypes: ['opportunity', 'recommendation']
  },
  errors: new Map(),
  lastError: null
};

function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
      
    case 'ADD_ACTIVE_REQUEST':
      const newActiveRequests = new Map(state.activeRequests);
      newActiveRequests.set(action.payload.id, { type: action.payload.type, progress: 0 });
      return { ...state, activeRequests: newActiveRequests };
      
    case 'UPDATE_REQUEST_PROGRESS':
      const updatedRequests = new Map(state.activeRequests);
      const existingRequest = updatedRequests.get(action.payload.id);
      if (existingRequest) {
        updatedRequests.set(action.payload.id, { 
          ...existingRequest, 
          progress: action.payload.progress 
        });
      }
      return { ...state, activeRequests: updatedRequests };
      
    case 'REMOVE_ACTIVE_REQUEST':
      const filteredRequests = new Map(state.activeRequests);
      filteredRequests.delete(action.payload);
      return { 
        ...state, 
        activeRequests: filteredRequests,
        isProcessing: filteredRequests.size > 0
      };
      
    case 'SET_CONTACT_SCORE':
      const newScores = new Map(state.contactScores);
      newScores.set(action.payload.contactId, action.payload.score);
      return { ...state, contactScores: newScores };
      
    case 'SET_CONTACT_INSIGHTS':
      const newInsights = new Map(state.contactInsights);
      newInsights.set(action.payload.contactId, action.payload.insights);
      return { ...state, contactInsights: newInsights };
      
    case 'SET_EMAIL_ANALYSIS':
      const newAnalyses = new Map(state.emailAnalyses);
      newAnalyses.set(action.payload.key, action.payload.analysis);
      return { ...state, emailAnalyses: newAnalyses };
      
    case 'SET_COMMUNICATION_STRATEGY':
      const newStrategies = new Map(state.communicationStrategies);
      newStrategies.set(action.payload.contactId, action.payload.strategy);
      return { ...state, communicationStrategies: newStrategies };
      
    case 'SET_PROVIDER_STATUS':
      return { ...state, providerStatus: action.payload };
      
    case 'SET_PERFORMANCE_METRICS':
      return { ...state, performanceMetrics: action.payload };
      
    case 'UPDATE_PREFERENCES':
      return { 
        ...state, 
        aiPreferences: { ...state.aiPreferences, ...action.payload }
      };
      
    case 'SET_ERROR':
      const newErrors = new Map(state.errors);
      newErrors.set(action.payload.key, action.payload.error);
      return { 
        ...state, 
        errors: newErrors, 
        lastError: action.payload.error 
      };
      
    case 'CLEAR_ERROR':
      const clearedErrors = new Map(state.errors);
      clearedErrors.delete(action.payload);
      return { ...state, errors: clearedErrors };
      
    case 'CLEAR_ALL_ERRORS':
      return { ...state, errors: new Map(), lastError: null };
      
    case 'CLEAR_CONTACT_DATA':
      const clearedScores = new Map(state.contactScores);
      const clearedInsights = new Map(state.contactInsights);
      const clearedStrategies = new Map(state.communicationStrategies);
      
      clearedScores.delete(action.payload);
      clearedInsights.delete(action.payload);
      clearedStrategies.delete(action.payload);
      
      return {
        ...state,
        contactScores: clearedScores,
        contactInsights: clearedInsights,
        communicationStrategies: clearedStrategies
      };
      
    case 'CLEAR_ALL_CACHE':
      return {
        ...state,
        contactScores: new Map(),
        contactInsights: new Map(),
        emailAnalyses: new Map(),
        communicationStrategies: new Map()
      };
      
    default:
      return state;
  }
}

const AIContext = createContext<(AIState & AIActions) | null>(null);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(aiReducer, initialState);

  // Load user preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('ai_preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
      } catch (error) {
        logger.warn('Failed to load AI preferences from localStorage', error);
      }
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('ai_preferences', JSON.stringify(state.aiPreferences));
  }, [state.aiPreferences]);

  // Load system status periodically
  useEffect(() => {
    const loadSystemStatus = () => {
      try {
        const providerStatus = aiOrchestrator.getProviderStatus();
        const performanceMetrics = aiOrchestrator.getPerformanceMetrics();
        
        dispatch({ type: 'SET_PROVIDER_STATUS', payload: providerStatus });
        dispatch({ type: 'SET_PERFORMANCE_METRICS', payload: performanceMetrics });
      } catch (error) {
        logger.error('Failed to load AI system status', error as Error);
      }
    };

    loadSystemStatus();
    const cleanupInterval = globalThis.setInterval ? globalThis.setInterval : setInterval;
    const interval = cleanupInterval(loadSystemStatus, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Action implementations
  const scoreContact = useCallback(async (contact: Contact, options?: any): Promise<ContactScore> => {
    const requestId = `score_${contact.id}_${Date.now()}`;
    
    try {
      dispatch({ type: 'ADD_ACTIVE_REQUEST', payload: { id: requestId, type: 'scoring' } });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      const score = await contactAI.scoreContact(contact, options);
      
      dispatch({ type: 'SET_CONTACT_SCORE', payload: { contactId: contact.id, score } });
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      
      logger.info('Contact scored successfully', { contactId: contact.id, score: score.overall });
      return score;
    } catch (error) {
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      dispatch({ type: 'SET_ERROR', payload: { 
        key: `score_${contact.id}`, 
        error: error instanceof Error ? error.message : 'Scoring failed' 
      }});
      
      logger.error('Contact scoring failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }, []);

  const generateInsights = useCallback(async (
    contact: Contact, 
    types?: ContactInsight['type'][]
  ): Promise<ContactInsight[]> => {
    const requestId = `insights_${contact.id}_${Date.now()}`;
    
    try {
      dispatch({ type: 'ADD_ACTIVE_REQUEST', payload: { id: requestId, type: 'insights' } });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      const insights = await contactAI.generateInsights(contact, types || state.aiPreferences.insightTypes);
      
      dispatch({ type: 'SET_CONTACT_INSIGHTS', payload: { contactId: contact.id, insights } });
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      
      logger.info('Contact insights generated successfully', { 
        contactId: contact.id, 
        insightCount: insights.length 
      });
      return insights;
    } catch (error) {
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      dispatch({ type: 'SET_ERROR', payload: { 
        key: `insights_${contact.id}`, 
        error: error instanceof Error ? error.message : 'Insights generation failed' 
      }});
      
      logger.error('Insights generation failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }, [state.aiPreferences.insightTypes]);

  const enrichContact = useCallback(async (contact: Contact, level = 'basic'): Promise<any> => {
    const requestId = `enrich_${contact.id}_${Date.now()}`;
    
    try {
      dispatch({ type: 'ADD_ACTIVE_REQUEST', payload: { id: requestId, type: 'enrichment' } });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      const enrichmentData = await contactAI.enrichContact(contact, level as any);
      
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      
      logger.info('Contact enriched successfully', { contactId: contact.id, level });
      return enrichmentData;
    } catch (error) {
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      dispatch({ type: 'SET_ERROR', payload: { 
        key: `enrich_${contact.id}`, 
        error: error instanceof Error ? error.message : 'Enrichment failed' 
      }});
      
      logger.error('Contact enrichment failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }, []);

  const generateEmail = useCallback(async (
    contact: Contact, 
    purpose: string, 
    context?: any
  ): Promise<any> => {
    const requestId = `email_${contact.id}_${Date.now()}`;
    
    try {
      dispatch({ type: 'ADD_ACTIVE_REQUEST', payload: { id: requestId, type: 'email_generation' } });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      const emailData = await communicationAI.generateEmail(contact, purpose as any, context);
      
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      
      logger.info('Email generated successfully', { contactId: contact.id, purpose });
      return emailData;
    } catch (error) {
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      dispatch({ type: 'SET_ERROR', payload: { 
        key: `email_${contact.id}`, 
        error: error instanceof Error ? error.message : 'Email generation failed' 
      }});
      
      logger.error('Email generation failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }, []);

  const analyzeEmail = useCallback(async (content: any, recipient?: Contact): Promise<any> => {
    const requestId = `analyze_${Date.now()}`;
    
    try {
      dispatch({ type: 'ADD_ACTIVE_REQUEST', payload: { id: requestId, type: 'email_analysis' } });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      const analysis = await communicationAI.analyzeEmail(content, recipient);
      
      const analysisKey = recipient ? `${recipient.id}_${content.subject}` : content.subject;
      dispatch({ type: 'SET_EMAIL_ANALYSIS', payload: { key: analysisKey, analysis } });
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      
      logger.info('Email analyzed successfully', { recipientId: recipient?.id });
      return analysis;
    } catch (error) {
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      dispatch({ type: 'SET_ERROR', payload: { 
        key: `analyze_${Date.now()}`, 
        error: error instanceof Error ? error.message : 'Email analysis failed' 
      }});
      
      logger.error('Email analysis failed', error as Error);
      throw error;
    }
  }, []);

  const getCommunicationStrategy = useCallback(async (contact: Contact): Promise<any> => {
    const requestId = `strategy_${contact.id}_${Date.now()}`;
    
    try {
      dispatch({ type: 'ADD_ACTIVE_REQUEST', payload: { id: requestId, type: 'strategy' } });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      const strategy = await communicationAI.generateCommunicationStrategy(contact);
      
      dispatch({ type: 'SET_COMMUNICATION_STRATEGY', payload: { contactId: contact.id, strategy } });
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      
      logger.info('Communication strategy generated successfully', { contactId: contact.id });
      return strategy;
    } catch (error) {
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      dispatch({ type: 'SET_ERROR', payload: { 
        key: `strategy_${contact.id}`, 
        error: error instanceof Error ? error.message : 'Strategy generation failed' 
      }});
      
      logger.error('Communication strategy generation failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }, []);

  const scoreBulkContacts = useCallback(async (contacts: Contact[]): Promise<void> => {
    const requestId = `bulk_score_${Date.now()}`;
    
    try {
      dispatch({ type: 'ADD_ACTIVE_REQUEST', payload: { id: requestId, type: 'bulk_scoring' } });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      const results = await contactAI.getBulkInsights(contacts, 'scoring');
      
      results.forEach(result => {
        if (result.insights && !result.error) {
          dispatch({ type: 'SET_CONTACT_SCORE', payload: { 
            contactId: result.contactId, 
            score: result.insights 
          }});
        }
      });
      
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      
      logger.info('Bulk contact scoring completed', { 
        total: contacts.length, 
        successful: results.filter(r => !r.error).length 
      });
    } catch (error) {
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      dispatch({ type: 'SET_ERROR', payload: { 
        key: 'bulk_scoring', 
        error: error instanceof Error ? error.message : 'Bulk scoring failed' 
      }});
      
      logger.error('Bulk contact scoring failed', error as Error);
      throw error;
    }
  }, []);

  const generateBulkInsights = useCallback(async (contacts: Contact[]): Promise<void> => {
    const requestId = `bulk_insights_${Date.now()}`;
    
    try {
      dispatch({ type: 'ADD_ACTIVE_REQUEST', payload: { id: requestId, type: 'bulk_insights' } });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      const results = await contactAI.getBulkInsights(contacts, 'opportunity_analysis');
      
      results.forEach(result => {
        if (result.insights && !result.error) {
          dispatch({ type: 'SET_CONTACT_INSIGHTS', payload: { 
            contactId: result.contactId, 
            insights: result.insights 
          }});
        }
      });
      
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      
      logger.info('Bulk insights generation completed', { 
        total: contacts.length, 
        successful: results.filter(r => !r.error).length 
      });
    } catch (error) {
      dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
      dispatch({ type: 'SET_ERROR', payload: { 
        key: 'bulk_insights', 
        error: error instanceof Error ? error.message : 'Bulk insights failed' 
      }});
      
      logger.error('Bulk insights generation failed', error as Error);
      throw error;
    }
  }, []);

  const clearContactData = useCallback((contactId: string) => {
    dispatch({ type: 'CLEAR_CONTACT_DATA', payload: contactId });
  }, []);

  const clearAllCache = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_CACHE' });
    aiOrchestrator.clearCache();
    logger.info('AI cache cleared');
  }, []);

  const updatePreferences = useCallback((preferences: Partial<AIState['aiPreferences']>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
  }, []);

  const trackRequest = useCallback((requestId: string, type: string) => {
    dispatch({ type: 'ADD_ACTIVE_REQUEST', payload: { id: requestId, type } });
  }, []);

  const updateRequestProgress = useCallback((requestId: string, progress: number) => {
    dispatch({ type: 'UPDATE_REQUEST_PROGRESS', payload: { id: requestId, progress } });
  }, []);

  const completeRequest = useCallback((requestId: string, result?: any) => {
    dispatch({ type: 'REMOVE_ACTIVE_REQUEST', payload: requestId });
  }, []);

  const setError = useCallback((key: string, error: string) => {
    dispatch({ type: 'SET_ERROR', payload: { key, error } });
  }, []);

  const clearError = useCallback((key: string) => {
    dispatch({ type: 'CLEAR_ERROR', payload: key });
  }, []);

  const clearAllErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' });
  }, []);

  const contextValue = {
    ...state,
    scoreContact,
    generateInsights,
    enrichContact,
    generateEmail,
    analyzeEmail,
    getCommunicationStrategy,
    scoreBulkContacts,
    generateBulkInsights,
    clearContactData,
    clearAllCache,
    updatePreferences,
    trackRequest,
    updateRequestProgress,
    completeRequest,
    setError,
    clearError,
    clearAllErrors
  };

  return <AIContext.Provider value={contextValue}>{children}</AIContext.Provider>;
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

// Specialized hooks for specific AI operations
export const useContactAI = (contactId?: string) => {
  const ai = useAI();
  
  const contactScore = contactId ? ai.contactScores.get(contactId) : undefined;
  const contactInsights = contactId ? ai.contactInsights.get(contactId) : undefined;
  const communicationStrategy = contactId ? ai.communicationStrategies.get(contactId) : undefined;
  const contactError = contactId ? ai.errors.get(`score_${contactId}`) || ai.errors.get(`insights_${contactId}`) : undefined;
  
  return {
    ...ai,
    contactScore,
    contactInsights,
    communicationStrategy,
    contactError,
    isContactProcessing: contactId ? 
      Array.from(ai.activeRequests.keys()).some(key => key.includes(contactId)) : 
      false
  };
};

export const useCommunicationAI = () => {
  const ai = useAI();
  
  return {
    generateEmail: ai.generateEmail,
    analyzeEmail: ai.analyzeEmail,
    getCommunicationStrategy: ai.getCommunicationStrategy,
    emailAnalyses: ai.emailAnalyses,
    communicationStrategies: ai.communicationStrategies,
    isProcessing: ai.isProcessing,
    errors: ai.errors
  };
};