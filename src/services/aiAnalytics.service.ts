/**
 * AI Feature Usage Analytics Service
 * Tracks usage of AI features for analytics and optimization
 */

interface AIFeatureUsage {
  feature: string;
  action: string;
  contactId?: string;
  duration?: number;
  success: boolean;
  timestamp: string;
  userAgent: string;
  sessionId: string;
}

interface AIAnalyticsStats {
  totalUsage: number;
  featureUsage: Record<string, number>;
  successRate: Record<string, { success: number; total: number }>;
  averageDuration: Record<string, number>;
  recentActivity: AIFeatureUsage[];
}

class AIAnalyticsService {
  private static instance: AIAnalyticsService;
  private usage: AIFeatureUsage[] = [];
  private maxUsage = 1000; // Keep last 1000 events
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.loadFromStorage();
  }

  static getInstance(): AIAnalyticsService {
    if (!AIAnalyticsService.instance) {
      AIAnalyticsService.instance = new AIAnalyticsService();
    }
    return AIAnalyticsService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('ai_analytics');
      if (stored) {
        this.usage = JSON.parse(stored);
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('ai_analytics', JSON.stringify(this.usage));
    } catch (e) {
      // Ignore storage errors
    }
  }

  trackUsage(feature: string, action: string, options: {
    contactId?: string;
    duration?: number;
    success?: boolean;
  } = {}) {
    const usage: AIFeatureUsage = {
      feature,
      action,
      contactId: options.contactId,
      duration: options.duration,
      success: options.success !== false, // Default to true
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: this.sessionId
    };

    this.usage.unshift(usage);
    if (this.usage.length > this.maxUsage) {
      this.usage = this.usage.slice(0, this.maxUsage);
    }

    this.saveToStorage();

    // Log in development
    if (import.meta.env.DEV) {
      console.log('AI Usage tracked:', usage);
    }

    // Send to analytics service in production
    if (import.meta.env.PROD) {
      this.sendToAnalytics(usage);
    }
  }

  // Specific tracking methods for AI features
  trackAIScoring(contactId: string, duration: number, success: boolean = true) {
    this.trackUsage('ai_scoring', 'score_contact', { contactId, duration, success });
  }

  trackAIResearch(contactId: string, duration: number, success: boolean = true) {
    this.trackUsage('ai_research', 'web_research', { contactId, duration, success });
  }

  trackAIEmailGeneration(contactId: string, duration: number, success: boolean = true) {
    this.trackUsage('ai_email', 'generate_email', { contactId, duration, success });
  }

  trackAIAnalysis(contactId: string, duration: number, success: boolean = true) {
    this.trackUsage('ai_analysis', 'analyze_contact', { contactId, duration, success });
  }

  trackAIEnrichment(contactId: string, duration: number, success: boolean = true) {
    this.trackUsage('ai_enrichment', 'enrich_profile', { contactId, duration, success });
  }

  trackAIFeedback(contactId: string, type: 'positive' | 'negative') {
    this.trackUsage('ai_feedback', type, { contactId, success: true });
  }

  trackAIButtonClick(feature: string, contactId?: string) {
    this.trackUsage(feature, 'button_click', { contactId, success: true });
  }

  private async sendToAnalytics(usage: AIFeatureUsage) {
    // In a real implementation, send to analytics services like Mixpanel, Amplitude, etc.
    try {
      // Example: Send to analytics endpoint
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(usage)
      // });
      console.warn('Analytics tracking not implemented in demo');
    } catch (e) {
      // Don't track analytics errors
    }
  }

  getAnalytics(): AIAnalyticsStats {
    const stats: AIAnalyticsStats = {
      totalUsage: this.usage.length,
      featureUsage: {},
      successRate: {},
      averageDuration: {},
      recentActivity: this.usage.slice(0, 10)
    };

    const featureStats: Record<string, { count: number; success: number; durations: number[] }> = {};

    this.usage.forEach(event => {
      // Feature usage count
      stats.featureUsage[event.feature] = (stats.featureUsage[event.feature] || 0) + 1;

      // Success rate
      if (!stats.successRate[event.feature]) {
        stats.successRate[event.feature] = { success: 0, total: 0 };
      }
      stats.successRate[event.feature].total++;
      if (event.success) {
        stats.successRate[event.feature].success++;
      }

      // Average duration
      if (!featureStats[event.feature]) {
        featureStats[event.feature] = { count: 0, success: 0, durations: [] };
      }
      if (event.duration) {
        featureStats[event.feature].durations.push(event.duration);
      }
    });

    // Calculate average durations
    Object.keys(featureStats).forEach(feature => {
      const durations = featureStats[feature].durations;
      if (durations.length > 0) {
        stats.averageDuration[feature] = durations.reduce((a, b) => a + b, 0) / durations.length;
      }
    });

    return stats;
  }

  getFeatureUsage(feature: string): AIFeatureUsage[] {
    return this.usage.filter(event => event.feature === feature);
  }

  getContactUsage(contactId: string): AIFeatureUsage[] {
    return this.usage.filter(event => event.contactId === contactId);
  }

  clearAnalytics() {
    this.usage = [];
    localStorage.removeItem('ai_analytics');
  }

  exportAnalytics(): string {
    return JSON.stringify(this.usage, null, 2);
  }
}

export const aiAnalytics = AIAnalyticsService.getInstance();