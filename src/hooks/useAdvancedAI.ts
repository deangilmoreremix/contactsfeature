/**
 * Advanced AI Hook
 * Provides access to Phase 3 advanced AI features
 */

import { useState, useCallback, useEffect } from 'react';
import { Contact } from '../types';
import { logger } from '../services/logger.service';
import { 
  aiIntelligenceEngine, 
  IntelligenceCorrelation, 
  SmartRecommendation 
} from '../services/ai-intelligence-engine.service';
import { 
  aiAutomationEngine, 
  AutomationSuggestion, 
  AutomationRule 
} from '../services/ai-automation-engine.service';
import { 
  aiPredictiveAnalytics, 
  Prediction, 
  TrendAnalysis, 
  RiskAssessment 
} from '../services/ai-predictive-analytics.service';

export interface AdvancedAIState {
  // Intelligence Engine
  intelligenceCorrelations: Map<string, IntelligenceCorrelation[]>;
  smartRecommendations: Map<string, SmartRecommendation[]>;
  
  // Automation Engine
  automationSuggestions: AutomationSuggestion[];
  automationRules: AutomationRule[];
  
  // Predictive Analytics
  predictions: Map<string, Prediction[]>;
  trendAnalyses: Map<string, TrendAnalysis>;
  riskAssessments: Map<string, RiskAssessment>;
  
  // Processing States
  isAnalyzing: boolean;
  isGeneratingRecommendations: boolean;
  isPredicting: boolean;
  isOptimizing: boolean;
  
  // Errors
  errors: Map<string, string>;
}

