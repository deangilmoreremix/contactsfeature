// src/services/agentWorkflowIntegration.ts

import { supabase } from './supabaseClient';
import { triggerAutopilot } from './autopilotService';

export interface WorkflowTrigger {
  contactId: string;
  triggerType: 'manual' | 'automated' | 'event_based';
  agentId?: string;
  personaId?: string;
  sequenceConfig?: SequenceConfig;
}

export interface SequenceConfig {
  length: number;
  channels: ('email' | 'linkedin' | 'sms')[];
  delays: number[]; // days between steps
  conditions?: SequenceCondition[];
}

export interface SequenceCondition {
  step: number;
  condition: 'no_response' | 'positive_reply' | 'objection' | 'meeting_booked';
  action: 'continue' | 'switch_agent' | 'pause' | 'escalate';
}

/**
 * Integrates SDR agents into sales workflows
 */
export class AgentWorkflowIntegration {

  /**
   * Trigger agent sequence for new lead qualification
   */
  static async handleNewLead(contactId: string, leadSource: string) {
    const contact = await this.getContact(contactId);

    // Determine initial agent based on lead source and contact data
    const agentConfig = this.determineInitialAgent(contact, leadSource);

    // Start qualification sequence
    await this.startSequence(contactId, {
      triggerType: 'automated',
      agentId: agentConfig.agentId,
      personaId: agentConfig.personaId,
      sequenceConfig: agentConfig.sequence
    });

    // Log workflow initiation
    await this.logWorkflowEvent(contactId, 'sequence_started', {
      leadSource,
      initialAgent: agentConfig.agentId,
      sequenceLength: agentConfig.sequence.length
    });
  }

  /**
   * Handle contact engagement events
   */
  static async handleEngagement(contactId: string, eventType: string, eventData: any) {
    const contact = await this.getContact(contactId);

    switch (eventType) {
      case 'email_opened':
        await this.handleEmailOpened(contact, eventData);
        break;
      case 'email_replied':
        await this.handleEmailReplied(contact, eventData);
        break;
      case 'meeting_booked':
        await this.handleMeetingBooked(contact, eventData);
        break;
      case 'objection_raised':
        await this.handleObjection(contact, eventData);
        break;
    }
  }

  /**
   * Escalate high-value contacts to AE agents
   */
  static async escalateToAE(contactId: string, reason: string) {
    const contact = await this.getContact(contactId);

    // Switch to AE agent
    await supabase
      .from('contacts')
      .update({
        assigned_agent: 'ae_agent',
        agent_status: 'escalated',
        escalated_at: new Date().toISOString(),
        escalation_reason: reason
      })
      .eq('id', contactId);

    // Trigger AE workflow
    await this.startAEWorkflow(contactId, reason);

    await this.logWorkflowEvent(contactId, 'escalated_to_ae', { reason });
  }

  /**
   * Analyze agent performance and optimize sequences
   */
  static async analyzePerformance(contactId: string) {
    const metrics = await this.getAgentMetrics(contactId);

    // Calculate success rates
    const successRate = this.calculateSuccessRate(metrics);

    // Identify optimal sequences
    const recommendations = this.generateOptimizationRecommendations(metrics, successRate);

    // Auto-optimize if performance is poor
    if (successRate < 0.3) {
      await this.optimizeSequence(contactId, recommendations);
    }

    return {
      metrics,
      successRate,
      recommendations,
      optimizationApplied: successRate < 0.3
    };
  }

  // Private helper methods

