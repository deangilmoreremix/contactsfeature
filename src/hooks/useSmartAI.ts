/**
 * React Hook for Smart AI Operations
 * Provides easy access to enhanced AI capabilities with automatic model selection
 */

import { useState, useCallback } from 'react';
import { enhancedAI, EnhancedAIAnalysisRequest, SmartBulkRequest } from '../services/enhanced-ai-integration.service';
import { taskRouter } from '../services/task-router.service';
import { logger } from '../services/logger.service';
import { Contact } from '../types/contact';

export interface SmartAIState {
  analyzing: boolean;
  enriching: boolean;
  results: Record<string, any>;
  errors: Record<string, string>;
  recommendations: Record<string, any>;
  performance: any;
}

export const useSmartAI = () => {
  const [state, setState] = useState<SmartAIState>({
    analyzing: false,
    enriching: false,
    results: {},
    errors: {},
    recommendations: {},
    performance: null
  });

  // Smart contact scoring with automatic model selection
  const smartScoreContact = useCallback(async (
    contactId: string,
    contact: Contact,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    setState(prev => ({ ...prev, analyzing: true, errors: { ...prev.errors, [contactId]: '' } }));
    
    try {
      const result = await enhancedAI.scoreContact(contactId, contact, urgency);
      
      setState(prev => ({
        ...prev,
        analyzing: false,
        results: { ...prev.results, [`score_${contactId}`]: result }
      }));
      
      logger.info('Smart contact scoring completed', { contactId, urgency });
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scoring failed';
      setState(prev => ({
        ...prev,
        analyzing: false,
        errors: { ...prev.errors, [contactId]: errorMessage }
      }));
      
      logger.error('Smart contact scoring failed', error as Error, { contactId });
      throw error;
    }
  }, []);

  // Smart contact enrichment with model optimization
  const smartEnrichContact = useCallback(async (
    contactId: string,
    contact: Contact,
    priority: 'standard' | 'premium' = 'standard'
  ) => {
    setState(prev => ({ ...prev, enriching: true, errors: { ...prev.errors, [`enrich_${contactId}`]: '' } }));
    
    try {
      const result = await enhancedAI.enrichContact(contactId, contact, priority);
      
      setState(prev => ({
        ...prev,
        enriching: false,
        results: { ...prev.results, [`enrich_${contactId}`]: result }
      }));
      
      logger.info('Smart contact enrichment completed', { contactId, priority });
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Enrichment failed';
      setState(prev => ({
        ...prev,
        enriching: false,
        errors: { ...prev.errors, [`enrich_${contactId}`]: errorMessage }
      }));
      
      logger.error('Smart contact enrichment failed', error as Error, { contactId });
      throw error;
    }
  }, []);

  // Quick categorization and tagging
  const smartCategorizeAndTag = useCallback(async (
    contactId: string,
    contact: Contact
  ) => {
    setState(prev => ({ ...prev, analyzing: true }));
    
    try {
      const result = await enhancedAI.categorizeAndTag(contactId, contact);
      
      setState(prev => ({
        ...prev,
        analyzing: false,
        results: { ...prev.results, [`categorize_${contactId}`]: result }
      }));
      
      return result;
      
    } catch (error) {
      setState(prev => ({ ...prev, analyzing: false }));
      throw error;
    }
  }, []);

  // Lead qualification with business context
  const smartQualifyLead = useCallback(async (
    contactId: string,
    contact: Contact,
    businessContext?: string
  ) => {
    setState(prev => ({ ...prev, analyzing: true }));
    
    try {
      const result = await enhancedAI.qualifyLead(contactId, contact, businessContext);
      
      setState(prev => ({
        ...prev,
        analyzing: false,
        results: { ...prev.results, [`qualify_${contactId}`]: result }
      }));
      
      return result;
      
    } catch (error) {
      setState(prev => ({ ...prev, analyzing: false }));
      throw error;
    }
  }, []);

  // Bulk analysis with cost and time constraints
  const smartBulkAnalysis = useCallback(async (
    contacts: Array<{ contactId: string; contact: Contact }>,
    analysisType: 'contact_scoring' | 'categorization' | 'tagging' | 'lead_qualification',
    options?: {
      urgency?: 'low' | 'medium' | 'high';
      costLimit?: number;
      timeLimit?: number;
    }
  ) => {
    setState(prev => ({ ...prev, analyzing: true }));
    
    try {
      const request: SmartBulkRequest = {
        contacts,
        analysisType,
        urgency: options?.urgency,
        costLimit: options?.costLimit,
        timeLimit: options?.timeLimit
      };
      
      const result = await enhancedAI.smartBulkAnalysis(request);
      
      setState(prev => ({
        ...prev,
        analyzing: false,
        results: { ...prev.results, [`bulk_${analysisType}`]: result }
      }));
      
      logger.info('Smart bulk analysis completed', { 
        contactCount: contacts.length,
        analysisType,
        successRate: result.summary.successful / result.summary.total
      });
      
      return result;
      
    } catch (error) {
      setState(prev => ({ ...prev, analyzing: false }));
      logger.error('Smart bulk analysis failed', error as Error);
      throw error;
    }
  }, []);

  // Advanced analysis with custom requirements
  const smartAnalyze = useCallback(async (request: EnhancedAIAnalysisRequest) => {
    setState(prev => ({ ...prev, analyzing: true }));
    
    try {
      const result = await enhancedAI.smartAnalyzeContact(request);
      
      setState(prev => ({
        ...prev,
        analyzing: false,
        results: { ...prev.results, [`custom_${request.contactId}`]: result }
      }));
      
      return result;
      
    } catch (error) {
      setState(prev => ({ ...prev, analyzing: false }));
      throw error;
    }
  }, []);

  // Get model recommendations for a task
  const getTaskRecommendations = useCallback((taskType: string) => {
    try {
      const recommendations = enhancedAI.getTaskRecommendations(taskType);
      
      setState(prev => ({
        ...prev,
        recommendations: { ...prev.recommendations, [taskType]: recommendations }
      }));
      
      return recommendations;
      
    } catch (error) {
      logger.error('Failed to get task recommendations', error as Error, { taskType });
      return null;
    }
  }, []);

  // Get performance insights
  const getPerformanceInsights = useCallback(() => {
    try {
      const performance = enhancedAI.getPerformanceInsights();
      
      setState(prev => ({ ...prev, performance }));
      
      return performance;
      
    } catch (error) {
      logger.error('Failed to get performance insights', error as Error);
      return null;
    }
  }, []);

  // Utility functions
  const getResult = useCallback((key: string) => {
    return state.results[key];
  }, [state.results]);

  const getError = useCallback((key: string) => {
    return state.errors[key];
  }, [state.errors]);

  const clearResults = useCallback(() => {
    setState(prev => ({ ...prev, results: {}, errors: {} }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: {} }));
  }, []);

  return {
    // State
    analyzing: state.analyzing,
    enriching: state.enriching,
    results: state.results,
    errors: state.errors,
    recommendations: state.recommendations,
    performance: state.performance,
    
    // Core AI operations
    smartScoreContact,
    smartEnrichContact,
    smartCategorizeAndTag,
    smartQualifyLead,
    smartBulkAnalysis,
    smartAnalyze,
    
    // Insights and recommendations
    getTaskRecommendations,
    getPerformanceInsights,
    
    // Utility functions
    getResult,
    getError,
    clearResults,
    clearErrors
  };
};

// Specialized hooks for specific use cases
export const useSmartScoring = () => {
  const { smartScoreContact, analyzing, getResult, getError } = useSmartAI();
  
  return {
    scoreContact: smartScoreContact,
    analyzing,
    getScoreResult: (contactId: string) => getResult(`score_${contactId}`),
    getScoreError: (contactId: string) => getError(contactId)
  };
};

export const useSmartEnrichment = () => {
  const { smartEnrichContact, enriching, getResult, getError } = useSmartAI();
  
  return {
    enrichContact: smartEnrichContact,
    enriching,
    getEnrichResult: (contactId: string) => getResult(`enrich_${contactId}`),
    getEnrichError: (contactId: string) => getError(`enrich_${contactId}`)
  };
};

export const useTaskOptimization = () => {
  const { getTaskRecommendations, getPerformanceInsights, performance, recommendations } = useSmartAI();
  
  return {
    getRecommendations: getTaskRecommendations,
    getInsights: getPerformanceInsights,
    performance,
    recommendations
  };
};