export const useAdvancedAI = () => {
  const [state, setState] = useState<AdvancedAIState>({
    intelligenceCorrelations: new Map(),
    smartRecommendations: new Map(),
    automationSuggestions: [],
    automationRules: [],
    predictions: new Map(),
    trendAnalyses: new Map(),
    riskAssessments: new Map(),
    isAnalyzing: false,
    isGeneratingRecommendations: false,
    isPredicting: false,
    isOptimizing: false,
    errors: new Map()
  });

  // Intelligence Engine Methods
  const generateIntelligenceCorrelation = useCallback(async (
    contact: Contact,
    includeHistory: boolean = true
  ): Promise<IntelligenceCorrelation> => {
    setState(prev => ({ ...prev, isAnalyzing: true, errors: new Map(prev.errors.set(contact.id, '')) }));
    
    try {
      const correlation = await aiIntelligenceEngine.generateIntelligenceCorrelation(
        contact.id,
        contact,
        [], // existing insights will be fetched internally
        includeHistory ? [] : undefined // communication history
      );

      setState(prev => {
        const newCorrelations = new Map(prev.intelligenceCorrelations);
        const existing = newCorrelations.get(contact.id) || [];
        newCorrelations.set(contact.id, [...existing, correlation]);
        
        return {
          ...prev,
          intelligenceCorrelations: newCorrelations,
          isAnalyzing: false
        };
      });

      logger.info('Intelligence correlation generated', { contactId: contact.id });
      return correlation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Intelligence analysis failed';
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false,
        errors: new Map(prev.errors.set(contact.id, errorMessage))
      }));
      logger.error('Intelligence correlation failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }, []);

  const generateSmartRecommendations = useCallback(async (
    contact: Contact,
    context?: any
  ): Promise<SmartRecommendation[]> => {
    setState(prev => ({ ...prev, isGeneratingRecommendations: true }));
    
    try {
      const recommendations = await aiIntelligenceEngine.generateSmartRecommendations(
        contact.id,
        contact,
        context
      );

      setState(prev => {
        const newRecommendations = new Map(prev.smartRecommendations);
        newRecommendations.set(contact.id, recommendations);
        
        return {
          ...prev,
          smartRecommendations: newRecommendations,
          isGeneratingRecommendations: false
        };
      });

      logger.info('Smart recommendations generated', { 
        contactId: contact.id, 
        count: recommendations.length 
      });
      return recommendations;
    } catch (error) {
      setState(prev => ({ ...prev, isGeneratingRecommendations: false }));
      logger.error('Smart recommendations failed', error as Error);
      throw error;
    }
  }, []);

  // Automation Engine Methods
  const generateAutomationSuggestions = useCallback(async (
    contacts: Contact[]
  ): Promise<AutomationSuggestion[]> => {
    setState(prev => ({ ...prev, isOptimizing: true }));
    
    try {
      const suggestions = await aiAutomationEngine.generateAutomationSuggestions(
        contacts,
        state.automationRules
      );

      setState(prev => ({
        ...prev,
        automationSuggestions: suggestions,
        isOptimizing: false
      }));

      logger.info('Automation suggestions generated', { count: suggestions.length });
      return suggestions;
    } catch (error) {
      setState(prev => ({ ...prev, isOptimizing: false }));
      logger.error('Automation suggestions failed', error as Error);
      throw error;
    }
  }, [state.automationRules]);

  const optimizeAutomationRule = useCallback(async (
    ruleId: string,
    performanceData: any[]
  ) => {
    setState(prev => ({ ...prev, isOptimizing: true }));
    
    try {
      const result = await aiAutomationEngine.optimizeExistingRule(ruleId, performanceData);
      
      setState(prev => ({
        ...prev,
        automationRules: prev.automationRules.map(rule => 
          rule.id === ruleId ? result.optimizedRule : rule
        ),
        isOptimizing: false
      }));

      logger.info('Automation rule optimized', { ruleId, improvements: result.improvements });
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isOptimizing: false }));
      logger.error('Rule optimization failed', error as Error);
      throw error;
    }
  }, []);

  // Predictive Analytics Methods
  const generatePredictions = useCallback(async (
    contact: Contact,
    types?: string[]
  ): Promise<Prediction[]> => {
    setState(prev => ({ ...prev, isPredicting: true }));
    
    try {
      const predictions = await aiPredictiveAnalytics.generatePredictions(
        contact,
        types as any
      );

      setState(prev => {
        const newPredictions = new Map(prev.predictions);
        newPredictions.set(contact.id, predictions);
        
        return {
          ...prev,
          predictions: newPredictions,
          isPredicting: false
        };
      });

      logger.info('Predictions generated', { 
        contactId: contact.id, 
        count: predictions.length 
      });
      return predictions;
    } catch (error) {
      setState(prev => ({ ...prev, isPredicting: false }));
      logger.error('Predictions failed', error as Error);
      throw error;
    }
  }, []);

  const analyzeTrends = useCallback(async (
    contact: Contact,
    timeframe: '30d' | '90d' | '6m' | '1y' = '90d'
  ): Promise<TrendAnalysis> => {
    setState(prev => ({ ...prev, isPredicting: true }));
    
    try {
      const analysis = await aiPredictiveAnalytics.analyzeTrends(contact, timeframe);

      setState(prev => {
        const newAnalyses = new Map(prev.trendAnalyses);
        newAnalyses.set(contact.id, analysis);
        
        return {
          ...prev,
          trendAnalyses: newAnalyses,
          isPredicting: false
        };
      });

      logger.info('Trend analysis completed', { contactId: contact.id });
      return analysis;
    } catch (error) {
      setState(prev => ({ ...prev, isPredicting: false }));
      logger.error('Trend analysis failed', error as Error);
      throw error;
    }
  }, []);

  const assessRisk = useCallback(async (
    contact: Contact,
    context?: any
  ): Promise<RiskAssessment> => {
    setState(prev => ({ ...prev, isPredicting: true }));
    
    try {
      const assessment = await aiPredictiveAnalytics.assessRisk(contact, context);

      setState(prev => {
        const newAssessments = new Map(prev.riskAssessments);
        newAssessments.set(contact.id, assessment);
        
        return {
          ...prev,
          riskAssessments: newAssessments,
          isPredicting: false
        };
      });

      logger.info('Risk assessment completed', { contactId: contact.id });
      return assessment;
    } catch (error) {
      setState(prev => ({ ...prev, isPredicting: false }));
      logger.error('Risk assessment failed', error as Error);
      throw error;
    }
  }, []);

  // Utility Methods
  const recordUserFeedback = useCallback((
    recommendationId: string,
    feedback: 'positive' | 'negative'
  ) => {
    aiIntelligenceEngine.recordUserFeedback(recommendationId, feedback);
    logger.info('User feedback recorded', { recommendationId, feedback });
  }, []);

  const recordOutcome = useCallback((
    contactId: string,
    action: string,
    outcome: 'success' | 'failure' | 'partial',
    context: Record<string, any>
  ) => {
    aiIntelligenceEngine.recordOutcome(contactId, action, outcome, context);
    logger.info('Outcome recorded for learning', { contactId, action, outcome });
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const rules = aiAutomationEngine.getAllAutomationRules();
        setState(prev => ({ ...prev, automationRules: rules }));
      } catch (error) {
        logger.error('Failed to load initial automation rules', error as Error);
      }
    };

    loadInitialData();
  }, []);

  // Getters for component data
  const getIntelligenceForContact = useCallback((contactId: string) => {
    return state.intelligenceCorrelations.get(contactId) || [];
  }, [state.intelligenceCorrelations]);

  const getRecommendationsForContact = useCallback((contactId: string) => {
    return state.smartRecommendations.get(contactId) || [];
  }, [state.smartRecommendations]);

  const getPredictionsForContact = useCallback((contactId: string) => {
    return state.predictions.get(contactId) || [];
  }, [state.predictions]);

  const getTrendAnalysisForContact = useCallback((contactId: string) => {
    return state.trendAnalyses.get(contactId);
  }, [state.trendAnalyses]);

  const getRiskAssessmentForContact = useCallback((contactId: string) => {
    return state.riskAssessments.get(contactId);
  }, [state.riskAssessments]);

  const getErrorForContact = useCallback((contactId: string) => {
    return state.errors.get(contactId);
  }, [state.errors]);

  return {
    // State
    ...state,
    
    // Intelligence Engine
    generateIntelligenceCorrelation,
    generateSmartRecommendations,
    
    // Automation Engine
    generateAutomationSuggestions,
    optimizeAutomationRule,
    
    // Predictive Analytics
    generatePredictions,
    analyzeTrends,
    assessRisk,
    
    // Learning & Feedback
    recordUserFeedback,
    recordOutcome,
    
    // Getters
    getIntelligenceForContact,
    getRecommendationsForContact,
    getPredictionsForContact,
    getTrendAnalysisForContact,
    getRiskAssessmentForContact,
    getErrorForContact,
    
    // Performance Metrics
    getPerformanceMetrics: () => ({
      intelligence: aiIntelligenceEngine.getPerformanceMetrics(),
      automation: aiAutomationEngine.getPerformanceMetrics(),
      predictions: aiPredictiveAnalytics.getModelPerformance()
    })
  };
};

