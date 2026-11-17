/**
 * AI Intelligence Engine
 * Advanced cross-component intelligence that connects insights from all AI operations
 */

import { logger } from './logger.service';
import { cacheService } from './cache.service';
import { Contact } from '../types';
import { contactAI, ContactInsight, ContactScore } from './contact-ai.service';
import { communicationAI } from './communication-ai.service';
import { aiJson } from './aiClient';
import type { LiveOptions } from './liveOptions';
import { RECOMMENDATIONS_SCHEMA, normalizeRecommendations, PREDICTIVE_SCHEMA, normalizePredictive, type NormalizedPredictive } from './intelligenceSchemas';

export interface IntelligenceCorrelation {
  id: string;
  contactId: string;
  correlationType: 'behavioral' | 'predictive' | 'strategic' | 'risk';
  insights: Array<{
    source: string;
    insight: ContactInsight;
    weight: number;
    confidence: number;
  }>;
  metaInsight: {
    title: string;
    description: string;
    actionPriority: 'urgent' | 'high' | 'medium' | 'low';
    suggestedActions: string[];
    predictedOutcome: string;
    confidence: number;
  };
  createdAt: string;
}

export interface LearningPattern {
  id: string;
  patternType: 'success' | 'failure' | 'engagement' | 'conversion';
  conditions: Record<string, any>;
  outcomes: Record<string, any>;
  frequency: number;
  confidence: number;
  applicableContactTypes: string[];
}

export interface SmartRecommendation {
  id: string;
  contactId: string;
  type: 'action' | 'communication' | 'automation' | 'content';
  title: string;
  description: string;
  reasoning: string[];
  expectedOutcome: string;
  priority: number;
  urgency: 'immediate' | 'this_week' | 'this_month' | 'future';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  /** 0-100 evidence-based confidence, or null when unknown. */
  confidence: number | null;
  basedOnPatterns: string[];
  createdAt: string;
}

class AIIntelligenceEngine {
  private correlations: Map<string, IntelligenceCorrelation[]> = new Map();
  private learningPatterns: LearningPattern[] = [];
  private userFeedback: Map<string, { positive: number; negative: number }> = new Map();

  constructor() {
    this.initializeLearningPatterns();
    this.loadUserFeedback();
  }

