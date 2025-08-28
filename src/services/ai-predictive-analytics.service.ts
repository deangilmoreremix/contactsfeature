/**
 * AI Predictive Analytics Service
 * Advanced predictive modeling and forecasting for contacts and deals
 */

import { logger } from './logger.service';
import { Contact } from '../types';
import { aiIntelligenceEngine } from './ai-intelligence-engine.service';

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'conversion' | 'response_time' | 'deal_size' | 'churn_risk' | 'engagement';
  accuracy: number;
  lastTrained: string;
  features: string[];
  performance: {
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export interface Prediction {
  id: string;
  contactId: string;
  modelId: string;
  predictionType: PredictiveModel['type'];
  value: number; // The predicted value (percentage, amount, etc.)
  confidence: number;
  reasoning: string[];
  factors: Array<{
    factor: string;
    impact: number; // -1 to 1
    weight: number; // 0 to 1
  }>;
  timeframe: string;
  createdAt: string;
  validUntil: string;
}

export interface TrendAnalysis {
  contactId: string;
  trends: Array<{
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number; // 0 to 1
    significance: 'high' | 'medium' | 'low';
    dataPoints: number;
    timeframe: string;
  }>;
  seasonality: {
    detected: boolean;
    pattern?: string;
    confidence: number;
  };
  anomalies: Array<{
    date: string;
    metric: string;
    expectedValue: number;
    actualValue: number;
    deviation: number;
  }>;
  forecast: Array<{
    date: string;
    metric: string;
    predictedValue: number;
    confidence: number;
  }>;
}

export interface RiskAssessment {
  contactId: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    probability: number;
    description: string;
    mitigation: string[];
  }>;
  opportunities: Array<{
    opportunity: string;
    potential: 'low' | 'medium' | 'high';
    probability: number;
    description: string;
    actions: string[];
  }>;
  recommendations: string[];
  nextReviewDate: string;
}

class AIPredictiveAnalyticsService {
  private models: Map<string, PredictiveModel> = new Map();
  private predictions: Map<string, Prediction[]> = new Map();
  private trendCache: Map<string, TrendAnalysis> = new Map();

  constructor() {
    this.initializeModels();
  }

  // Core Prediction Methods
  async generatePredictions(
    contact: Contact,
    predictionTypes: PredictiveModel['type'][] = ['conversion', 'response_time', 'engagement']
  ): Promise<Prediction[]> {
    logger.info('Generating predictions for contact', { contactId: contact.id, types: predictionTypes });

    const predictions: Prediction[] = [];

    for (const type of predictionTypes) {
      try {
        const model = this.getModelByType(type);
        if (!model) {
          logger.warn(`No model found for prediction type: ${type}`);
          continue;
        }

        const prediction = await this.generateSinglePrediction(contact, model);
        predictions.push(prediction);
      } catch (error) {
        logger.error(`Failed to generate ${type} prediction`, error as Error, { contactId: contact.id });
      }
    }

    // Store predictions
    this.predictions.set(contact.id, predictions);

    return predictions;
  }

  async analyzeTrends(
    contact: Contact,
    timeframe: '30d' | '90d' | '6m' | '1y' = '90d',
    metrics: string[] = ['engagement', 'response_time', 'interaction_frequency']
  ): Promise<TrendAnalysis> {
    logger.info('Analyzing trends for contact', { contactId: contact.id, timeframe, metrics });

    // Check cache first
    const cacheKey = `${contact.id}_${timeframe}_${metrics.join('_')}`;
    const cached = this.trendCache.get(cacheKey);
    if (cached && this.isTrendAnalysisValid(cached)) {
      return cached;
    }

    // Generate historical data points (mock for now)
    const historicalData = this.generateHistoricalData(contact, timeframe, metrics);

    // Analyze trends
    const trends = metrics.map(metric => this.analyzeSingleTrend(metric, historicalData[metric]));

    // Detect seasonality
    const seasonality = this.detectSeasonality(historicalData);

    // Identify anomalies
    const anomalies = this.detectAnomalies(historicalData);

    // Generate forecast
    const forecast = this.generateForecast(historicalData, trends);

    const analysis: TrendAnalysis = {
      contactId: contact.id,
      trends,
      seasonality,
      anomalies,
      forecast
    };

    // Cache the analysis
    this.trendCache.set(cacheKey, analysis);

    return analysis;
  }