// Specialized hooks for specific advanced features
export const useIntelligenceEngine = (contactId?: string) => {
  const advancedAI = useAdvancedAI();
  
  return {
    generateCorrelation: advancedAI.generateIntelligenceCorrelation,
    generateRecommendations: advancedAI.generateSmartRecommendations,
    recordFeedback: advancedAI.recordUserFeedback,
    recordOutcome: advancedAI.recordOutcome,
    intelligence: contactId ? advancedAI.getIntelligenceForContact(contactId) : [],
    recommendations: contactId ? advancedAI.getRecommendationsForContact(contactId) : [],
    isAnalyzing: advancedAI.isAnalyzing,
    error: contactId ? advancedAI.getErrorForContact(contactId) : undefined
  };
};

export const useAutomationEngine = () => {
  const advancedAI = useAdvancedAI();
  
  return {
    generateSuggestions: advancedAI.generateAutomationSuggestions,
    optimizeRule: advancedAI.optimizeAutomationRule,
    suggestions: advancedAI.automationSuggestions,
    rules: advancedAI.automationRules,
    isOptimizing: advancedAI.isOptimizing
  };
};

export const usePredictiveAnalytics = (contactId?: string) => {
  const advancedAI = useAdvancedAI();
  
  return {
    generatePredictions: advancedAI.generatePredictions,
    analyzeTrends: advancedAI.analyzeTrends,
    assessRisk: advancedAI.assessRisk,
    predictions: contactId ? advancedAI.getPredictionsForContact(contactId) : [],
    trendAnalysis: contactId ? advancedAI.getTrendAnalysisForContact(contactId) : undefined,
    riskAssessment: contactId ? advancedAI.getRiskAssessmentForContact(contactId) : undefined,
    isPredicting: advancedAI.isPredicting
  };
};