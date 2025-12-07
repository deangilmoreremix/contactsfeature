/**
 * SDR Preferences Service
 * Handles saving, loading, and managing user preferences for SDR agents
 */

import { supabase } from '../lib/supabase';
import {
  SDRUserPreferences,
  SDRCampaignTemplate,
  SDRAgentPerformance,
  createDefaultPreferences,
  validatePreferences
} from '../types/sdr-preferences';

export class SDRPreferencesService {
  /**
   * Load user preferences for a specific SDR agent
   */
  static async loadUserPreferences(
    userId: string,
    agentId: string
  ): Promise<SDRUserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('sdr_user_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, return null to use defaults
          return null;
        }
        throw error;
      }

      // Transform database format to TypeScript interface
      const preferences: SDRUserPreferences = {
        userId: data.user_id,
        agentId: data.agent_id,
        campaignLength: data.campaign_length,
        messageDelay: data.message_delay,
        tone: data.tone,
        personalizationLevel: data.personalization_level,
        channels: data.channels,
        primaryChannel: data.primary_channel,
        successCriteria: data.success_criteria,
        customPrompts: data.custom_prompts,
        followUpRules: data.follow_up_rules,
        branding: data.branding,
        aiSettings: data.ai_settings,
        timingRules: data.timing_rules,
        objectionHandling: data.objection_handling,
        competitorStrategy: data.competitor_strategy
      };

      return preferences;
    } catch (error) {
      console.error('Failed to load SDR user preferences:', error);
      return null;
    }
  }

  /**
   * Save user preferences for a specific SDR agent
   */
  static async saveUserPreferences(
    userId: string,
    preferences: SDRUserPreferences
  ): Promise<SDRUserPreferences> {
    // Validate preferences before saving
    const validationErrors = validatePreferences(preferences);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid preferences: ${validationErrors.join(', ')}`);
    }

    try {
      // Transform TypeScript interface to database format
      const dbData = {
        user_id: userId,
        agent_id: preferences.agentId,
        campaign_length: preferences.campaignLength,
        message_delay: preferences.messageDelay,
        tone: preferences.tone,
        personalization_level: preferences.personalizationLevel,
        channels: preferences.channels,
        primary_channel: preferences.primaryChannel,
        success_criteria: preferences.successCriteria,
        custom_prompts: preferences.customPrompts,
        follow_up_rules: preferences.followUpRules,
        branding: preferences.branding,
        ai_settings: preferences.aiSettings,
        timing_rules: preferences.timingRules,
        objection_handling: preferences.objectionHandling,
        competitor_strategy: preferences.competitorStrategy,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('sdr_user_preferences')
        .upsert(dbData, {
          onConflict: 'user_id,agent_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Return the saved preferences
      return preferences;
    } catch (error) {
      console.error('Failed to save SDR user preferences:', error);
      throw new Error('Failed to save preferences. Please try again.');
    }
  }

  /**
   * Get default preferences for an agent (without saving to database)
   */
  static getDefaultPreferences(
    userId: string,
    agentId: string
  ): SDRUserPreferences {
    return createDefaultPreferences(userId, agentId);
  }

  /**
   * Reset preferences to defaults for a specific agent
   */
  static async resetToDefaults(
    userId: string,
    agentId: string
  ): Promise<SDRUserPreferences> {
    try {
      // Delete existing preferences
      const { error: deleteError } = await supabase
        .from('sdr_user_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('agent_id', agentId);

      if (deleteError) {
        throw deleteError;
      }

      // Return default preferences
      return createDefaultPreferences(userId, agentId);
    } catch (error) {
      console.error('Failed to reset SDR preferences to defaults:', error);
      throw new Error('Failed to reset preferences. Please try again.');
    }
  }

  /**
   * Load all user preferences for all agents
   */
  static async loadAllUserPreferences(userId: string): Promise<Record<string, SDRUserPreferences>> {
    try {
      const { data, error } = await supabase
        .from('sdr_user_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Transform to a record keyed by agentId
      const preferences: Record<string, SDRUserPreferences> = {};

      data.forEach(row => {
        preferences[row.agent_id] = {
          userId: row.user_id,
          agentId: row.agent_id,
          campaignLength: row.campaign_length,
          messageDelay: row.message_delay,
          tone: row.tone,
          personalizationLevel: row.personalization_level,
          channels: row.channels,
          primaryChannel: row.primary_channel,
          successCriteria: row.success_criteria,
          customPrompts: row.custom_prompts,
          followUpRules: row.follow_up_rules,
          branding: row.branding,
          aiSettings: row.ai_settings,
          timingRules: row.timing_rules,
          objectionHandling: row.objection_handling,
          competitorStrategy: row.competitor_strategy
        };
      });

      return preferences;
    } catch (error) {
      console.error('Failed to load all SDR user preferences:', error);
      return {};
    }
  }

  /**
   * Campaign Templates Management
   */

  /**
   * Save a campaign template
   */
  static async saveCampaignTemplate(
    userId: string,
    template: Omit<SDRCampaignTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ): Promise<SDRCampaignTemplate> {
    try {
      const dbData = {
        user_id: userId,
        name: template.name,
        description: template.description,
        agent_id: template.agentId,
        tags: template.tags,
        is_public: template.isPublic,
        sequence: template.sequence,
        settings: template.settings
      };

      const { data, error } = await supabase
        .from('sdr_campaign_templates')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        agentId: data.agent_id,
        tags: data.tags,
        isPublic: data.is_public,
        sequence: data.sequence,
        settings: data.settings,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        usageCount: data.usage_count
      };
    } catch (error) {
      console.error('Failed to save campaign template:', error);
      throw new Error('Failed to save campaign template. Please try again.');
    }
  }

  /**
   * Load user's campaign templates
   */
  static async loadUserTemplates(userId: string): Promise<SDRCampaignTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('sdr_campaign_templates')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        agentId: row.agent_id,
        tags: row.tags,
        isPublic: row.is_public,
        sequence: row.sequence,
        settings: row.settings,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        usageCount: row.usage_count
      }));
    } catch (error) {
      console.error('Failed to load user campaign templates:', error);
      return [];
    }
  }

  /**
   * Load public campaign templates
   */
  static async loadPublicTemplates(): Promise<SDRCampaignTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('sdr_campaign_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        agentId: row.agent_id,
        tags: row.tags,
        isPublic: row.is_public,
        sequence: row.sequence,
        settings: row.settings,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        usageCount: row.usage_count
      }));
    } catch (error) {
      console.error('Failed to load public campaign templates:', error);
      return [];
    }
  }

  /**
   * Performance Tracking
   */

  /**
   * Save performance metrics for an agent campaign
   */
  static async savePerformanceMetrics(
    userId: string,
    performance: Omit<SDRAgentPerformance, 'id' | 'createdAt'>
  ): Promise<void> {
    try {
      const dbData = {
        user_id: userId,
        agent_id: performance.agentId,
        campaign_id: performance.campaignId,
        template_id: performance.templateId,
        metrics: performance.metrics,
        timing: performance.timing,
        rates: performance.rates,
        channel_performance: performance.channelPerformance,
        time_analytics: performance.timeAnalytics,
        period_start: performance.period.start,
        period_end: performance.period.end
      };

      const { error } = await supabase
        .from('sdr_agent_performance')
        .insert(dbData);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
      throw new Error('Failed to save performance metrics. Please try again.');
    }
  }

  /**
   * Load performance metrics for a user
   */
  static async loadPerformanceMetrics(
    userId: string,
    agentId?: string,
    limit: number = 50
  ): Promise<SDRAgentPerformance[]> {
    try {
      let query = supabase
        .from('sdr_agent_performance')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(row => ({
        id: row.id,
        userId: row.user_id,
        agentId: row.agent_id,
        campaignId: row.campaign_id,
        templateId: row.template_id,
        metrics: row.metrics,
        timing: row.timing,
        rates: row.rates,
        channelPerformance: row.channel_performance,
        timeAnalytics: row.time_analytics,
        createdAt: row.created_at,
        period: {
          start: row.period_start,
          end: row.period_end
        }
      }));
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
      return [];
    }
  }

  /**
   * Utility Functions
   */

  /**
   * Check if user has custom preferences for an agent
   */
  static async hasCustomPreferences(userId: string, agentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('sdr_user_preferences')
        .select('id')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get preferences with fallback to defaults
   */
  static async getPreferencesWithDefaults(
    userId: string,
    agentId: string
  ): Promise<SDRUserPreferences> {
    const customPrefs = await this.loadUserPreferences(userId, agentId);
    return customPrefs || createDefaultPreferences(userId, agentId);
  }
}