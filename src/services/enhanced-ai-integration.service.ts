/**
 * Enhanced AI Integration Service
 * Utilizes task router for intelligent model selection between Gemma and OpenAI
 */

import { aiIntegration as baseAIIntegration } from './ai-integration.service';
import { taskRouter, TaskContext, TaskPerformanceMetrics } from './task-router.service';
import { logger } from './logger.service';
import { Contact } from '../types';

export interface EnhancedAIAnalysisRequest {
  contactId: string;
  contact: Contact;
  analysisTypes: Array<'contact_scoring' | 'contact_enrichment' | 'categorization' | 'tagging' | 
                     'relationship_mapping' | 'sentiment_analysis' | 'lead_qualification' | 
                     'opportunity_analysis' | 'risk_assessment' | 'engagement_prediction'>;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  requirements?: Partial<import('./task-router.service').TaskRequirements>;
  businessContext?: string;
}

export interface SmartBulkRequest {
  contacts: Array<{ contactId: string; contact: Contact }>;
  analysisType: 'contact_scoring' | 'categorization' | 'tagging' | 'lead_qualification';
  urgency?: 'low' | 'medium' | 'high';
  costLimit?: number;
  timeLimit?: number;
}

class EnhancedAIIntegrationService {
  
  async smartAnalyzeContact(request: EnhancedAIAnalysisRequest): Promise<any> {
    const startTime = Date.now();
    const { contactId, contact, analysisTypes, urgency = 'medium', requirements, businessContext } = request;
    
    logger.info(`Starting smart analysis for contact ${contactId}`, {
      analysisTypes,
      urgency,
      contactCompany: contact.company
    });

    const results: Record<string, any> = {};
    
    // Process each analysis type with optimal model selection
    for (const analysisType of analysisTypes) {
      try {
        const taskContext: TaskContext = {
          taskType: analysisType,
          requirements: this.getDefaultRequirements(analysisType, urgency, requirements),
          contactData: contact,
          businessContext,
          urgency
        };

        // Select optimal model for this specific task
        const modelSelection = await taskRouter.selectOptimalModel(taskContext);
        
        logger.info(`Selected ${modelSelection.provider}/${modelSelection.model} for ${analysisType}`, {
          reasoning: modelSelection.reasoning,
          confidence: modelSelection.confidenceScore
        });

        // Execute the analysis with selected model
        const analysisResult = await this.executeAnalysisWithModel(
          { contactId, contact, analysisTypes: [analysisType] },
          modelSelection
        );

        results[analysisType] = {
          ...analysisResult,
          modelUsed: `${modelSelection.provider}/${modelSelection.model}`,
          modelReasoning: modelSelection.reasoning,
          selectionConfidence: modelSelection.confidenceScore
        };

        // Record performance metrics
        const metrics: TaskPerformanceMetrics = {
          taskType: analysisType,
          modelUsed: `${modelSelection.provider}/${modelSelection.model}`,
          executionTime: Date.now() - startTime,
          accuracy: this.estimateAccuracy(analysisResult),
          cost: modelSelection.expectedCost,
          success: true,
          timestamp: new Date().toISOString()
        };
        
        taskRouter.recordTaskPerformance(metrics);

      } catch (error) {
        logger.error(`Analysis failed for ${analysisType}`, error as Error, { contactId });
        
        // Record failed performance
        taskRouter.recordTaskPerformance({
          taskType: analysisType,
          modelUsed: 'unknown',
          executionTime: Date.now() - startTime,
          accuracy: 0,
          cost: 0,
          success: false,
          timestamp: new Date().toISOString()
        });

        results[analysisType] = {
          error: error instanceof Error ? error.message : 'Analysis failed',
          failed: true
        };
      }
    }

    const totalTime = Date.now() - startTime;
    
    logger.info(`Smart analysis completed for contact ${contactId}`, {
      totalTime,
      completedTasks: Object.keys(results).filter(k => !results[k].failed).length,
      failedTasks: Object.keys(results).filter(k => results[k].failed).length
    });

    return {
      contactId,
      results,
      totalExecutionTime: totalTime,
      timestamp: new Date().toISOString()
    };
  }

