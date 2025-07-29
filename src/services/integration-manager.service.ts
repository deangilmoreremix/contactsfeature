/**
 * Integration Manager Service
 * Main orchestrator that coordinates all integration services
 */

import { contactAPI, ContactFilters } from './contact-api.service';
import { aiIntegration, AIAnalysisRequest, BulkAnalysisRequest } from './ai-integration.service';
import { httpClient } from './http-client.service';
import { validationService } from './validation.service';
import { cacheService } from './cache.service';
import { logger } from './logger.service';
import { rateLimiter } from './rate-limiter.service';
import { Contact } from '../types';
import { ContactEnrichmentData } from './aiEnrichmentService';
import apiConfig, { validateConfig } from '../config/api.config';

export interface IntegrationConfig {
  autoEnrichment: boolean;
  autoAnalysis: boolean;
  batchSize: number;
  concurrencyLimit: number;
  retryAttempts: number;
  cacheEnabled: boolean;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'error';
  services: {
    contactAPI: 'up' | 'down' | 'degraded';
    aiProviders: Array<{ name: string; status: 'up' | 'down' | 'rate_limited' }>;
    cache: 'up' | 'down';
    rateLimiter: 'up' | 'down';
  };
  metrics: {
    cacheHitRate: number;
    avgResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
  };
  lastHealthCheck: string;
}

export interface ContactWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  enabled: boolean;
}

export interface WorkflowStep {
  type: 'enrichment' | 'analysis' | 'validation' | 'notification' | 'tagging';
  config: any;
  conditions?: any;
}

export interface WorkflowTrigger {
  type: 'contact_created' | 'contact_updated' | 'score_threshold' | 'manual';
  config: any;
}

class IntegrationManagerService {
  private config: IntegrationConfig = {
    autoEnrichment: true,
    autoAnalysis: true,
    batchSize: 10,
    concurrencyLimit: 5,
    retryAttempts: 3,
    cacheEnabled: true,
  };
  
  private metrics = {
    requestCount: 0,
    errorCount: 0,
    lastRequestTime: 0,
    responseTimes: [] as number[],
  };
  
  private workflows: ContactWorkflow[] = [];
  
  constructor() {
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    try {
      // Validate configuration
      const configErrors = validateConfig();
      if (configErrors.length > 0) {
        logger.warn('Configuration validation issues found', configErrors);
      }
      
      // Initialize default workflows
      this.initializeDefaultWorkflows();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      logger.info('Integration Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Integration Manager', error as Error);
      throw error;
    }
  }
  
  private initializeDefaultWorkflows(): void {
    this.workflows = [
      {
        id: 'new-contact-enrichment',
        name: 'New Contact Enrichment',
        enabled: true,
        triggers: [{ type: 'contact_created', config: {} }],
        steps: [
          { type: 'validation', config: {} },
          { type: 'enrichment', config: { sources: ['email', 'linkedin'] } },
          { type: 'analysis', config: { types: ['scoring', 'categorization'] } },
          { type: 'tagging', config: { autoTag: true } },
        ],
      },
      {
        id: 'high-value-contact-analysis',
        name: 'High Value Contact Analysis',
        enabled: true,
        triggers: [{ type: 'score_threshold', config: { threshold: 80 } }],
        steps: [
          { type: 'analysis', config: { types: ['relationships', 'opportunities'] } },
          { type: 'notification', config: { channels: ['email', 'dashboard'] } },
        ],
      },
    ];
  }
  
