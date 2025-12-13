/**
import { SMARTCRM_DEFAULT_MODEL } from '../config/ai';
 * Agent Service
 * Handles agent metadata loading, run history management, and entity updates
 */

import { supabase } from './supabaseClient';
import { logger } from './logger.service';
import type {
  AgentConfig,
  AgentRun,
  AgentContext,
  AgentExecutionResult
} from '../types/agent';

export class AgentService {
  private static instance: AgentService;

  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  /**
   * Load agent metadata by ID
   */
  async loadAgentMetadata(agentId: string): Promise<AgentConfig | null> {
    try {
      logger.info('Loading agent metadata', { agentId });

      const { data, error } = await supabase
        .from('agent_metadata')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) {
        console.warn('Failed to load agent metadata:', error);
        return null;
      }

      if (!data) {
        console.warn('Agent metadata not found:', agentId);
        return null;
      }

      const agentConfig: AgentConfig = {
        id: data.id,
        name: data.name,
        description: data.description,
        tools: data.tools || [],
        input_schema: data.input_schema || {},
        output_schema: data.output_schema || {},
        recommended_ui_placement: data.recommended_ui_placement || '',
        trigger_options: data.trigger_options || {},
        prompt_template: data.prompt_template,
        instructions: data.instructions,
        model: data.model || SMARTCRM_DEFAULT_MODEL,
        reasoning_effort: data.reasoning_effort || 'medium',
        verbosity: data.verbosity || 'medium',
        max_output_tokens: data.max_output_tokens
      };

      logger.info('Agent metadata loaded successfully', { agentId, name: agentConfig.name });
      return agentConfig;
    } catch (error) {
      console.error('Error loading agent metadata:', error);
      return null;
    }
  }

  /**
   * Load agent metadata by name
   */
  async loadAgentByName(name: string): Promise<AgentConfig | null> {
    try {
      logger.info('Loading agent metadata by name', { name });

      const { data, error } = await supabase
        .from('agent_metadata')
        .select('*')
        .eq('name', name)
        .single();

      if (error) {
        console.warn('Failed to load agent metadata by name:', error);
        return null;
      }

      return data ? this.mapAgentMetadataToConfig(data) : null;
    } catch (error) {
      console.error('Error loading agent metadata by name:', error);
      return null;
    }
  }

  /**
   * Load all agent metadata
   */
  async loadAllAgents(): Promise<AgentConfig[]> {
    try {
      logger.info('Loading all agent metadata');

      const { data, error } = await supabase
        .from('agent_metadata')
        .select('*')
        .order('name');

      if (error) {
        console.error('Failed to load all agents:', error);
        return [];
      }

      const agents = data?.map(this.mapAgentMetadataToConfig) || [];
      logger.info('All agents loaded', { count: agents.length });
      return agents;
    } catch (error) {
      console.error('Error loading all agents:', error);
      return [];
    }
  }

  /**
   * Save agent run history
   */
  async saveAgentRun(run: Omit<AgentRun, 'id' | 'created_at'>): Promise<AgentRun | null> {
    try {
      logger.info('Saving agent run', {
        agentId: run.agent_id,
        status: run.status,
        contactId: run.contact_id,
        dealId: run.deal_id
      });

      const { data, error } = await supabase
        .from('agent_runs')
        .insert({
          agent_id: run.agent_id,
          contact_id: run.contact_id,
          deal_id: run.deal_id,
          user_id: run.user_id,
          input_data: run.input_data,
          output_data: run.output_data,
          tool_calls: run.tool_calls,
          status: run.status,
          error_message: run.error_message,
          execution_time_ms: run.execution_time_ms,
          tokens_used: run.tokens_used,
          completed_at: run.completed_at
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save agent run:', error);
        return null;
      }

      logger.info('Agent run saved successfully', { runId: data.id, status: data.status });
      return data as AgentRun;
    } catch (error) {
      console.error('Error saving agent run:', error);
      return null;
    }
  }

  /**
   * Update agent run status
   */
  async updateAgentRun(runId: string, updates: Partial<AgentRun>): Promise<boolean> {
    try {
      logger.info('Updating agent run', { runId, updates: Object.keys(updates) });

      const { error } = await supabase
        .from('agent_runs')
        .update({
          status: updates.status,
          output_data: updates.output_data,
          tool_calls: updates.tool_calls,
          error_message: updates.error_message,
          execution_time_ms: updates.execution_time_ms,
          tokens_used: updates.tokens_used,
          completed_at: updates.completed_at
        })
        .eq('id', runId);

      if (error) {
        console.error('Failed to update agent run:', error);
        return false;
      }

      logger.info('Agent run updated successfully', { runId });
      return true;
    } catch (error) {
      console.error('Error updating agent run:', error);
      return false;
    }
  }

  /**
   * Load agent run history
   */
  async loadAgentRuns(
    agentId?: string,
    contactId?: string,
    dealId?: string,
    limit = 50
  ): Promise<AgentRun[]> {
    try {
      logger.info('Loading agent runs', { agentId, contactId, dealId, limit });

      let query = supabase
        .from('agent_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (agentId) query = query.eq('agent_id', agentId);
      if (contactId) query = query.eq('contact_id', contactId);
      if (dealId) query = query.eq('deal_id', dealId);

      const { data, error } = await query;

      if (error) {
        console.error('Failed to load agent runs:', error);
        return [];
      }

      logger.info('Agent runs loaded', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      console.error('Error loading agent runs:', error);
      return [];
    }
  }

  /**
   * Apply agent outputs to update contacts and deals
   */
  async applyAgentOutputs(result: AgentExecutionResult): Promise<void> {
    try {
      logger.info('Applying agent outputs', {
        runId: result.run.id,
        contactUpdates: result.updates.contacts?.length || 0,
        dealUpdates: result.updates.deals?.length || 0,
        insights: result.updates.insights?.length || 0,
        tags: result.updates.tags?.length || 0,
        tasks: result.updates.tasks?.length || 0
      });

      // Update contacts
      if (result.updates.contacts?.length) {
        for (const contactUpdate of result.updates.contacts) {
          await this.updateContact(contactUpdate.id, contactUpdate.updates);
        }
      }

      // Update deals
      if (result.updates.deals?.length) {
        for (const dealUpdate of result.updates.deals) {
          await this.updateDeal(dealUpdate.id, dealUpdate.updates);
        }
      }

      // Create insights
      if (result.updates.insights?.length) {
        await this.createInsights(result.updates.insights);
      }

      // Add tags
      if (result.updates.tags?.length) {
        await this.addTags(result.updates.tags);
      }

      // Create tasks
      if (result.updates.tasks?.length) {
        await this.createTasks(result.updates.tasks, result.run.user_id);
      }

      logger.info('Agent outputs applied successfully');
    } catch (error) {
      console.error('Error applying agent outputs:', error);
      throw error;
    }
  }

  /**
   * Gather context data for agent execution
   */
  async gatherContext(
    userId: string,
    contactId?: string,
    dealId?: string
  ): Promise<AgentContext> {
    const context: AgentContext = {};

    try {
      // Load contact data
      if (contactId) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', contactId)
          .single();
        if (contact) context.contact = contact;
      }

      // Load deal data
      if (dealId) {
        const { data: deal } = await supabase
          .from('deals')
          .select('*')
          .eq('id', dealId)
          .single();
        if (deal) context.deal = deal;
      }

      // Load journey history (simplified - would need actual journey table)
      context.journey_history = [];

      // Load prior agent runs
      context.prior_runs = await this.loadAgentRuns(undefined, contactId, dealId, 10);

      // Load analytics (placeholder - would integrate with analytics service)
      context.analytics = {};

      logger.info('Context gathered successfully', {
        hasContact: !!context.contact,
        hasDeal: !!context.deal,
        priorRuns: context.prior_runs?.length || 0
      });

    } catch (error) {
      console.error('Error gathering context:', error);
    }

    return context;
  }

  private mapAgentMetadataToConfig(data: any): AgentConfig {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      tools: data.tools || [],
      input_schema: data.input_schema || {},
      output_schema: data.output_schema || {},
      recommended_ui_placement: data.recommended_ui_placement || '',
      trigger_options: data.trigger_options || {},
      prompt_template: data.prompt_template,
      instructions: data.instructions,
      model: data.model || SMARTCRM_DEFAULT_MODEL,
      reasoning_effort: data.reasoning_effort || 'medium',
      verbosity: data.verbosity || 'medium',
      max_output_tokens: data.max_output_tokens
    };
  }

  private async updateContact(contactId: string, updates: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contactId);

    if (error) {
      console.error('Failed to update contact:', error);
      throw error;
    }
  }

  private async updateDeal(dealId: string, updates: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', dealId);

    if (error) {
      console.error('Failed to update deal:', error);
      throw error;
    }
  }

  private async createInsights(insights: Array<{ type: string; data: Record<string, any> }>): Promise<void> {
    // Placeholder - would need insights table
    logger.info('Insights creation placeholder', { count: insights.length });
  }

  private async addTags(tags: Array<{ entity_type: 'contact' | 'deal'; entity_id: string; tag: string }>): Promise<void> {
    // Placeholder - would need tags table
    logger.info('Tags addition placeholder', { count: tags.length });
  }

  private async createTasks(
    tasks: Array<{ title: string; description?: string; due_date?: string; priority?: string; assigned_to?: string }>,
    userId: string
  ): Promise<void> {
    // Placeholder - would need tasks table
    logger.info('Tasks creation placeholder', { count: tasks.length });
  }
}

export const agentService = AgentService.getInstance();