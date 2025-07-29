/**
 * React Hook for Integration System
 * Provides easy access to integration services from React components
 */

import { useState, useEffect, useCallback } from 'react';
import { integrationManager } from '../services/integration-manager.service';
import { contactAPI, ContactFilters } from '../services/contact-api.service';
import { aiIntegration, AIAnalysisRequest } from '../services/ai-integration.service';
import { logger } from '../services/logger.service';
import { Contact } from '../types';
import { ContactEnrichmentData } from '../services/aiEnrichmentService';

export interface IntegrationState {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
}

export interface AIState {
  analyzing: boolean;
  enriching: boolean;
  results: Record<string, any>;
  errors: Record<string, string>;
}

export interface SystemState {
  health: any;
  metrics: any;
  providerStatus: any[];
}

export const useIntegration = () => {
  const [contactState, setContactState] = useState<IntegrationState>({
    contacts: [],
    loading: false,
    error: null,
    hasMore: false,
    total: 0,
  });

  const [aiState, setAIState] = useState<AIState>({
    analyzing: false,
    enriching: false,
    results: {},
    errors: {},
  });

  const [systemState, setSystemState] = useState<SystemState>({
    health: null,
    metrics: null,
    providerStatus: [],
  });

  // Contact Management
  const loadContacts = useCallback(async (filters: ContactFilters = {}) => {
    setContactState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await contactAPI.getContacts(filters);
      
      setContactState({
        contacts: response.contacts,
        loading: false,
        error: null,
        hasMore: response.hasMore,
        total: response.total,
      });
      
      logger.info('Contacts loaded successfully', { count: response.contacts.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load contacts';
      setContactState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      logger.error('Failed to load contacts', error as Error);
    }
  }, []);

  const createContact = useCallback(async (contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
    setContactState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const contact = await integrationManager.createContact(contactData);
      
      setContactState(prev => ({
        ...prev,
        contacts: [contact, ...prev.contacts],
        loading: false,
        total: prev.total + 1,
      }));
      
      logger.info('Contact created successfully', { contactId: contact.id });
      return contact;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create contact';
      setContactState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      logger.error('Failed to create contact', error as Error);
      throw error;
    }
  }, []);

  const updateContact = useCallback(async (contactId: string, updates: Partial<Contact>) => {
    try {
      const contact = await integrationManager.updateContact(contactId, updates);
      
      setContactState(prev => ({
        ...prev,
        contacts: prev.contacts.map(c => c.id === contactId ? contact : c),
      }));
      
      logger.info('Contact updated successfully', { contactId });
      return contact;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update contact';
      logger.error('Failed to update contact', error as Error, { contactId });
      throw new Error(errorMessage);
    }
  }, []);

  const deleteContact = useCallback(async (contactId: string) => {
    try {
      await contactAPI.deleteContact(contactId);
      
      setContactState(prev => ({
        ...prev,
        contacts: prev.contacts.filter(c => c.id !== contactId),
        total: Math.max(0, prev.total - 1),
      }));
      
      logger.info('Contact deleted successfully', { contactId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete contact';
      logger.error('Failed to delete contact', error as Error, { contactId });
      throw new Error(errorMessage);
    }
  }, []);

  // AI Operations
  const analyzeContact = useCallback(async (contactId: string, options?: Partial<AIAnalysisRequest['options']>) => {
    setAIState(prev => ({
      ...prev,
      analyzing: true,
      errors: { ...prev.errors, [contactId]: '' },
    }));
    
    try {
      const result = await integrationManager.analyzeContact(contactId, options);
      
      setAIState(prev => ({
        ...prev,
        analyzing: false,
        results: { ...prev.results, [contactId]: result },
      }));
      
      // Update contact in state with new AI score
      if (result.score !== undefined) {
        setContactState(prev => ({
          ...prev,
          contacts: prev.contacts.map(c => 
            c.id === contactId ? { ...c, aiScore: result.score } : c
          ),
        }));
      }
      
      logger.info('Contact analysis completed', { contactId, score: result.score });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      
      setAIState(prev => ({
        ...prev,
        analyzing: false,
        errors: { ...prev.errors, [contactId]: errorMessage },
      }));
      
      logger.error('Contact analysis failed', error as Error, { contactId });
      throw error;
    }
  }, []);

  const enrichContact = useCallback(async (
    contactId: string,
    enrichmentRequest?: Partial<ContactEnrichmentData>
  ) => {
    setAIState(prev => ({
      ...prev,
      enriching: true,
      errors: { ...prev.errors, [`enrich_${contactId}`]: '' },
    }));
    
    try {
      const result = await integrationManager.enrichAndAnalyzeContact(contactId, enrichmentRequest);
      
      setAIState(prev => ({
        ...prev,
        enriching: false,
        results: { 
          ...prev.results, 
          [`enrich_${contactId}`]: result.enrichment,
          [`analyze_${contactId}`]: result.analysis,
        },
      }));
      
      // Update contact in state
      setContactState(prev => ({
        ...prev,
        contacts: prev.contacts.map(c => 
          c.id === contactId ? result.contact : c
        ),
      }));
      
      logger.info('Contact enrichment completed', { contactId });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Enrichment failed';
      
      setAIState(prev => ({
        ...prev,
        enriching: false,
        errors: { ...prev.errors, [`enrich_${contactId}`]: errorMessage },
      }));
      
      logger.error('Contact enrichment failed', error as Error, { contactId });
      throw error;
    }
  }, []);

  const bulkAnalyzeContacts = useCallback(async (contactIds: string[]) => {
    setAIState(prev => ({ ...prev, analyzing: true }));
    
    try {
      const result = await integrationManager.bulkAnalyzeContacts(contactIds);
      
      // Update contacts with analysis results
      setContactState(prev => ({
        ...prev,
        contacts: prev.contacts.map(contact => {
          const analysis = result.results.find(r => r.contactId === contact.id);
          return analysis && analysis.score !== undefined 
            ? { ...contact, aiScore: analysis.score }
            : contact;
        }),
      }));
      
      setAIState(prev => ({
        ...prev,
        analyzing: false,
        results: {
          ...prev.results,
          bulk_analysis: result,
        },
      }));
      
      logger.info('Bulk analysis completed', { 
        total: result.summary.total,
        successful: result.summary.successful,
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk analysis failed';
      
      setAIState(prev => ({
        ...prev,
        analyzing: false,
        errors: { ...prev.errors, bulk_analysis: errorMessage },
      }));
      
      logger.error('Bulk analysis failed', error as Error);
      throw error;
    }
  }, []);

  // System Monitoring
  const loadSystemHealth = useCallback(async () => {
    try {
      const [health, metrics, providerStatus] = await Promise.all([
        integrationManager.performHealthCheck(),
        integrationManager.getSystemMetrics(),
        aiIntegration.getProviderStatus(),
      ]);
      
      setSystemState({
        health,
        metrics,
        providerStatus,
      });
      
      logger.debug('System health loaded', { status: health.status });
    } catch (error) {
      logger.error('Failed to load system health', error as Error);
    }
  }, []);

  const clearCaches = useCallback(async () => {
    try {
      await integrationManager.clearAllCaches();
      logger.info('All caches cleared');
    } catch (error) {
      logger.error('Failed to clear caches', error as Error);
      throw error;
    }
  }, []);

  // Utility functions
  const getContactById = useCallback((contactId: string) => {
    return contactState.contacts.find(c => c.id === contactId);
  }, [contactState.contacts]);

  const getAnalysisResult = useCallback((contactId: string) => {
    return aiState.results[contactId] || aiState.results[`analyze_${contactId}`];
  }, [aiState.results]);

  const getEnrichmentResult = useCallback((contactId: string) => {
    return aiState.results[`enrich_${contactId}`];
  }, [aiState.results]);

  const getContactError = useCallback((contactId: string) => {
    return aiState.errors[contactId] || aiState.errors[`enrich_${contactId}`];
  }, [aiState.errors]);

  // Auto-load system health on mount
  useEffect(() => {
    loadSystemHealth();
    
    // Refresh health check every 5 minutes
    const interval = setInterval(loadSystemHealth, 300000);
    
    return () => clearInterval(interval);
  }, [loadSystemHealth]);

  return {
    // State
    contacts: contactState.contacts,
    loading: contactState.loading,
    error: contactState.error,
    hasMore: contactState.hasMore,
    total: contactState.total,
    analyzing: aiState.analyzing,
    enriching: aiState.enriching,
    systemHealth: systemState.health,
    systemMetrics: systemState.metrics,
    providerStatus: systemState.providerStatus,
    
    // Contact operations
    loadContacts,
    createContact,
    updateContact,
    deleteContact,
    
    // AI operations
    analyzeContact,
    enrichContact,
    bulkAnalyzeContacts,
    
    // System operations
    loadSystemHealth,
    clearCaches,
    
    // Utility functions
    getContactById,
    getAnalysisResult,
    getEnrichmentResult,
    getContactError,
  };
};

// Specialized hooks for specific use cases
export const useContactAnalysis = (contactId: string) => {
  const { analyzeContact, getAnalysisResult, getContactError, analyzing } = useIntegration();
  
  const analysis = getAnalysisResult(contactId);
  const error = getContactError(contactId);
  
  const runAnalysis = useCallback((options?: Partial<AIAnalysisRequest['options']>) => {
    return analyzeContact(contactId, options);
  }, [analyzeContact, contactId]);
  
  return {
    analysis,
    error,
    analyzing,
    runAnalysis,
  };
};

export const useContactEnrichment = (contactId: string) => {
  const { enrichContact, getEnrichmentResult, getContactError, enriching } = useIntegration();
  
  const enrichment = getEnrichmentResult(contactId);
  const error = getContactError(contactId);
  
  const runEnrichment = useCallback((request?: Partial<ContactEnrichmentData>) => {
    return enrichContact(contactId, request);
  }, [enrichContact, contactId]);
  
  return {
    enrichment,
    error,
    enriching,
    runEnrichment,
  };
};

export const useSystemHealth = () => {
  const { systemHealth, systemMetrics, providerStatus, loadSystemHealth } = useIntegration();
  
  return {
    health: systemHealth,
    metrics: systemMetrics,
    providers: providerStatus,
    refresh: loadSystemHealth,
  };
};