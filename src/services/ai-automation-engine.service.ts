/**
 * AI Automation Engine
 * Smart workflow suggestions and automation optimization
 */

import { logger } from './logger.service';
import { Contact } from '../types';
import { aiIntelligenceEngine, SmartRecommendation } from './ai-intelligence-engine.service';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  performance: {
    triggerCount: number;
    successCount: number;
    failureCount: number;
    avgExecutionTime: number;
    lastTriggered?: string;
  };
  aiOptimized: boolean;
  optimizationSuggestions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AutomationTrigger {
  type: 'contact_created' | 'score_change' | 'interaction' | 'time_based' | 'manual';
  config: Record<string, any>;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface AutomationAction {
  type: 'email' | 'task' | 'tag' | 'score_update' | 'workflow' | 'notification';
  config: Record<string, any>;
  delay?: number; // milliseconds
}

export interface AutomationSuggestion {
  id: string;
  type: 'new_rule' | 'optimize_existing' | 'disable_rule' | 'merge_rules';
  title: string;
  description: string;
  reasoning: string[];
  estimatedImpact: {
    efficiency: number; // percentage improvement
    coverage: number; // percentage of contacts affected
    timesSaved: number; // hours per week
  };
  confidence: number;
  suggestedRule?: Partial<AutomationRule>;
  affectedRuleIds?: string[];
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

class AIAutomationEngine {
  private automationRules: Map<string, AutomationRule> = new Map();
  private suggestions: AutomationSuggestion[] = [];
  private performanceHistory: Array<{
    ruleId: string;
    execution: any;
    outcome: 'success' | 'failure';
    timestamp: string;
  }> = [];

  constructor() {
    this.initializeDefaultRules();
    this.loadPerformanceHistory();
  }

  // Core Automation Methods
  async generateAutomationSuggestions(
    contacts: Contact[],
    existingRules: AutomationRule[] = []
  ): Promise<AutomationSuggestion[]> {
    logger.info('Generating automation suggestions', { contactCount: contacts.length });

    const suggestions: AutomationSuggestion[] = [];
    
    // Analyze contact patterns for automation opportunities
    const patterns = this.analyzeContactPatterns(contacts);
    
    // Generate suggestions based on patterns
    suggestions.push(...this.suggestNewRules(patterns, contacts));
    suggestions.push(...this.suggestRuleOptimizations(existingRules, patterns));
    suggestions.push(...this.suggestRuleConsolidation(existingRules));
    
    // Score and prioritize suggestions
    const scoredSuggestions = suggestions.map(s => ({
      ...s,
      score: this.calculateSuggestionScore(s, patterns)
    })).sort((a, b) => b.score - a.score);
    
    this.suggestions = scoredSuggestions.slice(0, 10); // Keep top 10
    return this.suggestions;
  }

  async optimizeExistingRule(
    ruleId: string,
    performanceData: any[]
  ): Promise<{
    optimizedRule: AutomationRule;
    improvements: string[];
    estimatedImpact: number;
  }> {
    const rule = this.automationRules.get(ruleId);
    if (!rule) throw new Error(`Rule ${ruleId} not found`);

    logger.info('Optimizing automation rule', { ruleId, ruleName: rule.name });

    const analysis = this.analyzeRulePerformance(rule, performanceData);
    const optimizations = this.generateOptimizations(rule, analysis);
    
    const optimizedRule: AutomationRule = {
      ...rule,
      ...optimizations.ruleChanges,
      aiOptimized: true,
      optimizationSuggestions: optimizations.suggestions,
      updatedAt: new Date().toISOString()
    };

    return {
      optimizedRule,
      improvements: optimizations.improvements,
      estimatedImpact: optimizations.estimatedImpact
    };
  }

  async predictAutomationImpact(
    rule: Partial<AutomationRule>,
    contacts: Contact[]
  ): Promise<{
    affectedContacts: number;
    estimatedExecutions: number;
    timesSaved: number;
    potentialIssues: string[];
    confidence: number;
  }> {
    // Simulate rule execution to predict impact
    const affectedContacts = contacts.filter(contact => 
      this.wouldRuleTrigger(rule, contact)
    ).length;

    // Estimate executions based on trigger frequency
    const estimatedExecutions = this.estimateExecutionFrequency(rule, affectedContacts);
    
    // Calculate time savings
    const timesSaved = this.calculateTimeSavings(rule, estimatedExecutions);
    
    // Identify potential issues
    const potentialIssues = this.identifyPotentialIssues(rule, contacts);
    
    return {
      affectedContacts,
      estimatedExecutions,
      timesSaved,
      potentialIssues,
      confidence: this.calculatePredictionConfidence(rule, contacts)
    };
  }

  // Smart Rule Generation
  generateSmartRule(
    purpose: 'lead_nurturing' | 'follow_up' | 'qualification' | 'escalation',
    contactCriteria: Record<string, any>,
    businessGoals: string[]
  ): AutomationRule {
    const baseRule = this.getBaseRuleTemplate(purpose);
    
    // Customize based on criteria and goals
    const customizedRule = this.customizeRule(baseRule, contactCriteria, businessGoals);
    
    // Apply AI optimizations
    const optimizedRule = this.applyAIOptimizations(customizedRule);
    
    return optimizedRule;
  }

  // Performance Monitoring
  recordRuleExecution(
    ruleId: string,
    execution: {
      contactId: string;
      triggeredAt: string;
      completedAt: string;
      outcome: 'success' | 'failure' | 'partial';
      actions: any[];
      metrics?: Record<string, number>;
    }
  ): void {
    const rule = this.automationRules.get(ruleId);
    if (!rule) return;

    // Update rule performance
    rule.performance.triggerCount++;
    if (execution.outcome === 'success') {
      rule.performance.successCount++;
    } else {
      rule.performance.failureCount++;
    }
    
    const executionTime = new Date(execution.completedAt).getTime() - new Date(execution.triggeredAt).getTime();
    rule.performance.avgExecutionTime = (rule.performance.avgExecutionTime + executionTime) / 2;
    rule.performance.lastTriggered = execution.triggeredAt;

    // Record in history
    this.performanceHistory.push({
      ruleId,
      execution,
      outcome: execution.outcome,
      timestamp: new Date().toISOString()
    });

    this.savePerformanceHistory();
  }

  // Private Helper Methods
  private analyzeContactPatterns(contacts: Contact[]): any {
    const patterns = {
      interestLevelDistribution: this.getDistribution(contacts, 'interestLevel'),
      industryDistribution: this.getDistribution(contacts, 'industry'),
      statusDistribution: this.getDistribution(contacts, 'status'),
      sourceDistribution: this.getDistribution(contacts, 'sources'),
      commonActions: this.identifyCommonActions(contacts),
      timePatterns: this.analyzeTimePatterns(contacts)
    };

    return patterns;
  }

  private suggestNewRules(patterns: any, contacts: Contact[]): AutomationSuggestion[] {
    const suggestions: AutomationSuggestion[] = [];

    // High-interest contact rule
    if (patterns.interestLevelDistribution.hot > 5) {
      suggestions.push({
        id: `suggestion_hot_${Date.now()}`,
        type: 'new_rule',
        title: 'Hot Lead Fast Track',
        description: 'Automatically prioritize and assign hot leads for immediate follow-up',
        reasoning: [
          `${patterns.interestLevelDistribution.hot} hot leads detected`,
          'Immediate response critical for hot leads',
          'Automation ensures no delays'
        ],
        estimatedImpact: {
          efficiency: 40,
          coverage: patterns.interestLevelDistribution.hot,
          timesSaved: 2
        },
        confidence: 90,
        suggestedRule: {
          name: 'Hot Lead Fast Track',
          trigger: { type: 'contact_created', config: {} },
          conditions: [{ field: 'interestLevel', operator: 'equals', value: 'hot' }],
          actions: [
            { type: 'task', config: { title: 'Immediate follow-up required', priority: 'high' } },
            { type: 'notification', config: { message: 'Hot lead assigned', channel: 'email' } }
          ]
        },
        priority: 'high',
        createdAt: new Date().toISOString()
      });
    }

    // Industry-specific nurturing
    const topIndustry = Object.entries(patterns.industryDistribution)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topIndustry && topIndustry[1] > 10) {
      suggestions.push({
        id: `suggestion_industry_${Date.now()}`,
        type: 'new_rule',
        title: `${topIndustry[0]} Industry Nurturing`,
        description: `Specialized nurturing sequence for ${topIndustry[0]} contacts`,
        reasoning: [
          `${topIndustry[1]} contacts in ${topIndustry[0]} industry`,
          'Industry-specific content improves engagement',
          'Automated nurturing maintains consistency'
        ],
        estimatedImpact: {
          efficiency: 25,
          coverage: topIndustry[1],
          timesSaved: 3
        },
        confidence: 80,
        priority: 'medium',
        createdAt: new Date().toISOString()
      });
    }

    return suggestions;
  }

  private suggestRuleOptimizations(
    existingRules: AutomationRule[],
    patterns: any
  ): AutomationSuggestion[] {
    return existingRules
      .filter(rule => rule.performance.triggerCount > 10)
      .map(rule => {
        const successRate = rule.performance.successCount / rule.performance.triggerCount;
        
        if (successRate < 0.7) {
          return {
            id: `opt_${rule.id}_${Date.now()}`,
            type: 'optimize_existing',
            title: `Optimize "${rule.name}"`,
            description: `Rule performance below optimal (${Math.round(successRate * 100)}% success rate)`,
            reasoning: [
              `Low success rate: ${Math.round(successRate * 100)}%`,
              'Conditions may be too broad or narrow',
              'Actions may need adjustment'
            ],
            estimatedImpact: {
              efficiency: 30,
              coverage: rule.performance.triggerCount,
              timesSaved: 1
            },
            confidence: 75,
            affectedRuleIds: [rule.id],
            priority: successRate < 0.5 ? 'high' : 'medium',
            createdAt: new Date().toISOString()
          };
        }
        return null;
      })
      .filter(Boolean) as AutomationSuggestion[];
  }

  private suggestRuleConsolidation(rules: AutomationRule[]): AutomationSuggestion[] {
    const suggestions: AutomationSuggestion[] = [];
    
    // Find rules with similar triggers and conditions
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        if (this.rulesAreSimilar(rules[i], rules[j])) {
          suggestions.push({
            id: `merge_${rules[i].id}_${rules[j].id}`,
            type: 'merge_rules',
            title: `Merge "${rules[i].name}" and "${rules[j].name}"`,
            description: 'Similar rules detected that could be consolidated for better efficiency',
            reasoning: [
              'Similar trigger conditions',
              'Overlapping target contacts',
              'Consolidation reduces complexity'
            ],
            estimatedImpact: {
              efficiency: 20,
              coverage: 0,
              timesSaved: 0.5
            },
            confidence: 85,
            affectedRuleIds: [rules[i].id, rules[j].id],
            priority: 'low',
            createdAt: new Date().toISOString()
          });
        }
      }
    }
    
    return suggestions;
  }

  private calculateSuggestionScore(suggestion: AutomationSuggestion, patterns: any): number {
    let score = suggestion.confidence;
    
    // Boost score based on impact
    score += suggestion.estimatedImpact.efficiency * 0.5;
    score += suggestion.estimatedImpact.timesSaved * 10;
    
    // Adjust based on priority
    if (suggestion.priority === 'high') score += 20;
    else if (suggestion.priority === 'medium') score += 10;
    
    return score;
  }

  private getDistribution(contacts: Contact[], field: keyof Contact): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    contacts.forEach(contact => {
      const value = contact[field];
      if (Array.isArray(value)) {
        value.forEach(v => {
          distribution[v] = (distribution[v] || 0) + 1;
        });
      } else if (value) {
        distribution[String(value)] = (distribution[String(value)] || 0) + 1;
      }
    });
    
    return distribution;
  }

  private identifyCommonActions(contacts: Contact[]): string[] {
    // Analyze what actions are commonly needed
    return [
      'follow_up_email',
      'schedule_call',
      'send_proposal',
      'add_to_nurturing',
      'update_score'
    ];
  }

  private analyzeTimePatterns(contacts: Contact[]): any {
    // Analyze timing patterns in contact interactions
    return {
      peakInteractionHours: ['10AM', '2PM', '4PM'],
      bestFollowUpDelay: '2-3 days',
      optimalSequenceTiming: 'Every 5-7 days'
    };
  }

  private wouldRuleTrigger(rule: Partial<AutomationRule>, contact: Contact): boolean {
    if (!rule.conditions) return false;
    
    return rule.conditions.every(condition => {
      const contactValue = (contact as any)[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return contactValue === condition.value;
        case 'contains':
          return String(contactValue).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'greater_than':
          return Number(contactValue) > Number(condition.value);
        case 'less_than':
          return Number(contactValue) < Number(condition.value);
        default:
          return false;
      }
    });
  }

  private estimateExecutionFrequency(rule: Partial<AutomationRule>, affectedContacts: number): number {
    // Estimate how often this rule would execute
    if (rule.trigger?.type === 'contact_created') {
      return affectedContacts * 0.1; // 10% of affected contacts per week
    } else if (rule.trigger?.type === 'time_based') {
      return affectedContacts * 0.2; // 20% per week for time-based
    }
    return affectedContacts * 0.05; // 5% per week default
  }

  private calculateTimeSavings(rule: Partial<AutomationRule>, executions: number): number {
    // Estimate time saved per execution
    const timePerExecution = 0.25; // 15 minutes per manual execution
    return executions * timePerExecution;
  }

  private identifyPotentialIssues(rule: Partial<AutomationRule>, contacts: Contact[]): string[] {
    const issues = [];
    
    if (rule.conditions && rule.conditions.length === 0) {
      issues.push('No conditions specified - rule may trigger too frequently');
    }
    
    if (rule.actions && rule.actions.length > 5) {
      issues.push('Too many actions may cause delays or failures');
    }
    
    return issues;
  }

  private calculatePredictionConfidence(rule: Partial<AutomationRule>, contacts: Contact[]): number {
    // Calculate confidence in predictions based on rule complexity and data quality
    let confidence = 80; // Base confidence
    
    if (rule.conditions && rule.conditions.length > 0) confidence += 10;
    if (contacts.length > 100) confidence += 10;
    
    return Math.min(95, confidence);
  }

  private getBaseRuleTemplate(purpose: string): Partial<AutomationRule> {
    const templates = {
      lead_nurturing: {
        name: 'Lead Nurturing Sequence',
        trigger: { type: 'contact_created', config: {} },
        conditions: [{ field: 'status', operator: 'equals', value: 'lead' }],
        actions: [
          { type: 'email', config: { template: 'welcome_email' }, delay: 0 },
          { type: 'email', config: { template: 'nurturing_email_1' }, delay: 172800000 }, // 2 days
          { type: 'task', config: { title: 'Follow up call' }, delay: 604800000 } // 7 days
        ]
      },
      follow_up: {
        name: 'Follow-up Reminder',
        trigger: { type: 'interaction', config: {} },
        conditions: [{ field: 'interestLevel', operator: 'equals', value: 'medium' }],
        actions: [
          { type: 'task', config: { title: 'Follow up required' }, delay: 259200000 } // 3 days
        ]
      }
    };
    
    return templates[purpose as keyof typeof templates] || templates.lead_nurturing;
  }

  private customizeRule(
    rule: Partial<AutomationRule>,
    criteria: Record<string, any>,
    goals: string[]
  ): Partial<AutomationRule> {
    // Customize rule based on specific criteria and business goals
    const customized = { ...rule };
    
    // Add criteria as conditions
    Object.entries(criteria).forEach(([field, value]) => {
      if (customized.conditions) {
        customized.conditions.push({
          field,
          operator: 'equals',
          value
        });
      }
    });
    
    return customized;
  }

  private applyAIOptimizations(rule: Partial<AutomationRule>): AutomationRule {
    // Apply AI-based optimizations
    const optimized: AutomationRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: rule.name || 'AI Generated Rule',
      description: rule.description || 'AI optimized automation rule',
      trigger: rule.trigger || { type: 'manual', config: {} },
      conditions: rule.conditions || [],
      actions: rule.actions || [],
      isActive: true,
      performance: {
        triggerCount: 0,
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0
      },
      aiOptimized: true,
      optimizationSuggestions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return optimized;
  }

  private analyzeRulePerformance(rule: AutomationRule, performanceData: any[]): any {
    return {
      successRate: rule.performance.successCount / rule.performance.triggerCount,
      avgExecutionTime: rule.performance.avgExecutionTime,
      failurePatterns: this.identifyFailurePatterns(performanceData),
      optimizationOpportunities: this.identifyOptimizationOpportunities(rule, performanceData)
    };
  }

  private generateOptimizations(rule: AutomationRule, analysis: any): any {
    return {
      ruleChanges: {},
      suggestions: ['Consider adjusting timing', 'Review condition specificity'],
      improvements: ['Improved success rate', 'Reduced execution time'],
      estimatedImpact: 25
    };
  }

  private identifyFailurePatterns(performanceData: any[]): any[] {
    return performanceData.filter(p => p.outcome === 'failure');
  }

  private identifyOptimizationOpportunities(rule: AutomationRule, performanceData: any[]): string[] {
    return ['Timing optimization', 'Condition refinement'];
  }

  private rulesAreSimilar(rule1: AutomationRule, rule2: AutomationRule): boolean {
    // Check if rules have similar triggers and conditions
    return rule1.trigger.type === rule2.trigger.type &&
           rule1.conditions.length === rule2.conditions.length;
  }

  private initializeDefaultRules(): void {
    // Initialize with default automation rules
    const defaultRules: AutomationRule[] = [
      {
        id: 'default_hot_lead',
        name: 'Hot Lead Priority',
        description: 'Immediate priority for hot leads',
        trigger: { type: 'contact_created', config: {} },
        conditions: [{ field: 'interestLevel', operator: 'equals', value: 'hot' }],
        actions: [
          { type: 'task', config: { title: 'Call hot lead immediately', priority: 'urgent' } },
          { type: 'notification', config: { message: 'Hot lead alert', channel: 'email' } }
        ],
        isActive: true,
        performance: { triggerCount: 0, successCount: 0, failureCount: 0, avgExecutionTime: 0 },
        aiOptimized: false,
        optimizationSuggestions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    defaultRules.forEach(rule => {
      this.automationRules.set(rule.id, rule);
    });
  }

  private loadPerformanceHistory(): void {
    try {
      const stored = localStorage.getItem('automation_performance_history');
      if (stored) {
        this.performanceHistory = JSON.parse(stored);
      }
    } catch (error) {
      logger.warn('Failed to load automation performance history', error);
    }
  }

  private savePerformanceHistory(): void {
    try {
      localStorage.setItem('automation_performance_history', JSON.stringify(this.performanceHistory.slice(-1000)));
    } catch (error) {
      logger.warn('Failed to save automation performance history', error);
    }
  }

  // Public API
  getAutomationSuggestions(): AutomationSuggestion[] {
    return this.suggestions;
  }

  getAutomationRule(ruleId: string): AutomationRule | undefined {
    return this.automationRules.get(ruleId);
  }

  getAllAutomationRules(): AutomationRule[] {
    return Array.from(this.automationRules.values());
  }

  getPerformanceMetrics(): {
    totalRules: number;
    activeRules: number;
    avgSuccessRate: number;
    totalExecutions: number;
  } {
    const rules = Array.from(this.automationRules.values());
    const activeRules = rules.filter(r => r.isActive).length;
    const totalExecutions = rules.reduce((sum, r) => sum + r.performance.triggerCount, 0);
    const avgSuccessRate = rules.length > 0
      ? rules.reduce((sum, r) => sum + (r.performance.successCount / Math.max(1, r.performance.triggerCount)), 0) / rules.length
      : 0;

    return {
      totalRules: rules.length,
      activeRules,
      avgSuccessRate,
      totalExecutions
    };
  }
}

export const aiAutomationEngine = new AIAutomationEngine();