  async smartBulkAnalysis(request: SmartBulkRequest): Promise<any> {
    const { contacts, analysisType, urgency = 'medium', costLimit, timeLimit } = request;
    const startTime = Date.now();
    
    logger.info(`Starting smart bulk analysis`, {
      contactCount: contacts.length,
      analysisType,
      urgency
    });

    // Determine optimal strategy for bulk processing
    const taskContext: TaskContext = {
      taskType: analysisType,
      requirements: {
        accuracy: urgency === 'high' ? 'high' : 'medium',
        speed: 'fast',
        cost: costLimit ? 'low' : 'free',
        complexity: 'simple',
        volume: contacts.length > 50 ? 'bulk' : 'batch'
      },
      urgency,
      batchSize: contacts.length
    };

    const modelSelection = await taskRouter.selectOptimalModel(taskContext);
    
    logger.info(`Selected ${modelSelection.provider}/${modelSelection.model} for bulk ${analysisType}`, {
      contactCount: contacts.length,
      expectedCost: modelSelection.expectedCost * contacts.length,
      reasoning: modelSelection.reasoning
    });

    // Check cost and time constraints
    const estimatedCost = modelSelection.expectedCost * contacts.length;
    const estimatedTime = modelSelection.expectedLatency * Math.ceil(contacts.length / 10); // Batch processing
    
    if (costLimit && estimatedCost > costLimit) {
      // Try to find a cheaper model
      const cheaperContext = { ...taskContext, requirements: { ...taskContext.requirements, cost: 'free' } };
      const cheaperSelection = await taskRouter.selectOptimalModel(cheaperContext);
      
      if (cheaperSelection.expectedCost * contacts.length <= costLimit) {
        logger.info(`Switched to cheaper model due to cost constraint`, {
          original: `${modelSelection.provider}/${modelSelection.model}`,
          cheaper: `${cheaperSelection.provider}/${cheaperSelection.model}`,
          costSavings: (estimatedCost - cheaperSelection.expectedCost * contacts.length)
        });
        return this.executeBulkWithModel(contacts, analysisType, cheaperSelection);
      } else {
        throw new Error(`Cannot complete bulk analysis within cost limit of $${costLimit}`);
      }
    }

    if (timeLimit && estimatedTime > timeLimit) {
      throw new Error(`Estimated completion time (${estimatedTime}ms) exceeds limit (${timeLimit}ms)`);
    }

    return this.executeBulkWithModel(contacts, analysisType, modelSelection);
  }

