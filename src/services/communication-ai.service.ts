/**
 * Communication AI Service
 * AI-powered communication analysis, generation, and optimization
 */

import { aiOrchestrator, AIRequest } from './ai-orchestrator.service';
import { logger } from './logger.service';
import { Contact } from '../types';

export interface EmailGeneration {
  subject: string;
  body: string;
  tone: string;
  purpose: string;
  personalization: {
    elements: string[];
    confidence: number;
  };
  optimization: {
    subjectScore: number;
    bodyScore: number;
    overallScore: number;
    improvements: string[];
  };
  metadata: {
    wordCount: number;
    readingTime: string;
    targetAudience: string;
  };
}

export interface EmailAnalysis {
  scores: {
    clarity: number;
    engagement: number;
    professionalism: number;
    persuasiveness: number;
    overall: number;
  };
  toneAnalysis: {
    primary: string;
    secondary?: string;
    emotionalProfile: Record<string, number>;
  };
  suggestions: Array<{
    type: 'improvement' | 'warning' | 'optimization';
    category: 'subject' | 'content' | 'structure' | 'tone';
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  predictions: {
    responseRate: number;
    engagementScore: number;
    conversionProbability: number;
  };
  alternatives: {
    subjectLines: string[];
    openingLines: string[];
    callsToAction: string[];
  };
}

export interface CommunicationStrategy {
  contactId: string;
  optimalChannels: Array<{
    channel: 'email' | 'phone' | 'linkedin' | 'sms';
    effectiveness: number;
    reasoning: string[];
  }>;
  timing: {
    bestDays: string[];
    bestHours: string[];
    frequency: string;
    nextOptimalContact: string;
  };
  messaging: {
    preferredTone: string;
    keyMessages: string[];
    avoidTopics: string[];
    personalizationTriggers: string[];
  };
  contentRecommendations: Array<{
    type: 'case_study' | 'whitepaper' | 'demo' | 'pricing' | 'testimonial';
    title: string;
    relevance: number;
    timing: string;
  }>;
}

export interface ConversationFlow {
  stages: Array<{
    stage: string;
    objective: string;
    keyMessages: string[];
    expectedResponses: string[];
    nextActions: string[];
  }>;
  objectionHandling: Array<{
    objection: string;
    responses: string[];
    followUp: string[];
  }>;
  closingStrategies: string[];
  fallbackPlans: string[];
}

class CommunicationAIService {

  async generateEmail(
    contact: Contact,
    purpose: 'introduction' | 'follow-up' | 'proposal' | 'nurturing' | 'reengagement',
    context?: {
      previousInteractions?: any[];
      businessContext?: string;
      urgency?: 'low' | 'medium' | 'high';
      tone?: 'formal' | 'casual' | 'friendly' | 'direct';
      length?: 'short' | 'medium' | 'long';
    }
  ): Promise<EmailGeneration> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'email_generation',
      priority: context?.urgency || 'medium',
      data: {
        contact,
        purpose,
        context
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      
      return {
        subject: response.result.subject,
        body: response.result.body,
        tone: response.result.tone || context?.tone || 'professional',
        purpose,
        personalization: response.result.personalization || {
          elements: [],
          confidence: 70
        },
        optimization: response.result.optimization || {
          subjectScore: 75,
          bodyScore: 80,
          overallScore: 78,
          improvements: []
        },
        metadata: response.result.metadata || {
          wordCount: response.result.body?.split(' ').length || 0,
          readingTime: '1-2 minutes',
          targetAudience: contact.title || 'Professional'
        }
      };
    } catch (error) {
      logger.error('Email generation failed', error as Error, { contactId: contact.id, purpose });
      throw error;
    }
  }