  private static async getContact(contactId: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error) throw error;
    return data;
  }

  private static determineInitialAgent(contact: any, leadSource: string) {
    // Logic to determine best initial agent based on contact and source
    if (leadSource === 'linkedin') {
      return {
        agentId: 'linkedin_sdr',
        personaId: 'relationship_builder',
        sequence: {
          length: 3,
          channels: ['linkedin', 'email'],
          delays: [0, 5, 12]
        }
      };
    }

    if (contact.industry === 'technology' && contact.title?.includes('CTO')) {
      return {
        agentId: 'high_intent_sdr',
        personaId: 'strategic_advisor',
        sequence: {
          length: 5,
          channels: ['email', 'linkedin'],
          delays: [0, 3, 7, 14, 30]
        }
      };
    }

    // Default cold email approach
    return {
      agentId: 'cold_email_sdr',
      personaId: 'consultative_advisor',
      sequence: {
        length: 4,
        channels: ['email'],
        delays: [0, 4, 9, 16]
      }
    };
  }

  private static async startSequence(contactId: string, trigger: WorkflowTrigger) {
    const result = await triggerAutopilot({
      contactId,
      agentId: trigger.agentId,
      personaId: trigger.personaId,
      sequenceConfig: trigger.sequenceConfig
    });

    // Store sequence tracking
    await supabase
      .from('agent_sequences')
      .insert({
        contact_id: contactId,
        agent_id: trigger.agentId,
        persona_id: trigger.personaId,
        sequence_config: trigger.sequenceConfig,
        current_step: 1,
        status: 'active',
        started_at: new Date().toISOString()
      });
  }

  private static async handleEmailOpened(contact: any, eventData: any) {
    // Increase engagement score
    await this.updateEngagementScore(contact.id, 10);

    // Schedule follow-up if not already sent
    const nextStep = await this.getNextSequenceStep(contact.id);
    if (nextStep && nextStep.condition === 'no_response') {
      await this.advanceSequence(contact.id);
    }
  }

  private static async handleEmailReplied(contact: any, eventData: any) {
    // Analyze reply sentiment
    const sentiment = await this.analyzeReplySentiment(eventData.replyContent);

    if (sentiment === 'positive') {
      // Escalate to high-intent agent
      await this.switchAgent(contact.id, 'high_intent_sdr', 'relationship_builder');
    } else if (sentiment === 'objection') {
      // Switch to objection handler
      await this.switchAgent(contact.id, 'objection_sdr', 'problem_solver');
    }
  }

  private static async handleMeetingBooked(contact: any, eventData: any) {
    // Mark as won and escalate to AE
    await this.escalateToAE(contact.id, 'meeting_booked');
  }

  private static async handleObjection(contact: any, eventData: any) {
    // Switch to objection-handling agent
    await this.switchAgent(contact.id, 'objection_sdr', 'challenger_seller');
  }

  private static async switchAgent(contactId: string, agentId: string, personaId: string) {
    await supabase
      .from('contacts')
      .update({
        assigned_agent: agentId,
        assigned_persona: personaId,
        agent_switched_at: new Date().toISOString()
      })
      .eq('id', contactId);

    await this.logWorkflowEvent(contactId, 'agent_switched', { agentId, personaId });
  }

  private static async advanceSequence(contactId: string) {
    const { data: sequence } = await supabase
      .from('agent_sequences')
      .select('*')
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .single();

    if (sequence) {
      const nextStep = sequence.current_step + 1;
      if (nextStep <= sequence.sequence_config.length) {
        await supabase
          .from('agent_sequences')
          .update({ current_step: nextStep })
          .eq('id', sequence.id);
      } else {
        // Sequence complete
        await supabase
          .from('agent_sequences')
          .update({ status: 'completed' })
          .eq('id', sequence.id);
      }
    }
  }

  private static async getAgentMetrics(contactId: string) {
    // Get all agent interactions for this contact
    const { data: interactions } = await supabase
      .from('agent_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    // Calculate metrics
    const metrics = {
      totalInteractions: interactions.length,
      responseRate: 0,
      conversionRate: 0,
      averageResponseTime: 0,
      agentPerformance: {}
    };

    // Calculate response rate
    const responses = interactions.filter(i => i.response_received);
    metrics.responseRate = responses.length / interactions.length;

    // Calculate conversion rate (meetings booked)
    const conversions = interactions.filter(i => i.conversion_type === 'meeting_booked');
    metrics.conversionRate = conversions.length / interactions.length;

    return metrics;
  }

  private static calculateSuccessRate(metrics: any): number {
    // Weighted success score
    return (metrics.responseRate * 0.4) + (metrics.conversionRate * 0.6);
  }

  private static generateOptimizationRecommendations(metrics: any, successRate: number) {
    const recommendations = [];

    if (metrics.responseRate < 0.2) {
      recommendations.push({
        type: 'sequence_optimization',
        action: 'reduce_delays',
        reason: 'Low response rate suggests messages are too spaced out'
      });
    }

    if (successRate < 0.3) {
      recommendations.push({
        type: 'agent_switch',
        action: 'try_different_persona',
        reason: 'Current persona may not resonate with contact'
      });
    }

    return recommendations;
  }

  private static async optimizeSequence(contactId: string, recommendations: any[]) {
    for (const rec of recommendations) {
      if (rec.type === 'sequence_optimization' && rec.action === 'reduce_delays') {
        // Reduce delays between sequence steps
        await supabase
          .from('agent_sequences')
          .update({
            'sequence_config.delays': [0, 2, 5, 10] // Shorter delays
          })
          .eq('contact_id', contactId);
      }
    }
  }

  private static async startAEWorkflow(contactId: string, reason: string) {
    // Implementation for AE workflow
    console.log(`Starting AE workflow for ${contactId}: ${reason}`);
  }

  private static async analyzeReplySentiment(content: string): Promise<string> {
    // Simple sentiment analysis - in production, use AI service
    const positiveWords = ['yes', 'interested', 'great', 'good', 'sure'];
    const objectionWords = ['budget', 'timing', 'not ready', 'competitor', 'no'];

    const lowerContent = content.toLowerCase();

    if (positiveWords.some(word => lowerContent.includes(word))) {
      return 'positive';
    }
    if (objectionWords.some(word => lowerContent.includes(word))) {
      return 'objection';
    }
    return 'neutral';
  }

  private static async updateEngagementScore(contactId: string, points: number) {
    await supabase.rpc('increment_engagement_score', {
      contact_id: contactId,
      points
    });
  }

  private static async getNextSequenceStep(contactId: string) {
    const { data } = await supabase
      .from('agent_sequences')
      .select('current_step, sequence_config')
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .single();

    return data;
  }

  private static async logWorkflowEvent(contactId: string, eventType: string, data: any) {
    await supabase
      .from('workflow_events')
      .insert({
        contact_id: contactId,
        event_type: eventType,
        event_data: data,
        created_at: new Date().toISOString()
      });
  }
}