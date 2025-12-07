/**
 * SDR Agent User Controls - Configuration Types
 * Types and interfaces for user-customizable SDR agent behavior
 */

export interface SDRUserPreferences {
  userId: string;
  agentId: string;

  // Campaign Configuration
  campaignLength: number;        // 3-10 emails, or 'unlimited'
  messageDelay: number;          // hours between messages
  tone: 'professional' | 'casual' | 'friendly' | 'enthusiastic';
  personalizationLevel: 'low' | 'medium' | 'high';

  // Channel Preferences
  channels: ('email' | 'linkedin' | 'whatsapp' | 'phone')[];
  primaryChannel: 'email' | 'linkedin' | 'whatsapp' | 'phone';

  // Success Criteria
  successCriteria: {
    opened: { weight: number; action: 'continue' | 'escalate' | 'stop' };
    clicked: { weight: number; action: 'continue' | 'escalate' | 'stop' };
    replied: { weight: number; action: 'continue' | 'escalate' | 'handover' | 'stop' };
    unsubscribed: { weight: number; action: 'stop' | 'pause' };
  };

  // Custom Prompts and Content
  customPrompts: Record<string, string>;
  followUpRules: Array<{
    condition: string;
    action: string;
    delay?: number;
  }>;

  // Branding
  branding: {
    companyName: string;
    signature: string;
    logo?: string;
    customCTAs?: string[];
  };

  // Advanced AI Settings
  aiSettings: {
    model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-2';
    temperature: number;        // 0.0 - 1.0
    maxTokens: number;          // 500 - 2000
    reasoningEffort?: 'low' | 'medium' | 'high';
  };

  // Timing Rules
  timingRules: {
    businessHoursOnly: boolean;
    timezone: string;
    maxPerDay: number;
    maxPerWeek: number;
    respectWeekends: boolean;
  };

  // Objection Handling
  objectionHandling: Array<{
    objection: string;
    response: string;
    escalation: boolean;
  }>;

  // Competitor Strategy
  competitorStrategy: {
    mentionCompetitors: boolean;
    positioning: 'differentiation' | 'comparison' | 'avoidance';
    keyAdvantages: string[];
  };
}

export interface SDRCampaignTemplate {
  id: string;
  userId: string;
  name: string;
  agentId: string;
  description?: string;

  // Campaign Structure
  sequence: Array<{
    day: number;
    type: 'email' | 'linkedin' | 'whatsapp' | 'phone' | 'social';
    template: string;
    subject?: string;
    delay?: number; // hours from previous message
    conditions?: string[]; // conditions to send this message
  }>;

  // Template Settings
  settings: Partial<SDRUserPreferences>;

  // Metadata
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface SDRAgentPerformance {
  id: string;
  userId: string;
  agentId: string;
  campaignId?: string;
  templateId?: string;

  // Performance Metrics
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
    converted: number;
    revenue?: number;
  };

  // Timing Metrics
  timing: {
    averageResponseTime: number; // hours
    campaignDuration: number;    // days
    messagesPerDay: number;
  };

  // Success Rates
  rates: {
    openRate: number;
    clickRate: number;
    replyRate: number;
    conversionRate: number;
    unsubscribeRate: number;
  };

  // Channel Performance
  channelPerformance: Record<string, {
    sent: number;
    success: number;
    rate: number;
  }>;

  // Time-based Analytics
  timeAnalytics: {
    bestDayOfWeek: string;
    bestTimeOfDay: string;
    responsePatterns: Array<{
      hour: number;
      responses: number;
    }>;
  };

  createdAt: string;
  period: {
    start: string;
    end: string;
  };
}

export interface SDRConfigurationContext {
  userId: string;
  agentId: string;
  contactId?: string;
  dealId?: string;

  // Runtime Context
  contactData?: {
    industry?: string;
    companySize?: number;
    role?: string;
    engagementScore?: number;
  };

  dealData?: {
    value?: number;
    stage?: string;
    competitors?: string[];
  };

  // Historical Context
  previousInteractions?: Array<{
    type: string;
    timestamp: string;
    outcome: string;
  }>;

  // Campaign Context
  campaignProgress?: {
    currentStep: number;
    totalSteps: number;
    lastInteraction: string;
    nextScheduled: string;
  };
}