  // Core Intelligence Methods
  async generateIntelligenceCorrelation(
    contactId: string,
    contact: Contact,
    recentInsights: ContactInsight[] = [],
    communicationHistory: any[] = [],
    live?: LiveOptions
  ): Promise<IntelligenceCorrelation> {
    logger.info('Generating intelligence correlation', { contactId });

    // Gather insights from multiple sources
    const insights = await this.gatherMultiSourceInsights(contactId, contact, recentInsights, live);
    
    // Analyze correlations and patterns
    const correlation = this.analyzeInsightCorrelations(contactId, insights, communicationHistory);
    
    // Generate meta-insights
    const metaInsight = this.generateMetaInsight(correlation, contact);
    
    const intelligenceCorrelation: IntelligenceCorrelation = {
      id: `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId,
      correlationType: this.determineCorrelationType(metaInsight),
      insights,
      metaInsight,
      createdAt: new Date().toISOString()
    };

    // Store correlation
    const existing = this.correlations.get(contactId) || [];
    existing.push(intelligenceCorrelation);
    this.correlations.set(contactId, existing.slice(-10)); // Keep last 10

    // Cache for quick access
    cacheService.set('intelligence', contactId, intelligenceCorrelation, 3600000); // 1 hour

    return intelligenceCorrelation;
  }

  async generateSmartRecommendations(
    contactId: string,
    contact: Contact,
    context?: {
      recentInteractions?: any[];
      dealStage?: string;
      lastContact?: string;
      responseRate?: number;
    },
    live?: LiveOptions
  ): Promise<SmartRecommendation[]> {
    logger.info('Generating smart recommendations', { contactId });

    // Throws AIError on failure (shown by AIErrorToaster); no canned recommendations.
    const raw = await aiJson<unknown>({
      role: 'default',
      effort: 'low',
      instructions:
        'You are a sales strategist. Recommend next steps for ONE contact using only the supplied data. ' +
        'Every recommendation must cite the contact fields it relies on in "reasoning". Do not invent statistics, ' +
        'response rates or percentages. "confidence" is a 0-100 integer reflecting how well the supplied data supports ' +
        'the recommendation, or null. Return an empty list if the data is too thin.',
      input: JSON.stringify({ contact: this.contactSnapshot(contact), context: context ?? null, today: new Date().toISOString().slice(0, 10) }),
      schema: RECOMMENDATIONS_SCHEMA,
      schemaName: 'smart_recommendations',
      maxOutputTokens: 2500,
    }, live);

    const createdAt = new Date().toISOString();
    return normalizeRecommendations(raw, 8).map((r, i) => ({
      id: `rec_${Date.now()}_${i}`,
      contactId: contact.id,
      type: r.type,
      title: r.title,
      description: r.description,
      reasoning: r.reasoning,
      expectedOutcome: r.expectedOutcome ?? '',
      priority: r.priority ?? 0,
      urgency: r.urgency ?? 'future',
      effort: r.effort ?? 'medium',
      impact: r.impact ?? 'medium',
      confidence: r.confidence,
      basedOnPatterns: [],
      createdAt,
    }));
  }

  private contactSnapshot(contact: Contact): Record<string, unknown> {
    const c = contact as any;
    return {
      name: c.name, title: c.title, company: c.company, industry: c.industry, interestLevel: c.interestLevel,
      status: c.status, aiScore: c.aiScore, lastConnected: c.lastConnected, hasPhone: !!c.phone, hasEmail: !!c.email,
      notes: typeof c.notes === 'string' ? c.notes.slice(0, 1500) : undefined,
    };
  }

  // Pattern Learning and Adaptation
  recordUserFeedback(recommendationId: string, feedback: 'positive' | 'negative'): void {
    const current = this.userFeedback.get(recommendationId) || { positive: 0, negative: 0 };
    current[feedback]++;
    this.userFeedback.set(recommendationId, current);
    
    this.saveUserFeedback();
    this.adaptPatterns(recommendationId, feedback);
  }

  recordOutcome(
    contactId: string,
    action: string,
    outcome: 'success' | 'failure' | 'partial',
    context: Record<string, any>
  ): void {
    // Learn from outcomes to improve future recommendations
    const pattern: LearningPattern = {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patternType: outcome === 'success' ? 'success' : 'failure',
      conditions: {
        action,
        contactInterestLevel: context['interestLevel'],
        contactIndustry: context['industry'],
        dealStage: context['dealStage'],
        communicationHistory: context['communicationHistory']?.length || 0
      },
      outcomes: {
        result: outcome,
        responseTime: context['responseTime'],
        engagementIncrease: context['engagementIncrease']
      },
      frequency: 1,
      confidence: 70,
      applicableContactTypes: [context['industry'], context['interestLevel']],
    };

    this.learningPatterns.push(pattern);
    this.consolidatePatterns();
  }

  // Advanced Analytics
  async generatePredictiveInsights(
    contactId: string,
    contact: Contact,
    timeframe: '30d' | '90d' | '6m' = '90d',
    live?: LiveOptions
  ): Promise<NormalizedPredictive> {
    const raw = await aiJson<unknown>({
      role: 'thinking',
      effort: 'low',
      instructions:
        'You forecast the outcome for ONE sales contact from the supplied data only. Use null / empty lists whenever the data ' +
        'does not support a value. Never output default or "best practice" numbers; every probability and confidence must be an ' +
        'integer justified by the supplied data or null.',
      input: JSON.stringify({ contactId, timeframe, today: new Date().toISOString().slice(0, 10), contact: this.contactSnapshot(contact) }),
      schema: PREDICTIVE_SCHEMA,
      schemaName: 'predictive_insights',
      maxOutputTokens: 2500,
    }, live);
    return normalizePredictive(raw);
  }

  // Private Helper Methods
  private async gatherMultiSourceInsights(
    contactId: string,
    contact: Contact,
    existingInsights: ContactInsight[],
    live?: LiveOptions
  ): Promise<Array<{ source: string; insight: ContactInsight; weight: number; confidence: number }>> {
    const insights = [];
    
    // Include existing insights
    existingInsights.forEach(insight => {
      insights.push({
        source: 'contact_analysis',
        insight,
        weight: this.calculateInsightWeight(insight),
        confidence: insight.confidence
      });
    });
    
    // Generate communication insights
    try {
      const commStrategy = await communicationAI.generateCommunicationStrategy(contact, undefined, undefined, live);
      if (commStrategy && commStrategy.optimalChannels.length > 0) {
        insights.push({
          source: 'communication_analysis',
          insight: {
            id: `comm_${Date.now()}`,
            type: 'recommendation',
            title: 'Communication Strategy',
            description: `Optimal communication: ${commStrategy.optimalChannels[0]?.channel} on ${commStrategy.timing.bestDays.join(', ')}`,
            confidence: 85,
            impact: 'medium',
            category: 'Communication',
            actionable: true,
            dataPoints: ['timing', 'channels', 'response_patterns']
          },
          weight: 0.8,
          confidence: 85
        });
      }
    } catch (error) {
      logger.warn('Failed to get communication insights', error);
    }
    
    return insights;
  }

  private analyzeInsightCorrelations(
    contactId: string,
    insights: Array<{ source: string; insight: ContactInsight; weight: number; confidence: number }>,
    communicationHistory: any[]
  ): any {
    // Analyze how insights relate to each other
    const correlations = {
      strongSignals: insights.filter(i => i.confidence > 80 && i.weight > 0.7),
      communicationPatterns: this.analyzeCommunicationPatterns(communicationHistory),
      behavioralIndicators: insights.filter(i => i.insight.type === 'prediction'),
      actionableItems: insights.filter(i => i.insight.actionable)
    };
    
    return correlations;
  }

  private generateMetaInsight(correlation: any, contact: Contact): IntelligenceCorrelation['metaInsight'] {
    const strongSignals = correlation.strongSignals;
    const actionableItems = correlation.actionableItems;
    
    // Generate high-level insight
    let title = 'Contact Intelligence Summary';
    let description = `Based on analysis of ${contact.name}`;
    let actionPriority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
    let suggestedActions: string[] = [];
    let predictedOutcome = 'Positive engagement expected';
    let confidence = 75;
    
    if (strongSignals.length >= 3) {
      title = 'High Opportunity Contact';
      description = `${contact.name} shows strong engagement signals across multiple touchpoints. High conversion potential identified.`;
      actionPriority = 'high';
      suggestedActions = [
        'Schedule immediate follow-up call',
        'Send personalized proposal',
        'Connect decision makers',
        'Share relevant case studies'
      ];
      predictedOutcome = 'High probability of conversion within 30 days';
      confidence = 90;
    } else if (strongSignals.length >= 1) {
      title = 'Qualified Opportunity';
      description = `${contact.name} demonstrates positive signals but may require nurturing approach.`;
      actionPriority = 'medium';
      suggestedActions = [
        'Continue regular engagement',
        'Provide valuable content',
        'Schedule discovery call',
        'Monitor engagement patterns'
      ];
      predictedOutcome = 'Moderate conversion potential with proper nurturing';
      confidence = 75;
    } else {
      title = 'Requires Re-qualification';
      description = `${contact.name} shows limited engagement. Consider re-qualification or nurturing strategy.`;
      actionPriority = 'low';
      suggestedActions = [
        'Send re-engagement content',
        'Try different communication channel',
        'Reduce contact frequency',
        'Add to nurturing campaign'
      ];
      predictedOutcome = 'Low immediate conversion probability';
      confidence = 60;
    }
    
    return {
      title,
      description,
      actionPriority,
      suggestedActions,
      predictedOutcome,
      confidence
    };
  }

  private determineCorrelationType(metaInsight: IntelligenceCorrelation['metaInsight']): IntelligenceCorrelation['correlationType'] {
    if (metaInsight.actionPriority === 'urgent') return 'risk';
    if (metaInsight.confidence > 85) return 'predictive';
    if (metaInsight.suggestedActions.length > 3) return 'strategic';
    return 'behavioral';
  }

  private findApplicablePatterns(contact: Contact, context?: any): LearningPattern[] {
    return this.learningPatterns.filter(pattern => {
      return pattern.applicableContactTypes.some(type => 
        type === contact.industry || 
        type === contact.interestLevel ||
        type === contact.status
      );
    }).sort((a, b) => b.confidence - a.confidence);
  }

  private calculateInsightWeight(insight: ContactInsight): number {
    let weight = 0.5; // Base weight
    
    // Adjust based on impact
    if (insight.impact === 'high') weight += 0.3;
    else if (insight.impact === 'medium') weight += 0.2;
    
    // Adjust based on actionability
    if (insight.actionable) weight += 0.2;
    
    // Adjust based on confidence
    weight += (insight.confidence / 100) * 0.3;
    
    return Math.min(1.0, weight);
  }

  private analyzeCommunicationPatterns(history: any[]): any {
    // Analyze communication patterns from history
    return {
      frequency: history.length,
      responseRate: 0.8, // Mock data
      preferredChannel: 'email',
      bestResponseTimes: ['Tuesday 2PM', 'Thursday 3PM']
    };
  }

  private initializeLearningPatterns(): void {
    // Initialize with some base patterns
    this.learningPatterns = [
      {
        id: 'pattern_tech_followup',
        patternType: 'success',
        conditions: { contactIndustry: 'Technology', action: 'technical_demo' },
        outcomes: { result: 'success', responseTime: '48h' },
        frequency: 15,
        confidence: 85,
        applicableContactTypes: ['Technology', 'hot', 'medium']
      },
      {
        id: 'pattern_exec_timing',
        patternType: 'success',
        conditions: { contactTitle: 'CEO', action: 'brief_call' },
        outcomes: { result: 'success', responseTime: '24h' },
        frequency: 8,
        confidence: 90,
        applicableContactTypes: ['Executive', 'Decision Maker']
      }
    ];
  }

  private loadUserFeedback(): void {
    try {
      const stored = localStorage.getItem('ai_user_feedback');
      if (stored) {
        const feedbackData = JSON.parse(stored);
        this.userFeedback = new Map(Object.entries(feedbackData));
      }
    } catch (error) {
      logger.warn('Failed to load user feedback', error);
    }
  }

  private saveUserFeedback(): void {
    try {
      const feedbackObj = Object.fromEntries(this.userFeedback);
      localStorage.setItem('ai_user_feedback', JSON.stringify(feedbackObj));
    } catch (error) {
      logger.warn('Failed to save user feedback', error);
    }
  }

  private adaptPatterns(recommendationId: string, feedback: 'positive' | 'negative'): void {
    // Adapt patterns based on user feedback
    // This would adjust pattern weights and confidence scores
    logger.info('Adapting patterns based on feedback', { recommendationId, feedback });
  }

  private consolidatePatterns(): void {
    // Consolidate similar patterns to prevent duplicate learning
    const patternMap = new Map<string, LearningPattern>();
    
    this.learningPatterns.forEach(pattern => {
      const key = `${pattern.patternType}_${JSON.stringify(pattern.conditions)}`;
      const existing = patternMap.get(key);
      
      if (existing) {
        existing.frequency += pattern.frequency;
        existing.confidence = (existing.confidence + pattern.confidence) / 2;
      } else {
        patternMap.set(key, { ...pattern });
      }
    });
    
    this.learningPatterns = Array.from(patternMap.values());
  }

  // Public API
  getIntelligenceForContact(contactId: string): IntelligenceCorrelation[] {
    return this.correlations.get(contactId) || [];
  }

  getApplicablePatternsForContact(contact: Contact): LearningPattern[] {
    return this.findApplicablePatterns(contact);
  }

  getPerformanceMetrics(): {
    totalCorrelations: number;
    totalPatterns: number;
    avgConfidence: number;
    userSatisfaction: number;
  } {
    const totalCorrelations = Array.from(this.correlations.values()).reduce((sum, arr) => sum + arr.length, 0);
    const totalPatterns = this.learningPatterns.length;
    
    const allCorrelations = Array.from(this.correlations.values()).flat();
    const avgConfidence = allCorrelations.length > 0 
      ? allCorrelations.reduce((sum, c) => sum + c.metaInsight.confidence, 0) / allCorrelations.length 
      : 0;
    
    const feedbackEntries = Array.from(this.userFeedback.values());
    const userSatisfaction = feedbackEntries.length > 0
      ? feedbackEntries.reduce((sum, f) => sum + (f.positive / (f.positive + f.negative)), 0) / feedbackEntries.length
      : 0;
    
    return {
      totalCorrelations,
      totalPatterns,
      avgConfidence,
      userSatisfaction
    };
  }
}

export const aiIntelligenceEngine = new AIIntelligenceEngine();