  private async executeBulkWithModel(
    contacts: Array<{ contactId: string; contact: Contact }>,
    analysisType: string,
    modelSelection: any
  ): Promise<any> {
    const batchSize = this.getOptimalBatchSize(modelSelection.provider, contacts.length);
    const results: any[] = [];
    const failed: any[] = [];
    let totalCost = 0;
    const startTime = Date.now();

    // Process in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      try {
        const batchResults = await this.processBatch(batch, analysisType, modelSelection);
        results.push(...batchResults.successful);
        failed.push(...batchResults.failed);
        totalCost += batchResults.cost;
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        logger.error('Batch processing failed', error as Error, { batchStart: i, batchSize });
        failed.push(...batch.map(c => ({ contactId: c.contactId, error: 'Batch processing failed' })));
      }
    }

    const totalTime = Date.now() - startTime;

    // Record performance metrics
    taskRouter.recordTaskPerformance({
      taskType: `bulk_${analysisType}`,
      modelUsed: `${modelSelection.provider}/${modelSelection.model}`,
      executionTime: totalTime,
      accuracy: results.length / contacts.length,
      cost: totalCost,
      success: results.length > 0,
      timestamp: new Date().toISOString()
    });

    return {
      results,
      failed,
      summary: {
        total: contacts.length,
        successful: results.length,
        failed: failed.length,
        totalCost,
        totalTime,
        modelUsed: `${modelSelection.provider}/${modelSelection.model}`,
        avgCostPerContact: totalCost / contacts.length
      }
    };
  }

  private async processBatch(
    batch: Array<{ contactId: string; contact: Contact }>,
    analysisType: string,
    modelSelection: any
  ): Promise<{ successful: any[]; failed: any[]; cost: number }> {
    const promises = batch.map(async ({ contactId, contact }) => {
      try {
        const result = await this.executeAnalysisWithModel(
          { contactId, contact, analysisTypes: [analysisType] },
          modelSelection
        );
        return { contactId, result, success: true };
      } catch (error) {
        return { contactId, error: error instanceof Error ? error.message : 'Unknown error', success: false };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).map(r => ({ contactId: r.contactId, ...r.result }));
    const failed = results.filter(r => !r.success).map(r => ({ contactId: r.contactId, error: r.error }));
    const cost = modelSelection.expectedCost * batch.length;

    return { successful, failed, cost };
  }

  private async executeAnalysisWithModel(request: any, modelSelection: any): Promise<any> {
    // Use the base AI integration service with the selected model
    const enhancedRequest = {
      ...request,
      options: {
        provider: modelSelection.provider,
        model: modelSelection.model,
        includeConfidence: true
      }
    };

    return baseAIIntegration.analyzeContact(enhancedRequest);
  }

  private getDefaultRequirements(
    analysisType: string, 
    urgency: string, 
    customRequirements?: any
  ): import('./task-router.service').TaskRequirements {
    const baseRequirements = {
      accuracy: urgency === 'critical' ? 'critical' as const : urgency === 'high' ? 'high' as const : 'medium' as const,
      speed: urgency === 'critical' ? 'fast' as const : 'medium' as const,
      cost: 'low' as const,
      complexity: 'medium' as const,
      volume: 'single' as const
    };

    // Task-specific adjustments
    switch (analysisType) {
      case 'categorization':
      case 'tagging':
        baseRequirements.complexity = 'simple';
        baseRequirements.cost = 'free';
        baseRequirements.speed = 'fast';
        break;
      case 'relationship_mapping':
        baseRequirements.complexity = 'expert';
        baseRequirements.accuracy = 'critical';
        break;
      case 'contact_enrichment':
        baseRequirements.complexity = 'complex';
        baseRequirements.cost = 'medium';
        break;
    }

    return { ...baseRequirements, ...customRequirements };
  }

  private getOptimalBatchSize(provider: string, totalContacts: number): number {
    // Optimize batch size based on provider and total volume
    if (provider === 'gemini') {
      return Math.min(20, Math.ceil(totalContacts / 5)); // Gemini handles larger batches well
    } else {
      return Math.min(10, Math.ceil(totalContacts / 10)); // OpenAI more conservative
    }
  }

  private estimateAccuracy(result: any): number {
    // Simple accuracy estimation based on confidence and result completeness
    if (result.confidence) return result.confidence / 100;
    if (result.score) return Math.min(result.score / 100, 1);
    return 0.8; // Default assumption
  }

  // Convenience methods for common operations
  async scoreContact(contactId: string, contact: Contact, urgency: 'low' | 'medium' | 'high' = 'medium'): Promise<any> {
    return this.smartAnalyzeContact({
      contactId,
      contact,
      analysisTypes: ['contact_scoring'],
      urgency
    });
  }

  async enrichContact(contactId: string, contact: Contact, priority: 'standard' | 'premium' = 'standard'): Promise<any> {
    return this.smartAnalyzeContact({
      contactId,
      contact,
      analysisTypes: ['contact_enrichment'],
      urgency: priority === 'premium' ? 'high' : 'medium',
      requirements: priority === 'premium' ? { accuracy: 'critical', cost: 'medium' } : undefined
    });
  }

  async categorizeAndTag(contactId: string, contact: Contact): Promise<any> {
    return this.smartAnalyzeContact({
      contactId,
      contact,
      analysisTypes: ['categorization', 'tagging'],
      urgency: 'medium',
      requirements: { speed: 'fast', cost: 'free' }
    });
  }

  async qualifyLead(contactId: string, contact: Contact, businessContext?: string): Promise<any> {
    return this.smartAnalyzeContact({
      contactId,
      contact,
      analysisTypes: ['lead_qualification', 'contact_scoring', 'sentiment_analysis'],
      urgency: 'high',
      businessContext
    });
  }

  // Performance and monitoring
  getPerformanceInsights(): any {
    return taskRouter.getPerformanceStats();
  }

  getTaskRecommendations(taskType: string): any {
    return taskRouter.getTaskRecommendations(taskType);
  }
}

export const enhancedAI = new EnhancedAIIntegrationService();