// Default configurations for different agent types
export const DEFAULT_SDR_PREFERENCES: Record<string, Partial<SDRUserPreferences>> = {
  'sdr-follow-up': {
    campaignLength: 5,
    messageDelay: 48, // 2 days
    tone: 'professional',
    personalizationLevel: 'medium',
    channels: ['email'],
    primaryChannel: 'email',
    successCriteria: {
      opened: { weight: 0.3, action: 'continue' },
      clicked: { weight: 0.5, action: 'escalate' },
      replied: { weight: 1.0, action: 'handover' },
      unsubscribed: { weight: -1.0, action: 'stop' }
    },
    aiSettings: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    },
    timingRules: {
      businessHoursOnly: true,
      timezone: 'America/New_York',
      maxPerDay: 2,
      maxPerWeek: 5,
      respectWeekends: true
    }
  },

  'sdr-cold-outreach': {
    campaignLength: 7,
    messageDelay: 72, // 3 days
    tone: 'friendly',
    personalizationLevel: 'high',
    channels: ['email', 'linkedin'],
    primaryChannel: 'email',
    successCriteria: {
      opened: { weight: 0.2, action: 'continue' },
      clicked: { weight: 0.4, action: 'escalate' },
      replied: { weight: 1.0, action: 'handover' },
      unsubscribed: { weight: -1.0, action: 'stop' }
    },
    aiSettings: {
      model: 'gpt-4',
      temperature: 0.8,
      maxTokens: 800
    },
    timingRules: {
      businessHoursOnly: true,
      timezone: 'America/New_York',
      maxPerDay: 1,
      maxPerWeek: 3,
      respectWeekends: true
    }
  },

  'sdr-nurture': {
    campaignLength: 10,
    messageDelay: 168, // 1 week
    tone: 'casual',
    personalizationLevel: 'high',
    channels: ['email', 'linkedin'],
    primaryChannel: 'email',
    successCriteria: {
      opened: { weight: 0.4, action: 'continue' },
      clicked: { weight: 0.6, action: 'escalate' },
      replied: { weight: 1.0, action: 'handover' },
      unsubscribed: { weight: -1.0, action: 'stop' }
    },
    aiSettings: {
      model: 'gpt-3.5-turbo',
      temperature: 0.6,
      maxTokens: 600
    },
    timingRules: {
      businessHoursOnly: true,
      timezone: 'America/New_York',
      maxPerDay: 1,
      maxPerWeek: 2,
      respectWeekends: true
    }
  }
};

// Utility functions for preference management
export const createDefaultPreferences = (
  userId: string,
  agentId: string
): SDRUserPreferences => {
  const defaults = DEFAULT_SDR_PREFERENCES[agentId] || DEFAULT_SDR_PREFERENCES['sdr-follow-up'];

  return {
    userId,
    agentId,
    campaignLength: defaults?.campaignLength || 5,
    messageDelay: defaults?.messageDelay || 48,
    tone: defaults?.tone || 'professional',
    personalizationLevel: defaults?.personalizationLevel || 'medium',
    channels: defaults?.channels || ['email'],
    primaryChannel: defaults?.primaryChannel || 'email',
    successCriteria: defaults?.successCriteria || {
      opened: { weight: 0.3, action: 'continue' },
      clicked: { weight: 0.5, action: 'escalate' },
      replied: { weight: 1.0, action: 'handover' },
      unsubscribed: { weight: -1.0, action: 'stop' }
    },
    customPrompts: {},
    followUpRules: [],
    branding: {
      companyName: '',
      signature: ''
    },
    aiSettings: defaults?.aiSettings || {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    },
    timingRules: defaults?.timingRules || {
      businessHoursOnly: true,
      timezone: 'America/New_York',
      maxPerDay: 2,
      maxPerWeek: 5,
      respectWeekends: true
    },
    objectionHandling: [],
    competitorStrategy: {
      mentionCompetitors: false,
      positioning: 'differentiation',
      keyAdvantages: []
    }
  };
};

export const validatePreferences = (prefs: Partial<SDRUserPreferences>): string[] => {
  const errors: string[] = [];

  if (prefs.campaignLength && (prefs.campaignLength < 1 || prefs.campaignLength > 20)) {
    errors.push('Campaign length must be between 1 and 20 messages');
  }

  if (prefs.messageDelay && prefs.messageDelay < 1) {
    errors.push('Message delay must be at least 1 hour');
  }

  if (prefs.aiSettings?.temperature &&
      (prefs.aiSettings.temperature < 0 || prefs.aiSettings.temperature > 1)) {
    errors.push('AI temperature must be between 0 and 1');
  }

  if (prefs.aiSettings?.maxTokens &&
      (prefs.aiSettings.maxTokens < 100 || prefs.aiSettings.maxTokens > 4000)) {
    errors.push('Max tokens must be between 100 and 4000');
  }

  return errors;
};