  private startHealthMonitoring(): void {
    // Run health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck().catch(error => {
        logger.error('Health check failed', error);
      });
    }, 300000);
    
    // Initial health check
    this.performHealthCheck();
  }
  
  // Contact Management Integration
  async createContact(contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const startTime = Date.now();
    this.trackRequest();
    
    try {
      // Create contact via API
      const contact = await contactAPI.createContact(contactData);
      
      // Execute workflows for new contact
      if (this.config.autoEnrichment || this.config.autoAnalysis) {
        this.executeContactWorkflows(contact, 'contact_created').catch(error => {
          logger.error('Workflow execution failed for new contact', error, { contactId: contact.id });
        });
      }
      
      this.trackSuccess(startTime);
      return contact;
      
    } catch (error) {
      this.trackError(startTime);
      throw error;
    }
  }
  
  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    const startTime = Date.now();
    this.trackRequest();
    
    try {
      const contact = await contactAPI.updateContact(contactId, updates);
      
      // Execute workflows for updated contact
      this.executeContactWorkflows(contact, 'contact_updated').catch(error => {
        logger.error('Workflow execution failed for updated contact', error, { contactId });
      });
      
      this.trackSuccess(startTime);
      return contact;
      
    } catch (error) {
      this.trackError(startTime);
      throw error;
    }
  }
  
  async getContactWithEnrichment(contactId: string): Promise<Contact & { enrichmentData?: ContactEnrichmentData }> {
    const startTime = Date.now();
    this.trackRequest();
    
    try {
      // Get contact
      const contact = await contactAPI.getContact(contactId);
      
      // Get enrichment data if available
      const enrichmentData = cacheService.get<ContactEnrichmentData>('enrichment', contactId);
      
      this.trackSuccess(startTime);
      
      return {
        ...contact,
        enrichmentData: enrichmentData || undefined,
      };
      
    } catch (error) {
      this.trackError(startTime);
      throw error;
    }
  }
  
  // AI Integration Methods
  async analyzeContact(contactId: string, options?: Partial<AIAnalysisRequest['options']>): Promise<any> {
    const startTime = Date.now();
    this.trackRequest();
    
    try {
      const contact = await contactAPI.getContact(contactId);
      
      const analysisRequest: AIAnalysisRequest = {
        contactId,
        contact,
        analysisTypes: ['scoring', 'categorization', 'tagging'],
        options,
      };
      
      const result = await aiIntegration.analyzeContact(analysisRequest);
      
      // Update contact with AI insights
      if (result.score !== undefined || result.tags.length > 0) {
        const updates: Partial<Contact> = {};
        
        if (result.score !== undefined) {
          updates.aiScore = result.score;
        }
        
        if (result.tags.length > 0) {
          updates.tags = [...(contact.tags || []), ...result.tags];
        }
        
        if (Object.keys(updates).length > 0) {
          await contactAPI.updateContact(contactId, updates);
        }
      }
      
      this.trackSuccess(startTime);
      return result;
      
    } catch (error) {
      this.trackError(startTime);
      throw error;
    }
  }
  
  async enrichAndAnalyzeContact(
    contactId: string,
    enrichmentRequest?: Partial<ContactEnrichmentData>
  ): Promise<{ contact: Contact; enrichment: ContactEnrichmentData; analysis: any }> {
    const startTime = Date.now();
    this.trackRequest();
    
    try {
      // Get contact
      let contact = await contactAPI.getContact(contactId);
      
      // Enrich contact data
      const enrichmentData = enrichmentRequest 
        ? await aiIntegration.enrichContact(contactId, enrichmentRequest)
        : await aiIntegration.enrichContact(contactId, {
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            company: contact.company,
          });
      
      // Update contact with enrichment data
      const enrichmentUpdates: Partial<Contact> = {};
      
      if (enrichmentData.phone && !contact.phone) {
        enrichmentUpdates.phone = enrichmentData.phone;
      }
      
      if (enrichmentData.industry && !contact.industry) {
        enrichmentUpdates.industry = enrichmentData.industry;
      }
      
      if (enrichmentData.socialProfiles) {
        enrichmentUpdates.socialProfiles = {
          ...contact.socialProfiles,
          ...enrichmentData.socialProfiles,
        };
      }
      
      if (Object.keys(enrichmentUpdates).length > 0) {
        contact = await contactAPI.updateContact(contactId, enrichmentUpdates);
      }
      
      // Analyze enriched contact
      const analysis = await this.analyzeContact(contactId);
      
      this.trackSuccess(startTime);
      
      return {
        contact,
        enrichment: enrichmentData,
        analysis,
      };
      
    } catch (error) {
      this.trackError(startTime);
      throw error;
    }
  }
  
  // Bulk Operations
  async bulkAnalyzeContacts(
    contactIds: string[],
    analysisTypes: AIAnalysisRequest['analysisTypes'] = ['scoring']
  ): Promise<any> {
    const startTime = Date.now();
    this.trackRequest();
    
    try {
      const request: BulkAnalysisRequest = {
        contactIds,
        analysisTypes,
        options: { includeConfidence: true },
      };
      
      const result = await aiIntegration.analyzeBulk(request);
      
      // Update contacts with analysis results
      const updatePromises = result.results.map(async (analysis) => {
        const updates: Partial<Contact> = {};
        
        if (analysis.score !== undefined) {
          updates.aiScore = analysis.score;
        }
        
        if (analysis.tags.length > 0) {
          const contact = await contactAPI.getContact(analysis.contactId);
          updates.tags = [...(contact.tags || []), ...analysis.tags];
        }
        
        if (Object.keys(updates).length > 0) {
          return contactAPI.updateContact(analysis.contactId, updates);
        }
      });
      
      await Promise.all(updatePromises.filter(Boolean));
      
      this.trackSuccess(startTime);
      return result;
      
    } catch (error) {
      this.trackError(startTime);
      throw error;
    }
  }
  
  // Workflow Execution
  private async executeContactWorkflows(contact: Contact, trigger: WorkflowTrigger['type']): Promise<void> {
    const applicableWorkflows = this.workflows.filter(workflow => 
      workflow.enabled && workflow.triggers.some(t => t.type === trigger)
    );
    
    for (const workflow of applicableWorkflows) {
      try {
        await this.executeWorkflow(workflow, contact);
      } catch (error) {
        logger.error(`Workflow execution failed: ${workflow.name}`, error as Error, {
          contactId: contact.id,
          workflowId: workflow.id,
        });
      }
    }
  }
  
  private async executeWorkflow(workflow: ContactWorkflow, contact: Contact): Promise<void> {
    logger.info(`Executing workflow: ${workflow.name}`, { 
      contactId: contact.id, 
      workflowId: workflow.id 
    });
    
    for (const step of workflow.steps) {
      try {
        await this.executeWorkflowStep(step, contact);
      } catch (error) {
        logger.error(`Workflow step failed: ${step.type}`, error as Error, {
          contactId: contact.id,
          workflowId: workflow.id,
          stepType: step.type,
        });
        
        // Continue with other steps on error
        continue;
      }
    }
  }
  
  private async executeWorkflowStep(step: WorkflowStep, contact: Contact): Promise<void> {
    switch (step.type) {
      case 'validation':
        const validation = validationService.validateContact(contact);
        if (!validation.isValid) {
          throw new Error(`Contact validation failed: ${Object.values(validation.errors).flat().join(', ')}`);
        }
        break;
        
      case 'enrichment':
        await aiIntegration.enrichContact(contact.id, {
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          company: contact.company,
        });
        break;
        
      case 'analysis':
        await this.analyzeContact(contact.id);
        break;
        
      case 'tagging':
        if (step.config.autoTag) {
          // Auto-generate tags based on contact data
          const tags = this.generateAutoTags(contact);
          if (tags.length > 0) {
            await contactAPI.updateContact(contact.id, {
              tags: [...(contact.tags || []), ...tags],
            });
          }
        }
        break;
        
      case 'notification':
        // Send notifications (implementation would depend on notification service)
        logger.info('Notification step executed', { 
          contactId: contact.id, 
          channels: step.config.channels 
        });
        break;
    }
  }
  
  private generateAutoTags(contact: Contact): string[] {
    const tags: string[] = [];
    
    // Industry-based tags
    if (contact.industry) {
      tags.push(contact.industry.toLowerCase());
    }
    
    // Role-based tags
    if (contact.title) {
      const title = contact.title.toLowerCase();
      if (title.includes('ceo') || title.includes('founder')) {
        tags.push('decision-maker');
      }
      if (title.includes('manager') || title.includes('director')) {
        tags.push('manager');
      }
      if (title.includes('marketing')) {
        tags.push('marketing');
      }
      if (title.includes('sales')) {
        tags.push('sales');
      }
    }
    
    // Interest level tags
    if (contact.interestLevel === 'hot') {
      tags.push('high-priority');
    }
    
    // Company size estimation (basic)
    const largeCorp = ['microsoft', 'google', 'apple', 'amazon'];
    if (largeCorp.some(corp => contact.company.toLowerCase().includes(corp))) {
      tags.push('enterprise');
    }
    
    return tags;
  }
  
  // Health Monitoring
  async performHealthCheck(): Promise<SystemStatus> {
    const healthCheck: SystemStatus = {
      status: 'healthy',
      services: {
        contactAPI: 'up',
        aiProviders: [],
        cache: 'up',
        rateLimiter: 'up',
      },
      metrics: {
        cacheHitRate: 0,
        avgResponseTime: 0,
        errorRate: 0,
        requestsPerMinute: 0,
      },
      lastHealthCheck: new Date().toISOString(),
    };
    
    try {
      // Check contact API
      try {
        await httpClient.get(`${apiConfig.contactsAPI.baseURL}/health`, undefined, { timeout: 5000 });
      } catch (error) {
        healthCheck.services.contactAPI = 'down';
        healthCheck.status = 'degraded';
      }
      
      // Check AI providers
      const providerStatus = await aiIntegration.getProviderStatus();
      healthCheck.services.aiProviders = providerStatus.map(p => ({
        name: p.name,
        status: p.status === 'available' ? 'up' : p.status === 'rate_limited' ? 'rate_limited' : 'down',
      }));
      
      // Check cache
      try {
        cacheService.set('health_check', 'test', { test: true }, 1000);
        const testData = cacheService.get('health_check', 'test');
        if (!testData) {
          healthCheck.services.cache = 'down';
          healthCheck.status = 'degraded';
        }
      } catch (error) {
        healthCheck.services.cache = 'down';
        healthCheck.status = 'degraded';
      }
      
      // Calculate metrics
      const cacheStats = cacheService.getStats();
      healthCheck.metrics.cacheHitRate = cacheStats.hitRate;
      
      if (this.metrics.responseTimes.length > 0) {
        healthCheck.metrics.avgResponseTime = 
          this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
      }
      
      if (this.metrics.requestCount > 0) {
        healthCheck.metrics.errorRate = this.metrics.errorCount / this.metrics.requestCount;
      }
      
      // Calculate requests per minute
      const oneMinuteAgo = Date.now() - 60000;
      healthCheck.metrics.requestsPerMinute = this.metrics.requestCount; // Simplified
      
      // Determine overall status
      if (healthCheck.services.contactAPI === 'down' || 
          healthCheck.services.cache === 'down' ||
          healthCheck.metrics.errorRate > 0.1) {
        healthCheck.status = 'error';
      } else if (healthCheck.services.contactAPI === 'degraded' ||
                 healthCheck.services.aiProviders.every(p => p.status !== 'up')) {
        healthCheck.status = 'degraded';
      }
      
      logger.debug('Health check completed', healthCheck);
      
    } catch (error) {
      logger.error('Health check failed', error as Error);
      healthCheck.status = 'error';
    }
    
    return healthCheck;
  }
  
  // Metrics Tracking
  private trackRequest(): void {
    this.metrics.requestCount++;
    this.metrics.lastRequestTime = Date.now();
  }
  
  private trackSuccess(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only last 100 response times
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-100);
    }
  }
  
  private trackError(startTime: number): void {
    this.metrics.errorCount++;
    this.trackSuccess(startTime); // Still track response time
  }
  
  // Configuration Methods
  updateConfiguration(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Integration configuration updated', newConfig);
  }
  
  getConfiguration(): IntegrationConfig {
    return { ...this.config };
  }
  
  // Utility Methods
  async clearAllCaches(): Promise<void> {
    cacheService.clear();
    await aiIntegration.clearCache();
    logger.info('All caches cleared');
  }
  
  async getSystemMetrics(): Promise<any> {
    return {
      ...this.metrics,
      cache: cacheService.getStats(),
      rateLimiter: rateLimiter.getStats(),
    };
  }
}

export const integrationManager = new IntegrationManagerService();