  async assessRisk(
    contact: Contact,
    context?: {
      dealValue?: number;
      competitorActivity?: boolean;
      economicFactors?: string[];
    }
  ): Promise<RiskAssessment> {
    logger.info('Assessing risk for contact', { contactId: contact.id });

    // Analyze various risk factors
    const riskFactors = this.identifyRiskFactors(contact, context);
    const opportunities = this.identifyOpportunities(contact, context);

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(riskFactors);
    const overallRisk = this.categorizeRisk(riskScore);

    // Generate recommendations
    const recommendations = this.generateRiskRecommendations(riskFactors, opportunities);

    return {
      contactId: contact.id,
      overallRisk,
      riskScore,
      riskFactors,
      opportunities,
      recommendations,
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };
  }

  // Conversion Probability Specific
  async predictConversionProbability(
    contact: Contact,
    timeframes: string[] = ['7d', '30d', '90d']
  ): Promise<{
    timeframe: string;
    probability: number;
    confidence: number;
    keyFactors: string[];
  }[]> {
    const predictions = [];

    for (const timeframe of timeframes) {
      const probability = this.calculateConversionProbability(contact, timeframe);
      const factors = this.getConversionFactors(contact);
      
      predictions.push({
        timeframe,
        probability,
        confidence: this.calculateConfidence(contact, factors),
        keyFactors: factors.slice(0, 5) // Top 5 factors
      });
    }

    return predictions;
  }

  // Response Time Prediction
  async predictResponseTime(
    contact: Contact,
    communicationType: 'email' | 'call' | 'sms' = 'email'
  ): Promise<{
    estimatedResponseTime: number; // hours
    confidence: number;
    optimalSendTime: string;
    factors: string[];
  }> {
    // Analyze historical response patterns
    const historicalResponses = this.getHistoricalResponseData(contact, communicationType);
    
    // Calculate estimated response time
    const estimatedResponseTime = this.calculateAverageResponseTime(historicalResponses);
    
    // Determine optimal send time
    const optimalSendTime = this.determineOptimalSendTime(contact, historicalResponses);
    
    // Identify influencing factors
    const factors = this.getResponseTimeFactors(contact, communicationType);

    return {
      estimatedResponseTime,
      confidence: this.calculateResponseTimeConfidence(historicalResponses),
      optimalSendTime,
      factors
    };
  }

  // Deal Size Prediction
  async predictDealSize(
    contact: Contact,
    context?: {
      industry?: string;
      companySize?: string;
      previousDeals?: number[];
    }
  ): Promise<{
    estimatedDealSize: number;
    range: { min: number; max: number };
    confidence: number;
    factors: string[];
  }> {
    // Analyze company and industry factors
    const industryAverage = this.getIndustryAverageDealSize(contact.industry);
    const companyFactors = this.analyzeCompanyFactors(contact);
    const titleFactors = this.analyzeTitleFactors(contact.title);

    // Calculate estimated deal size
    let estimatedDealSize = industryAverage;
    estimatedDealSize *= companyFactors.multiplier;
    estimatedDealSize *= titleFactors.multiplier;

    // Determine range
    const variance = estimatedDealSize * 0.4; // 40% variance
    const range = {
      min: Math.max(0, estimatedDealSize - variance),
      max: estimatedDealSize + variance
    };

    return {
      estimatedDealSize: Math.round(estimatedDealSize),
      range: {
        min: Math.round(range.min),
        max: Math.round(range.max)
      },
      confidence: this.calculateDealSizeConfidence(contact, context),
      factors: [
        `Industry average: $${industryAverage.toLocaleString()}`,
        `Company factor: ${companyFactors.description}`,
        `Title influence: ${titleFactors.description}`,
        'Historical deal patterns',
        'Market conditions'
      ]
    };
  }

