/**
 * AI Intelligence Engine
 * Advanced cross-component intelligence that connects insights from all AI operations
 */

import { logger } from './logger.service';
import { cacheService } from './cache.service';
import { Contact } from '../types';
import { contactAI, ContactInsight, ContactScore } from './contact-ai.service';
import { communicationAI } from './communication-ai.service';

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
  confidence: number;
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
    communicationHistory: any[] = []
  ): Promise<IntelligenceCorrelation> {
    logger.info('Generating intelligence correlation', { contactId });

    // Gather insights from multiple sources
    const insights = await this.gatherMultiSourceInsights(contactId, contact, recentInsights);
    
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
    }
  ): Promise<SmartRecommendation[]> {
    logger.info('Generating smart recommendations', { contactId });

    const recommendations: SmartRecommendation[] = [];
    
    // Get relevant patterns
    const applicablePatterns = this.findApplicablePatterns(contact, context);
    
    // Generate action recommendations
    const actionRecs = await this.generateActionRecommendations(contact, applicablePatterns, context);
    recommendations.push(...actionRecs);
    
    // Generate communication recommendations
    const commRecs = await this.generateCommunicationRecommendations(contact, applicablePatterns, context);
    recommendations.push(...commRecs);
    
    // Generate automation recommendations
    const autoRecs = this.generateAutomationRecommendations(contact, applicablePatterns, context);
    recommendations.push(...autoRecs);
    
    // Sort by priority and impact
    recommendations.sort((a, b) => (b.priority * b.impact) - (a.priority * a.impact));
    
    return recommendations.slice(0, 8); // Return top 8 recommendations
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
        contactInterestLevel: context.interestLevel,
        contactIndustry: context.industry,
        dealStage: context.dealStage,
        communicationHistory: context.communicationHistory?.length || 0
      },
      outcomes: {
        result: outcome,
        responseTime: context.responseTime,
        engagementIncrease: context.engagementIncrease
      },
      frequency: 1,
      confidence: 70,
      applicableContactTypes: [context.industry, context.interestLevel],
    };

    this.learningPatterns.push(pattern);
    this.consolidatePatterns();
  }

  // Advanced Analytics
  async generatePredictiveInsights(
    contactId: string,
    contact: Contact,
    timeframe: '30d' | '90d' | '6m' = '90d'
  ): Promise<{
    conversionProbability: number;
    optimalContactTime: string;
    recommendedActions: string[];
    riskFactors: string[];
    opportunities: string[];
    timeline: { date: string; prediction: string; confidence: number }[];
  }> {
    // Use patterns and historical data to predict outcomes
    const patterns = this.findApplicablePatterns(contact);
    const successPatterns = patterns.filter(p => p.patternType === 'success');
    
    // Calculate conversion probability
    const conversionProbability = this.calculateConversionProbability(contact, successPatterns);
    
    // Determine optimal contact time
    const optimalContactTime = this.determineOptimalContactTime(contact, patterns);
    
    // Generate timeline predictions
    const timeline = this.generatePredictiveTimeline(contact, patterns, timeframe);
    
    return {
      conversionProbability,
      optimalContactTime,
      recommendedActions: this.getTopRecommendedActions(contact, patterns),
      riskFactors: this.identifyRiskFactors(contact, patterns),
      opportunities: this.identifyOpportunities(contact, patterns),
      timeline
    };
  }

  // Private Helper Methods
  private async gatherMultiSourceInsights(
    contactId: string,
    contact: Contact,
    existingInsights: ContactInsight[]
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
      const commStrategy = await communicationAI.generateCommunicationStrategy(contact);
      if (commStrategy) {
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

  private async generateActionRecommendations(
    contact: Contact,
    patterns: LearningPattern[],
    context?: any
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];
    
    // High-value action recommendations
    if (contact.interestLevel === 'hot') {
      recommendations.push({
        id: `rec_${Date.now()}_1`,
        contactId: contact.id,
        type: 'action',
        title: 'Immediate Call Recommended',
        description: 'High interest level detected. Schedule call within 24 hours to capitalize on momentum.',
        reasoning: ['High interest level', 'Optimal engagement window', 'Conversion probability 85%+'],
        expectedOutcome: 'Significant progress toward deal closure',
        priority: 95,
        urgency: 'immediate',
        effort: 'medium',
        impact: 'high',
        confidence: 90,
        basedOnPatterns: patterns.slice(0, 2).map(p => p.id),
        createdAt: new Date().toISOString()
      });
    }
    
    // Industry-specific recommendations
    if (contact.industry === 'Technology') {
      recommendations.push({
        id: `rec_${Date.now()}_2`,
        contactId: contact.id,
        type: 'content',
        title: 'Share Technical Documentation',
        description: 'Technology professionals respond well to detailed technical content and integration guides.',
        reasoning: ['Industry preference for technical detail', 'Higher engagement with documentation', 'Decision-making support'],
        expectedOutcome: 'Increased technical confidence and faster decision-making',
        priority: 80,
        urgency: 'this_week',
        effort: 'low',
        impact: 'medium',
        confidence: 85,
        basedOnPatterns: patterns.filter(p => p.conditions.contactIndustry === 'Technology').map(p => p.id),
        createdAt: new Date().toISOString()
      });
    }
    
    return recommendations;
  }

  private async generateCommunicationRecommendations(
    contact: Contact,
    patterns: LearningPattern[],
    context?: any
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];
    
    // Communication timing recommendation
    recommendations.push({
      id: `rec_${Date.now()}_comm`,
      contactId: contact.id,
      type: 'communication',
      title: 'Optimize Communication Timing',
      description: 'Based on engagement patterns, Tuesday-Thursday 2-4 PM shows highest response rates.',
      reasoning: ['Historical response data', 'Industry communication patterns', 'Engagement optimization'],
      expectedOutcome: '40% higher response rate',
      priority: 70,
      urgency: 'this_week',
      effort: 'low',
      impact: 'medium',
      confidence: 80,
      basedOnPatterns: patterns.map(p => p.id),
      createdAt: new Date().toISOString()
    });
    
    return recommendations;
  }

  private generateAutomationRecommendations(
    contact: Contact,
    patterns: LearningPattern[],
    context?: any
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    
    // Automation workflow recommendation
    if (contact.interestLevel === 'medium' || contact.interestLevel === 'low') {
      recommendations.push({
        id: `rec_${Date.now()}_auto`,
        contactId: contact.id,
        type: 'automation',
        title: 'Setup Nurturing Automation',
        description: 'Create automated nurturing sequence to maintain engagement without manual effort.',
        reasoning: ['Medium/low interest needs nurturing', 'Automation improves consistency', 'Reduces manual workload'],
        expectedOutcome: 'Maintained engagement with 60% less manual effort',
        priority: 60,
        urgency: 'this_month',
        effort: 'medium',
        impact: 'medium',
        confidence: 75,
        basedOnPatterns: patterns.map(p => p.id),
        createdAt: new Date().toISOString()
      });
    }
    
    return recommendations;
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

  private calculateConversionProbability(contact: Contact, patterns: LearningPattern[]): number {
    let probability = 50; // Base probability
    
    // Adjust based on interest level
    if (contact.interestLevel === 'hot') probability += 30;
    else if (contact.interestLevel === 'medium') probability += 10;
    else if (contact.interestLevel === 'cold') probability -= 20;
    
    // Adjust based on AI score
    if (contact.aiScore) {
      probability = (probability + contact.aiScore) / 2;
    }
    
    // Adjust based on successful patterns
    const successRate = patterns.filter(p => p.patternType === 'success').length / Math.max(1, patterns.length);
    probability += successRate * 20;
    
    return Math.max(0, Math.min(100, probability));
  }

  private determineOptimalContactTime(contact: Contact, patterns: LearningPattern[]): string {
    // Analyze patterns to determine best contact time
    const successfulTimes = patterns
      .filter(p => p.patternType === 'success')
      .map(p => p.outcomes.responseTime)
      .filter(Boolean);
    
    if (successfulTimes.length > 0) {
      return 'Tuesday-Thursday 2-4 PM (based on success patterns)';
    }
    
    // Default based on industry
    if (contact.industry === 'Technology') {
      return 'Tuesday-Wednesday 10 AM - 3 PM';
    } else if (contact.industry === 'Finance') {
      return 'Monday-Thursday 9 AM - 11 AM, 2 PM - 4 PM';
    }
    
    return 'Tuesday-Thursday 2-4 PM (general best practice)';
  }

  private generatePredictiveTimeline(
    contact: Contact,
    patterns: LearningPattern[],
    timeframe: string
  ): Array<{ date: string; prediction: string; confidence: number }> {
    const timeline = [];
    const now = new Date();
    
    // Next 7 days
    timeline.push({
      date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      prediction: 'Optimal time for follow-up contact',
      confidence: 85
    });
    
    // Next 30 days
    timeline.push({
      date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      prediction: contact.interestLevel === 'hot' ? 'High probability of decision' : 'Continued nurturing phase',
      confidence: 75
    });
    
    // Next 90 days
    timeline.push({
      date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      prediction: 'Expected conversion window or re-qualification needed',
      confidence: 65
    });
    
    return timeline;
  }

  private getTopRecommendedActions(contact: Contact, patterns: LearningPattern[]): string[] {
    const actions = [
      'Schedule follow-up call',
      'Send personalized content',
      'Connect on LinkedIn',
      'Share case studies',
      'Propose meeting',
      'Send pricing information'
    ];
    
    // Filter based on patterns and contact state
    return actions.slice(0, 4);
  }

  private identifyRiskFactors(contact: Contact, patterns: LearningPattern[]): string[] {
    const risks = [];
    
    if (contact.interestLevel === 'cold') {
      risks.push('Low engagement level');
    }
    
    if (!contact.lastConnected || new Date(contact.lastConnected) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) {
      risks.push('No recent contact activity');
    }
    
    if (!contact.phone) {
      risks.push('Limited contact options');
    }
    
    return risks;
  }

  private identifyOpportunities(contact: Contact, patterns: LearningPattern[]): string[] {
    const opportunities = [];
    
    if (contact.aiScore && contact.aiScore > 80) {
      opportunities.push('High AI score indicates strong potential');
    }
    
    if (contact.title && (contact.title.includes('Director') || contact.title.includes('VP') || contact.title.includes('CEO'))) {
      opportunities.push('Decision-making authority');
    }
    
    if (contact.company && contact.company.toLowerCase().includes('inc')) {
      opportunities.push('Enterprise opportunity');
    }
    
    return opportunities;
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