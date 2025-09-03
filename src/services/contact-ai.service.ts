/**
 * Contact AI Service
 * Specialized AI operations for contact management and analysis
 */

import { aiOrchestrator, AIRequest } from './ai-orchestrator.service';
import { logger } from './logger.service';
import { webSearchService } from './webSearchService';
import { Contact } from '../types';

export interface ContactInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'recommendation' | 'prediction' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  actionable: boolean;
  suggestedActions?: string[];
  relatedContacts?: string[];
  dataPoints: string[];
}

export interface ContactScore {
  overall: number;
  breakdown: {
    fitScore: number;
    engagementScore: number;
    conversionProbability: number;
    urgencyScore: number;
  };
  reasoning: string[];
  recommendations: string[];
  nextBestActions: string[];
  provider?: string;
  model?: string;
  timestamp?: string;
}

export interface RelationshipMap {
  contactId: string;
  relationships: Array<{
    targetContactId: string;
    targetName: string;
    targetCompany: string;
    relationshipType: 'colleague' | 'competitor' | 'partner' | 'client' | 'vendor';
    strength: number;
    confidence: number;
    discoveredThrough: string[];
  }>;
  networkInsights: string[];
  influenceMap: Record<string, number>;
}

export interface PredictiveAnalytics {
  contactId: string;
  predictions: Array<{
    type: 'conversion' | 'churn' | 'upsell' | 'response_time' | 'engagement_decline';
    probability: number;
    timeframe: string;
    confidence: number;
    factors: string[];
    recommendations: string[];
  }>;
  trendAnalysis: {
    engagementTrend: 'increasing' | 'stable' | 'declining';
    responseTimeTrend: 'improving' | 'stable' | 'degrading';
    interestTrend: 'growing' | 'maintained' | 'waning';
  };
  optimalActions: Array<{
    action: string;
    timing: string;
    expectedOutcome: string;
    confidence: number;
  }>;
}

class ContactAIService {
  