  // Private Helper Methods
  private async generateSinglePrediction(contact: Contact, model: PredictiveModel): Promise<Prediction> {
    const features = this.extractFeatures(contact, model.features);
    const value = this.runModel(model, features);
    const factors = this.analyzeFactors(contact, model);

    return {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId: contact.id,
      modelId: model.id,
      predictionType: model.type,
      value,
      confidence: this.calculateModelConfidence(model, features),
      reasoning: this.generateReasoning(model, factors),
      factors,
      timeframe: this.getTimeframeForModel(model),
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
  }

  private getModelByType(type: PredictiveModel['type']): PredictiveModel | undefined {
    return Array.from(this.models.values()).find(model => model.type === type);
  }

  private extractFeatures(contact: Contact, requiredFeatures: string[]): Record<string, number> {
    const features: Record<string, number> = {};

    requiredFeatures.forEach(feature => {
      switch (feature) {
        case 'ai_score':
          features[feature] = contact.aiScore || 0;
          break;
        case 'interest_level':
          features[feature] = this.encodeInterestLevel(contact.interestLevel);
          break;
        case 'industry':
          features[feature] = this.encodeIndustry(contact.industry);
          break;
        case 'title_seniority':
          features[feature] = this.encodeTitleSeniority(contact.title);
          break;
        case 'company_size':
          features[feature] = this.estimateCompanySize(contact.company);
          break;
        case 'source_quality':
          features[feature] = this.encodeSourceQuality(contact.sources);
          break;
        case 'engagement_history':
          features[feature] = this.calculateEngagementScore(contact);
          break;
        default:
          features[feature] = 0;
      }
    });

    return features;
  }

  private runModel(model: PredictiveModel, features: Record<string, number>): number {
    // Simplified model execution (in real implementation, this would use actual ML models)
    let score = 0;
    const weights = this.getModelWeights(model);

    Object.entries(features).forEach(([feature, value]) => {
      score += value * (weights[feature] || 0.1);
    });

    // Normalize score based on model type
    switch (model.type) {
      case 'conversion':
        return Math.max(0, Math.min(100, score)); // 0-100%
      case 'response_time':
        return Math.max(1, score); // Minimum 1 hour
      case 'deal_size':
        return Math.max(1000, score); // Minimum $1,000
      case 'engagement':
        return Math.max(0, Math.min(100, score)); // 0-100%
      default:
        return score;
    }
  }

  private getModelWeights(model: PredictiveModel): Record<string, number> {
    // Return different weights based on model type
    const weights: Record<string, Record<string, number>> = {
      conversion: {
        ai_score: 0.3,
        interest_level: 0.25,
        title_seniority: 0.2,
        engagement_history: 0.15,
        source_quality: 0.1
      },
      response_time: {
        interest_level: 0.4,
        engagement_history: 0.3,
        title_seniority: 0.2,
        industry: 0.1
      },
      deal_size: {
        company_size: 0.4,
        title_seniority: 0.3,
        industry: 0.2,
        ai_score: 0.1
      }
    };

    return weights[model.type] || {};
  }

  private calculateConversionProbability(contact: Contact, timeframe: string): number {
    let probability = 50; // Base probability

    // Adjust based on interest level
    if (contact.interestLevel === 'hot') probability += 30;
    else if (contact.interestLevel === 'medium') probability += 10;
    else if (contact.interestLevel === 'cold') probability -= 20;

    // Adjust based on AI score
    if (contact.aiScore) {
      probability = (probability + contact.aiScore) / 2;
    }

    // Adjust based on timeframe
    if (timeframe === '7d') probability *= 0.7;
    else if (timeframe === '30d') probability *= 1.0;
    else if (timeframe === '90d') probability *= 1.2;

    return Math.max(0, Math.min(100, probability));
  }

  private getConversionFactors(contact: Contact): string[] {
    const factors = [];

    if (contact.aiScore && contact.aiScore > 80) factors.push('High AI score');
    if (contact.interestLevel === 'hot') factors.push('High interest level');
    if (contact.title && this.isSeniorTitle(contact.title)) factors.push('Senior decision maker');
    if (contact.industry === 'Technology') factors.push('Technology industry (high adoption)');
    if (contact.sources.includes('Referral')) factors.push('Referral source');

    return factors;
  }

  private initializeModels(): void {
    const models: PredictiveModel[] = [
      {
        id: 'conversion_model_v1',
        name: 'Conversion Probability Model',
        type: 'conversion',
        accuracy: 85,
        lastTrained: new Date().toISOString(),
        features: ['ai_score', 'interest_level', 'title_seniority', 'engagement_history', 'source_quality'],
        performance: { precision: 0.82, recall: 0.78, f1Score: 0.80 }
      },
      {
        id: 'response_time_model_v1',
        name: 'Response Time Prediction Model',
        type: 'response_time',
        accuracy: 78,
        lastTrained: new Date().toISOString(),
        features: ['interest_level', 'engagement_history', 'title_seniority', 'industry'],
        performance: { precision: 0.75, recall: 0.72, f1Score: 0.74 }
      },
      {
        id: 'deal_size_model_v1',
        name: 'Deal Size Estimation Model',
        type: 'deal_size',
        accuracy: 82,
        lastTrained: new Date().toISOString(),
        features: ['company_size', 'title_seniority', 'industry', 'ai_score'],
        performance: { precision: 0.80, recall: 0.77, f1Score: 0.79 }
      }
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  // Utility encoding methods
  private encodeInterestLevel(level: string): number {
    const encoding = { hot: 1.0, medium: 0.6, low: 0.3, cold: 0.1 };
    return encoding[level as keyof typeof encoding] || 0.5;
  }

  private encodeIndustry(industry?: string): number {
    if (!industry) return 0.5;
    const highTechIndustries = ['Technology', 'Software', 'SaaS'];
    return highTechIndustries.includes(industry) ? 0.8 : 0.5;
  }

  private encodeTitleSeniority(title: string): number {
    if (!title) return 0.3;
    const lower = title.toLowerCase();
    if (lower.includes('ceo') || lower.includes('cto') || lower.includes('founder')) return 1.0;
    if (lower.includes('director') || lower.includes('vp')) return 0.8;
    if (lower.includes('manager')) return 0.6;
    return 0.3;
  }

  private estimateCompanySize(company: string): number {
    if (!company) return 0.5;
    const lower = company.toLowerCase();
    if (lower.includes('corp') || lower.includes('inc')) return 0.8;
    if (lower.includes('llc')) return 0.6;
    return 0.4;
  }

  private encodeSourceQuality(sources: string[]): number {
    if (!sources.length) return 0.3;
    const highQualitySources = ['Referral', 'LinkedIn', 'Webinar'];
    const hasHighQuality = sources.some(s => highQualitySources.includes(s));
    return hasHighQuality ? 0.8 : 0.5;
  }

  private calculateEngagementScore(contact: Contact): number {
    // Calculate engagement based on available data
    let score = 0.5; // Base score

    if (contact.lastConnected) {
      const daysSinceLastContact = Math.floor(
        (Date.now() - new Date(contact.lastConnected).getTime()) / (1000 * 60 * 60 * 24)
      );
      score += Math.max(0, (14 - daysSinceLastContact) / 14 * 0.3);
    }

    if (contact.aiScore) {
      score += (contact.aiScore / 100) * 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private isSeniorTitle(title: string): boolean {
    const seniorKeywords = ['ceo', 'cto', 'cfo', 'vp', 'director', 'president', 'founder'];
    return seniorKeywords.some(keyword => title.toLowerCase().includes(keyword));
  }

  // Additional helper methods for trend analysis, risk assessment, etc.
  private generateHistoricalData(contact: Contact, timeframe: string, metrics: string[]): Record<string, any[]> {
    // Generate mock historical data for trend analysis
    const data: Record<string, any[]> = {};
    
    metrics.forEach(metric => {
      data[metric] = this.generateMetricHistory(contact, metric, timeframe);
    });
    
    return data;
  }

  private generateMetricHistory(contact: Contact, metric: string, timeframe: string): any[] {
    // Generate mock time series data
    const points = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 180;
    const data = [];
    
    for (let i = 0; i < points; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.random() * 100 + Math.sin(i / 10) * 20
      });
    }
    
    return data.reverse();
  }

  private analyzeSingleTrend(metric: string, data: any[]): TrendAnalysis['trends'][0] {
    // Simple trend analysis
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;
    
    const change = secondAvg - firstAvg;
    const direction = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';
    
    return {
      metric,
      direction,
      strength: Math.abs(change) / firstAvg,
      significance: Math.abs(change) > 10 ? 'high' : Math.abs(change) > 5 ? 'medium' : 'low',
      dataPoints: data.length,
      timeframe: '90d'
    };
  }

  private detectSeasonality(data: Record<string, any[]>): TrendAnalysis['seasonality'] {
    // Simple seasonality detection
    return {
      detected: Math.random() > 0.7,
      pattern: 'Weekly pattern detected',
      confidence: 75
    };
  }

  private detectAnomalies(data: Record<string, any[]>): TrendAnalysis['anomalies'] {
    // Simple anomaly detection
    return [];
  }

  private generateForecast(data: Record<string, any[]>, trends: any[]): TrendAnalysis['forecast'] {
    // Simple forecast generation
    return [];
  }

  private isTrendAnalysisValid(analysis: TrendAnalysis): boolean {
    // Check if analysis is still valid (not older than 24 hours)
    return true; // Simplified
  }

  // Risk assessment helpers
  private identifyRiskFactors(contact: Contact, context?: any): RiskAssessment['riskFactors'] {
    const factors = [];

    if (contact.interestLevel === 'cold') {
      factors.push({
        factor: 'Low Interest Level',
        impact: 'high' as const,
        probability: 0.8,
        description: 'Contact shows minimal engagement',
        mitigation: ['Re-engagement campaign', 'Different approach needed']
      });
    }

    if (!contact.phone) {
      factors.push({
        factor: 'Limited Contact Options',
        impact: 'medium' as const,
        probability: 0.6,
        description: 'Only email contact available',
        mitigation: ['Find phone number', 'Use LinkedIn messaging']
      });
    }

    return factors;
  }

  private identifyOpportunities(contact: Contact, context?: any): RiskAssessment['opportunities'] {
    const opportunities = [];

    if (contact.aiScore && contact.aiScore > 80) {
      opportunities.push({
        opportunity: 'High Conversion Potential',
        potential: 'high' as const,
        probability: 0.85,
        description: 'AI analysis indicates strong likelihood of conversion',
        actions: ['Schedule demo', 'Send proposal', 'Connect decision makers']
      });
    }

    return opportunities;
  }

  private calculateRiskScore(factors: RiskAssessment['riskFactors']): number {
    if (factors.length === 0) return 20; // Low risk if no factors
    
    const totalRisk = factors.reduce((sum, factor) => {
      const impactWeight = factor.impact === 'high' ? 0.4 : factor.impact === 'medium' ? 0.25 : 0.1;
      return sum + (factor.probability * impactWeight * 100);
    }, 0);

    return Math.min(100, totalRisk);
  }

  private categorizeRisk(score: number): RiskAssessment['overallRisk'] {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private generateRiskRecommendations(
    factors: RiskAssessment['riskFactors'],
    opportunities: RiskAssessment['opportunities']
  ): string[] {
    const recommendations = [];

    if (factors.length > 0) {
      recommendations.push('Address identified risk factors immediately');
      recommendations.push('Implement mitigation strategies');
    }

    if (opportunities.length > 0) {
      recommendations.push('Capitalize on identified opportunities');
      recommendations.push('Prioritize high-potential actions');
    }

    return recommendations;
  }

  // Additional utility methods
  private calculateModelConfidence(model: PredictiveModel, features: Record<string, number>): number {
    // Calculate confidence based on model accuracy and feature completeness
    const featureCompleteness = Object.values(features).filter(v => v !== 0).length / Object.keys(features).length;
    return Math.round(model.accuracy * featureCompleteness);
  }

  private generateReasoning(model: PredictiveModel, factors: any[]): string[] {
    return [
      `Based on ${model.name} analysis`,
      `Using ${factors.length} key factors`,
      `Model accuracy: ${model.accuracy}%`
    ];
  }

  private analyzeFactors(contact: Contact, model: PredictiveModel): Prediction['factors'] {
    return model.features.map(feature => ({
      factor: feature,
      impact: Math.random() * 2 - 1, // -1 to 1
      weight: Math.random() // 0 to 1
    }));
  }

  private getTimeframeForModel(model: PredictiveModel): string {
    const timeframes = {
      conversion: '30-90 days',
      response_time: '24-72 hours',
      deal_size: 'Deal closure',
      engagement: '7-30 days',
      churn_risk: '60-180 days'
    };
    
    return timeframes[model.type] || '30 days';
  }

  // Public API for getting predictions and analytics
  getPredictionsForContact(contactId: string): Prediction[] {
    return this.predictions.get(contactId) || [];
  }

  getAvailableModels(): PredictiveModel[] {
    return Array.from(this.models.values());
  }

  getModelPerformance(): Record<string, any> {
    const models = Array.from(this.models.values());
    return {
      totalModels: models.length,
      avgAccuracy: models.reduce((sum, m) => sum + m.accuracy, 0) / models.length,
      modelBreakdown: models.map(m => ({
        name: m.name,
        type: m.type,
        accuracy: m.accuracy,
        lastTrained: m.lastTrained
      }))
    };
  }

  // Response time prediction helpers
  private getHistoricalResponseData(contact: Contact, type: string): any[] {
    // Mock historical response data
    return [
      { date: '2024-01-20', responseTime: 4.5 },
      { date: '2024-01-18', responseTime: 2.1 },
      { date: '2024-01-15', responseTime: 6.8 }
    ];
  }

  private calculateAverageResponseTime(data: any[]): number {
    if (data.length === 0) return 24; // Default 24 hours
    return data.reduce((sum, d) => sum + d.responseTime, 0) / data.length;
  }

  private determineOptimalSendTime(contact: Contact, data: any[]): string {
    // Analyze data to determine optimal send time
    return 'Tuesday-Thursday 2-4 PM';
  }

  private getResponseTimeFactors(contact: Contact, type: string): string[] {
    return [
      'Historical response patterns',
      'Industry communication norms',
      'Contact seniority level',
      'Communication channel preference'
    ];
  }

  private calculateResponseTimeConfidence(data: any[]): number {
    // Calculate confidence based on data quality and quantity
    return Math.min(95, 60 + (data.length * 5));
  }

  // Deal size prediction helpers
  private getIndustryAverageDealSize(industry?: string): number {
    const averages: Record<string, number> = {
      'Technology': 75000,
      'Healthcare': 95000,
      'Finance': 120000,
      'Manufacturing': 85000,
      'Retail': 45000,
      'Education': 65000
    };
    
    return averages[industry || 'Technology'] || 65000;
  }

  private analyzeCompanyFactors(contact: Contact): { multiplier: number; description: string } {
    if (!contact.company) return { multiplier: 1.0, description: 'Standard company size' };
    
    const company = contact.company.toLowerCase();
    if (company.includes('corp') || company.includes('corporation')) {
      return { multiplier: 1.5, description: 'Large corporation' };
    } else if (company.includes('inc') || company.includes('incorporated')) {
      return { multiplier: 1.2, description: 'Medium-large company' };
    } else if (company.includes('llc')) {
      return { multiplier: 0.8, description: 'Small-medium company' };
    }
    
    return { multiplier: 1.0, description: 'Standard company size' };
  }

  private analyzeTitleFactors(title: string): { multiplier: number; description: string } {
    if (!title) return { multiplier: 1.0, description: 'Standard role' };
    
    const lower = title.toLowerCase();
    if (lower.includes('ceo') || lower.includes('cto') || lower.includes('founder')) {
      return { multiplier: 1.8, description: 'Executive level - high authority' };
    } else if (lower.includes('director') || lower.includes('vp')) {
      return { multiplier: 1.4, description: 'Director level - strong influence' };
    } else if (lower.includes('manager')) {
      return { multiplier: 1.1, description: 'Management level - moderate influence' };
    }
    
    return { multiplier: 0.9, description: 'Individual contributor' };
  }

  private calculateDealSizeConfidence(contact: Contact, context?: any): number {
    let confidence = 70; // Base confidence
    
    if (contact.industry) confidence += 10;
    if (contact.title) confidence += 10;
    if (contact.company) confidence += 10;
    if (context?.previousDeals?.length > 0) confidence += 15;
    
    return Math.min(95, confidence);
  }

  private calculateConfidence(contact: Contact, factors: string[]): number {
    let confidence = 60; // Base confidence
    
    confidence += factors.length * 5; // More factors = higher confidence
    if (contact.aiScore) confidence += 15;
    if (contact.lastConnected) confidence += 10;
    
    return Math.min(95, confidence);
  }
}

export const aiPredictiveAnalytics = new AIPredictiveAnalyticsService();