  async analyzeEmail(
    emailContent: {
      subject: string;
      body: string;
    },
    recipient?: Contact,
    context?: {
      purpose?: string;
      previousEmails?: any[];
    }
  ): Promise<EmailAnalysis> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'email_analysis',
      priority: 'medium',
      data: {
        emailContent,
        recipient,
        context
      },
      context: {
        contactId: recipient?.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      
      return {
        scores: response.result.scores || {
          clarity: 75,
          engagement: 70,
          professionalism: 85,
          persuasiveness: 65,
          overall: 74
        },
        toneAnalysis: response.result.toneAnalysis || {
          primary: 'professional',
          emotionalProfile: { neutral: 80, positive: 15, negative: 5 }
        },
        suggestions: response.result.suggestions || [],
        predictions: response.result.predictions || {
          responseRate: 25,
          engagementScore: 70,
          conversionProbability: 15
        },
        alternatives: response.result.alternatives || {
          subjectLines: [],
          openingLines: [],
          callsToAction: []
        }
      };
    } catch (error) {
      logger.error('Email analysis failed', error as Error);
      throw error;
    }
  }

  async generateCommunicationStrategy(
    contact: Contact,
    interactionHistory?: any[],
    businessGoals?: string[]
  ): Promise<CommunicationStrategy> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'communication_analysis',
      priority: 'medium',
      data: {
        contact,
        interactionHistory,
        businessGoals
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      
      return {
        contactId: contact.id,
        optimalChannels: response.result.optimalChannels || [
          { channel: 'email', effectiveness: 80, reasoning: ['Primary business communication'] }
        ],
        timing: response.result.timing || {
          bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
          bestHours: ['9AM-11AM', '2PM-4PM'],
          frequency: 'Weekly',
          nextOptimalContact: '2 days'
        },
        messaging: response.result.messaging || {
          preferredTone: 'professional',
          keyMessages: [],
          avoidTopics: [],
          personalizationTriggers: []
        },
        contentRecommendations: response.result.contentRecommendations || []
      };
    } catch (error) {
      logger.error('Communication strategy generation failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  async generateConversationFlow(
    contact: Contact,
    conversationType: 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'closing',
    context?: {
      salesStage?: string;
      knownObjections?: string[];
      previousConversations?: any[];
    }
  ): Promise<ConversationFlow> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'communication_analysis',
      priority: 'high',
      data: {
        contact,
        conversationType,
        context
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      
      return {
        stages: response.result.stages || [],
        objectionHandling: response.result.objectionHandling || [],
        closingStrategies: response.result.closingStrategies || [],
        fallbackPlans: response.result.fallbackPlans || []
      };
    } catch (error) {
      logger.error('Conversation flow generation failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  async optimizeEmailTiming(
    contact: Contact,
    emailContent: { subject: string; body: string },
    interactionHistory?: any[]
  ): Promise<{
    optimalSendTime: string;
    confidence: number;
    reasoning: string[];
    alternatives: Array<{
      time: string;
      effectiveness: number;
      reasoning: string;
    }>;
  }> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'communication_analysis',
      priority: 'low',
      data: {
        contact,
        emailContent,
        interactionHistory,
        analysisType: 'timing_optimization'
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      return response.result;
    } catch (error) {
      logger.error('Email timing optimization failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  async generatePersonalizedMessage(
    contact: Contact,
    platform: 'linkedin' | 'twitter' | 'sms' | 'whatsapp',
    purpose: 'connection' | 'follow-up' | 'content-share' | 'meeting-request',
    context?: {
      recentNews?: string;
      mutualConnections?: string[];
      sharedInterests?: string[];
    }
  ): Promise<{
    message: string;
    alternatives: string[];
    personalizationElements: string[];
    characterCount: number;
    optimization: {
      engagementScore: number;
      personalizationScore: number;
      platformOptimization: number;
    };
  }> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'email_generation',
      priority: 'medium',
      data: {
        contact,
        platform,
        purpose,
        context,
        messageType: 'social'
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      return response.result;
    } catch (error) {
      logger.error('Personalized message generation failed', error as Error, { 
        contactId: contact.id, 
        platform, 
        purpose 
      });
      throw error;
    }
  }

  async analyzeCommunicationEffectiveness(
    contact: Contact,
    communications: any[]
  ): Promise<{
    overallEffectiveness: number;
    channelPerformance: Record<string, number>;
    responsePatterns: {
      averageResponseTime: number;
      responseRate: number;
      bestPerformingContent: string[];
    };
    improvementAreas: string[];
    recommendations: string[];
  }> {
    const request: Omit<AIRequest, 'id'> = {
      type: 'communication_analysis',
      priority: 'medium',
      data: {
        contact,
        communications,
        analysisType: 'effectiveness'
      },
      context: {
        contactId: contact.id
      }
    };

    try {
      const response = await aiOrchestrator.executeImmediate(request);
      return response.result;
    } catch (error) {
      logger.error('Communication effectiveness analysis failed', error as Error, { contactId: contact.id });
      throw error;
    }
  }

  // Utility methods
  generateEmailSubjectVariations(originalSubject: string, count = 5): string[] {
    const variations = [];
    const baseSubject = originalSubject.toLowerCase();
    
    // Simple rule-based variations (in real implementation, this would use AI)
    if (baseSubject.includes('follow')) {
      variations.push(`Quick follow-up: ${originalSubject.replace(/follow.up/i, '')}`);
      variations.push(`Re: ${originalSubject}`);
    }
    
    if (baseSubject.includes('meeting')) {
      variations.push(`15-minute chat: ${originalSubject.replace(/meeting/i, 'discussion')}`);
      variations.push(`Quick call opportunity: ${originalSubject.replace(/meeting/i, '')}`);
    }
    
    // Add question format
    variations.push(`${originalSubject}?`);
    
    // Add urgency (sparingly)
    if (count > 3) {
      variations.push(`Important: ${originalSubject}`);
    }
    
    return variations.slice(0, count);
  }

  calculateEmailScore(emailContent: { subject: string; body: string }): number {
    let score = 50;
    
    // Subject line scoring
    const subjectLength = emailContent.subject.length;
    if (subjectLength >= 30 && subjectLength <= 50) score += 10;
    if (emailContent.subject.includes('?')) score += 5;
    
    // Body scoring
    const wordCount = emailContent.body.split(' ').length;
    if (wordCount >= 50 && wordCount <= 200) score += 10;
    if (emailContent.body.includes('?')) score += 5;
    if (emailContent.body.match(/\n\n/g)?.length >= 2) score += 5; // Paragraph breaks
    
    return Math.max(0, Math.min(100, score));
  }

  suggestCallToAction(context: { purpose: string; industry?: string; urgency?: string }): string[] {
    const actions = [];
    
    switch (context.purpose) {
      case 'introduction':
        actions.push('Would you be open to a 15-minute call?');
        actions.push('I\'d love to learn more about your current initiatives.');
        break;
      case 'follow-up':
        actions.push('What are your thoughts on the proposal?');
        actions.push('Do you have any questions I can address?');
        break;
      case 'demo':
        actions.push('Would you like to see a personalized demo?');
        actions.push('When would be a good time for a quick demo?');
        break;
    }
    
    return actions;
  }
}

export const communicationAI = new CommunicationAIService();