  async scoreContact(
    contact: Contact,
    context?: {
      businessGoals?: string[];
      industryContext?: string;
      competitorInfo?: any;
      webResearch?: string; // NEW: Web research context
      companyContext?: any[]; // NEW: Company research sources
    }
  ): Promise<ContactScore> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'contact_scoring',
      priority: 'medium',
      data: {
        contact,
        context,
        webResearch: context?.webResearch,
        companyContext: context?.companyContext
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      
      return {
        overall: response.result.score || 0,
        breakdown: response.result.breakdown || {
          fitScore: 0,
          engagementScore: 0,
          conversionProbability: 0,
          urgencyScore: 0
        },
        reasoning: response.result.reasoning || [],
        recommendations: response.result.recommendations || [],
        nextBestActions: response.result.nextBestActions || []
      };
    } catch (error) {
      logger.error('Contact scoring failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  async generateInsights(
    contact: Contact,
    insightTypes: ContactInsight['type'][] = ['opportunity', 'recommendation'],
    context?: {
      recentInteractions?: any[];
      businessContext?: string;
      goalContext?: string[];
      webResearch?: string; // NEW: Web research context
      companyContext?: any[]; // NEW: Company research sources
    }
  ): Promise<ContactInsight[]> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'insights_generation',
      priority: 'medium',
      data: {
        contact,
        insightTypes,
        context,
        webResearch: context?.webResearch,
        companyContext: context?.companyContext
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      
      return response.result.insights.map((insight: any) => ({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence || 80,
        impact: insight.impact || 'medium',
        category: insight.category || 'General',
        actionable: insight.actionable || false,
        suggestedActions: insight.suggestedActions || [],
        relatedContacts: insight.relatedContacts || [],
        dataPoints: insight.dataPoints || []
      }));
    } catch (error) {
      logger.error('Contact insights generation failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  async analyzeRelationships(
    contact: Contact,
    allContacts: Contact[],
    depth: 'shallow' | 'deep' = 'shallow'
  ): Promise<RelationshipMap> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'relationship_mapping',
      priority: depth === 'deep' ? 'high' : 'medium',
      data: {
        contact,
        contactNetwork: allContacts,
        analysisDepth: depth
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      
      return {
        contactId: contact.id,
        relationships: response.result.relationships || [],
        networkInsights: response.result.networkInsights || [],
        influenceMap: response.result.influenceMap || {}
      };
    } catch (error) {
      logger.error('Relationship analysis failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  async getPredictiveAnalytics(
    contact: Contact,
    interactionHistory?: any[],
    timeframe: '30d' | '90d' | '1y' = '90d'
  ): Promise<PredictiveAnalytics> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'predictive_analytics',
      priority: 'medium',
      data: {
        contact,
        interactionHistory,
        timeframe
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      
      return {
        contactId: contact.id,
        predictions: response.result.predictions || [],
        trendAnalysis: response.result.trendAnalysis || {
          engagementTrend: 'stable',
          responseTimeTrend: 'stable',
          interestTrend: 'maintained'
        },
        optimalActions: response.result.optimalActions || []
      };
    } catch (error) {
      logger.error('Predictive analytics failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  async enrichContact(
    contact: Contact,
    enrichmentType: 'basic' | 'comprehensive' | 'social' = 'basic'
  ): Promise<any> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'contact_enrichment',
      priority: enrichmentType === 'comprehensive' ? 'high' : 'medium',
      data: {
        contact,
        enrichmentLevel: enrichmentType
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      return response.result;
    } catch (error) {
      logger.error('Contact enrichment failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  async analyzeEngagementPatterns(
    contact: Contact,
    interactionHistory: any[]
  ): Promise<{
    patterns: Array<{
      type: string;
      frequency: string;
      trend: 'increasing' | 'stable' | 'decreasing';
      insights: string[];
    }>;
    optimalTiming: {
      bestDayOfWeek: string;
      bestTimeOfDay: string;
      responseWindow: string;
    };
    preferences: {
      preferredChannel: string;
      communicationStyle: string;
      contentPreferences: string[];
    };
    recommendations: string[];
  }> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'communication_analysis',
      priority: 'medium',
      data: {
        contact,
        interactionHistory
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      return response.result;
    } catch (error) {
      logger.error('Engagement pattern analysis failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  async getBulkInsights(
    contacts: Contact[],
    insightType: 'scoring' | 'categorization' | 'opportunity_analysis' = 'scoring'
  ): Promise<Array<{ contactId: string; insights: any; error?: string }>> {
    const results = [];
    
    // Process in batches of 5 to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (contact) => {
        try {
          let insights;
          
          switch (insightType) {
            case 'scoring':
              insights = await this.scoreContact(contact);
              break;
            case 'categorization':
              insights = await this.generateInsights(contact, ['recommendation']);
              break;
            case 'opportunity_analysis':
              insights = await this.generateInsights(contact, ['opportunity', 'prediction']);
              break;
          }
          
          return { contactId: contact.id, insights };
        } catch (error) {
          return { 
            contactId: contact.id, 
            insights: null, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  // NEW: Web-integrated AI analysis
  async generateWebInsights(
    contact: Contact,
    insightTypes: ContactInsight['type'][] = ['opportunity', 'recommendation'],
    options: {
      performWebSearch?: boolean;
      searchQuery?: string;
      industryContext?: string;
      competitorAnalysis?: boolean;
    } = {}
  ): Promise<{
    insights: ContactInsight[];
    webSources: any[];
    analysisMetadata: {
      searchPerformed: boolean;
      sourcesAnalyzed: number;
      confidence: number;
    };
  }> {
    logger.info(`Generating web-integrated insights for contact: ${contact.id}`);

    let webResearch = '';
    let webSources: any[] = [];

    // Perform web search if requested
    if (options.performWebSearch && contact.company) {
      try {
        const searchQuery = options.searchQuery ||
          `${contact.company} ${contact.firstName || ''} ${contact.lastName || ''} company news industry trends business insights`;

        const systemPrompt = `You are a business intelligence expert. Analyze this contact's company and industry to provide actionable insights for sales and relationship building. Focus on recent developments, market position, and strategic opportunities.`;
        const userPrompt = `Research ${contact.firstName || ''} ${contact.lastName || ''} at ${contact.company} and provide insights for ${insightTypes.join(', ')}. Include recent company news, industry trends, and strategic opportunities.`;

        const searchResults = await webSearchService.searchWithAI(
          searchQuery,
          systemPrompt,
          userPrompt,
          {
            includeSources: true,
            searchContextSize: 'high'
          }
        );

        webResearch = searchResults.content;
        webSources = searchResults.sources.map(source => ({
          url: source.url,
          title: source.title,
          domain: source.domain,
          type: 'company' as const,
          confidence: 85,
          timestamp: new Date(),
          snippet: searchResults.content.substring(0, 200) + '...'
        }));

        logger.info(`Web research completed for ${contact.company}, found ${webSources.length} sources`);
      } catch (error) {
        logger.error('Web research failed', error as Error);
        // Continue without web research
      }
    }

    // Generate insights with web research context
    const insights = await this.generateInsights(contact, insightTypes, {
      webResearch,
      companyContext: webSources
    });

    return {
      insights,
      webSources,
      analysisMetadata: {
        searchPerformed: options.performWebSearch || false,
        sourcesAnalyzed: webSources.length,
        confidence: webSources.length > 0 ? 90 : 75
      }
    };
  }

  // Utility methods for contact analysis
  calculateEngagementScore(contact: Contact, interactions?: any[]): number {
    let score = 50; // Base score
    
    // Adjust based on interest level
    switch (contact.interestLevel) {
      case 'hot': score += 30; break;
      case 'medium': score += 10; break;
      case 'low': score -= 10; break;
      case 'cold': score -= 20; break;
    }
    
    // Adjust based on AI score if available
    if (contact.aiScore) {
      score = (score + contact.aiScore) / 2;
    }
    
    // Adjust based on interaction frequency
    if (interactions && interactions.length > 0) {
      score += Math.min(20, interactions.length * 2);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  generateQuickRecommendations(contact: Contact): string[] {
    const recommendations = [];
    
    if (contact.interestLevel === 'hot') {
      recommendations.push('Schedule immediate follow-up call');
      recommendations.push('Send personalized proposal');
    } else if (contact.interestLevel === 'medium') {
      recommendations.push('Share relevant case studies');
      recommendations.push('Schedule discovery call');
    } else {
      recommendations.push('Add to nurturing campaign');
      recommendations.push('Research company updates');
    }
    
    if (!contact.phone) {
      recommendations.push('Find contact phone number');
    }
    
    if (!contact.socialProfiles?.linkedin) {
      recommendations.push('Connect on LinkedIn');
    }
    
    return recommendations;
  }
}

export const contactAI = new ContactAIService();