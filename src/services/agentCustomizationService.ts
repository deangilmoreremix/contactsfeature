// src/services/agentCustomizationService.ts

import { supabase } from './supabaseClient';

export interface AgentCustomization {
  agentId: string;
  customPrompts: {
    systemPrompt?: string;
    userPromptTemplate?: string;
    toneAdjustments?: Record<string, any>;
  };
  behaviorRules: {
    maxMessagesPerDay?: number;
    followUpDelays?: number[];
    channelPreferences?: string[];
    objectionHandling?: Record<string, string>;
  };
  performanceThresholds: {
    minResponseRate?: number;
    maxSendFrequency?: number;
    autoOptimization?: boolean;
  };
}

/**
 * Service for customizing SDR agent behavior
 */
export class AgentCustomizationService {

  /**
   * Customize agent prompts and behavior
   */
  static async customizeAgent(agentId: string, customization: Partial<AgentCustomization>) {
    const existing = await this.getAgentCustomization(agentId);

    const updated = {
      ...existing,
      ...customization,
      updatedAt: new Date().toISOString()
    };

    const { error } = await supabase
      .from('agent_customizations')
      .upsert({
        agent_id: agentId,
        customization_data: updated,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return updated;
  }

  /**
   * Get agent customization settings
   */
  static async getAgentCustomization(agentId: string): Promise<AgentCustomization> {
    const { data, error } = await supabase
      .from('agent_customizations')
      .select('customization_data')
      .eq('agent_id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data?.customization_data || this.getDefaultCustomization(agentId);
  }

  /**
   * Apply customization to email composer
   */
  static async applyCustomizationToComposer(
    agentId: string,
    contact: any,
    type: string,
    tone: string,
    context?: string
  ) {
    const customization = await this.getAgentCustomization(agentId);

    // Modify system prompt
    let systemPrompt = this.getBaseSystemPrompt(agentId, tone);
    if (customization.customPrompts?.systemPrompt) {
      systemPrompt = customization.customPrompts.systemPrompt;
    }

    // Modify user prompt template
    let userPrompt = this.buildUserPrompt(contact, type, context, customization);
    if (customization.customPrompts?.userPromptTemplate) {
      userPrompt = this.interpolateTemplate(
        customization.customPrompts.userPromptTemplate,
        { contact, type, context, tone }
      );
    }

    // Apply tone adjustments
    if (customization.customPrompts?.toneAdjustments?.[tone]) {
      const adjustments = customization.customPrompts.toneAdjustments[tone];
      systemPrompt = this.applyToneAdjustments(systemPrompt, adjustments);
    }

    return { systemPrompt, userPrompt };
  }

  /**
   * Customize objection handling
   */
  static async customizeObjectionHandling(agentId: string, objectionRules: Record<string, string>) {
    await this.customizeAgent(agentId, {
      behaviorRules: {
        objectionHandling: objectionRules
      }
    });
  }

  /**
   * Set performance thresholds for auto-optimization
   */
  static async setPerformanceThresholds(agentId: string, thresholds: AgentCustomization['performanceThresholds']) {
    await this.customizeAgent(agentId, {
      performanceThresholds: thresholds
    });
  }

  /**
   * Create industry-specific agent variant
   */
  static async createIndustryVariant(baseAgentId: string, industry: string): Promise<string> {
    const variantId = `${baseAgentId}_${industry.toLowerCase()}`;

    const industryCustomizations: Partial<AgentCustomization> = {
      customPrompts: {
        systemPrompt: `You are an expert SDR specializing in the ${industry} industry. You understand the unique challenges, terminology, and decision-making processes specific to ${industry} companies.`,
        userPromptTemplate: `Generate a ${industry}-focused message for {contact.name} at {contact.company}.

Industry Context: {contact.industry}
Company Size: {contact.companySize}
Key Pain Points: Consider ${industry}-specific challenges like [industry-specific pain points]

{context}

Focus on ${industry} industry trends and solutions.`
      },
      behaviorRules: {
        channelPreferences: industry === 'technology' ? ['linkedin', 'email'] : ['email', 'phone']
      }
    };

    await this.customizeAgent(variantId, industryCustomizations);
    return variantId;
  }

  /**
   * A/B test different agent approaches
   */
  static async createABTest(
    agentId: string,
    testName: string,
    variants: Array<{ name: string; customization: Partial<AgentCustomization> }>
  ) {
    const testConfig = {
      testName,
      variants: variants.map(variant => ({
        name: variant.name,
        customization: variant.customization,
        trafficPercentage: Math.floor(100 / variants.length)
      })),
      startDate: new Date().toISOString(),
      status: 'active'
    };

    await supabase
      .from('agent_ab_tests')
      .insert({
        agent_id: agentId,
        test_config: testConfig,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Get winning variant from A/B test
   */
  static async getABTestWinner(agentId: string, testName: string) {
    const { data: test } = await supabase
      .from('agent_ab_tests')
      .select('*')
      .eq('agent_id', agentId)
      .eq('test_config->>testName', testName)
      .single();

    if (!test) return null;

    // Analyze performance data to determine winner
    const variants = test.test_config.variants;
    const performanceData = await this.getVariantPerformance(agentId, variants);

    return performanceData.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    );
  }

  // Private helper methods

  private static getDefaultCustomization(agentId: string): AgentCustomization {
    const defaults: Record<string, AgentCustomization> = {
      cold_email_sdr: {
        agentId: 'cold_email_sdr',
        customPrompts: {
          systemPrompt: 'You are an expert cold email SDR who creates compelling first-touch outreach.'
        },
        behaviorRules: {
          maxMessagesPerDay: 50,
          followUpDelays: [0, 4, 9, 16],
          channelPreferences: ['email']
        },
        performanceThresholds: {
          minResponseRate: 0.05,
          autoOptimization: true
        }
      },
      objection_sdr: {
        agentId: 'objection_sdr',
        customPrompts: {
          systemPrompt: 'You are a master objection handler who addresses concerns and moves deals forward.'
        },
        behaviorRules: {
          objectionHandling: {
            price: 'Focus on ROI and long-term value',
            timing: 'Offer flexible terms and quick implementation',
            authority: 'Provide case studies and social proof'
          }
        },
        performanceThresholds: {
          minResponseRate: 0.15
        }
      }
    };

    return defaults[agentId] || {
      agentId,
      customPrompts: {},
      behaviorRules: {},
      performanceThresholds: {}
    };
  }

  private static getBaseSystemPrompt(agentId: string, tone: string): string {
    const basePrompts: Record<string, string> = {
      cold_email_sdr: `You are an expert cold email copywriter specializing in B2B sales communication. Generate professional, personalized emails that drive engagement and conversions. Use ${tone} tone and focus on introduction style communication.`,
      followup_sdr: `You are a strategic follow-up specialist who creates timely, relevant messages based on previous interactions. Use ${tone} tone and focus on nurturing relationships.`,
      objection_sdr: `You are a master objection handler who addresses concerns with empathy and logic. Use ${tone} tone and focus on overcoming barriers to move deals forward.`
    };

    return basePrompts[agentId] || `You are an SDR agent using ${tone} tone.`;
  }

  private static buildUserPrompt(contact: any, type: string, context: string, customization: AgentCustomization): string {
    return `Generate a ${customization.customPrompts?.toneAdjustments?.[type] || type} message for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Email: ${contact.email}
Industry: ${contact.industry || 'Not specified'}

${context ? `Context: ${context}` : ''}

Requirements:
- Compelling subject line (if email)
- Personalized greeting
- Clear value proposition
- Specific call-to-action
- Professional sign-off

Make it highly personalized and effective.`;
  }

  private static interpolateTemplate(template: string, variables: any): string {
    let result = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, variables[key]);
    });
    return result;
  }

  private static applyToneAdjustments(prompt: string, adjustments: any): string {
    // Apply tone-specific modifications
    if (adjustments.morePersonal) {
      prompt += ' Be more conversational and personal.';
    }
    if (adjustments.moreUrgent) {
      prompt += ' Create a sense of urgency without being pushy.';
    }
    return prompt;
  }

  private static async getVariantPerformance(agentId: string, variants: any[]) {
    // Implementation to get performance metrics for each variant
    // This would query the database for actual performance data
    return variants.map(variant => ({
      name: variant.name,
      responseRate: Math.random() * 0.3, // Mock data
      conversionRate: Math.random() * 0.15
    }));
  }
}