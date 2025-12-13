/**
 * SDR State Helpers
 * Manages Supabase tables for agent threads and autopilot state
 */

import { supabase } from "../../lib/supabase";
import { openai } from "../../lib/core/openaiClient";

export interface AutopilotState {
  leadId: string;
  agentType: string;
  stateJson: any;
  status: 'active' | 'paused' | 'stopped' | 'completed';
}

/**
 * Get or create a thread for a lead's SDR Autopilot
 */
export async function getOrCreateThreadForLead(leadId: string): Promise<string> {
  try {
    // Check if thread already exists for this lead
    const { data: existingThread, error: fetchError } = await supabase
      .from('agent_threads')
      .select('thread_id')
      .eq('lead_id', leadId)
      .eq('agent_type', 'sdr_autopilot')
      .single();

    if (existingThread && !fetchError) {
      return existingThread.thread_id;
    }

    // Create new OpenAI thread
    const thread = await openai.beta.threads.create();

    // Store thread reference in Supabase
    const { error: insertError } = await supabase
      .from('agent_threads')
      .insert({
        lead_id: leadId,
        thread_id: thread.id,
        agent_type: 'sdr_autopilot',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to store thread reference:', insertError);
      throw insertError;
    }

    return thread.id;
  } catch (error) {
    console.error('Error in getOrCreateThreadForLead:', error);
    throw error;
  }
}

/**
 * Save the current SDR Autopilot state for a lead
 */
export async function saveAutopilotState(params: {
  leadId: string;
  stateJson: string;
  status?: 'active' | 'paused' | 'stopped' | 'completed';
}): Promise<void> {
  try {
    const { leadId, stateJson, status = 'active' } = params;

    // Parse and validate state JSON
    let parsedState;
    try {
      parsedState = JSON.parse(stateJson);
    } catch (parseError) {
      console.error('Invalid state JSON:', parseError);
      throw new Error('Invalid state JSON format');
    }

    // Upsert into autopilot_state table
    const { error } = await supabase
      .from('autopilot_state')
      .upsert({
        lead_id: leadId,
        agent_type: 'sdr_autopilot',
        state_json: parsedState,
        status: status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lead_id,agent_type'
      });

    if (error) {
      console.error('Failed to save autopilot state:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in saveAutopilotState:', error);
    throw error;
  }
}

/**
 * Get the current SDR Autopilot state for a lead
 */
export async function getAutopilotState(leadId: string): Promise<{
  state: any;
  status: string;
} | null> {
  try {
    const { data, error } = await supabase
      .from('autopilot_state')
      .select('state_json, status')
      .eq('lead_id', leadId)
      .eq('agent_type', 'sdr_autopilot')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      console.error('Failed to fetch autopilot state:', error);
      throw error;
    }

    return {
      state: data.state_json,
      status: data.status
    };
  } catch (error) {
    console.error('Error in getAutopilotState:', error);
    throw error;
  }
}

/**
 * Update autopilot status for a lead
 */
export async function updateAutopilotStatus(
  leadId: string,
  status: 'active' | 'paused' | 'stopped' | 'completed'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('autopilot_state')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('lead_id', leadId)
      .eq('agent_type', 'sdr_autopilot');

    if (error) {
      console.error('Failed to update autopilot status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateAutopilotStatus:', error);
    throw error;
  }
}

/**
 * Clean up old threads (optional maintenance function)
 */
export async function cleanupOldThreads(daysOld: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Find threads to clean up
    const { data: oldThreads, error: fetchError } = await supabase
      .from('agent_threads')
      .select('thread_id')
      .eq('agent_type', 'sdr_autopilot')
      .lt('updated_at', cutoffDate.toISOString());

    if (fetchError) {
      console.error('Failed to fetch old threads:', fetchError);
      throw fetchError;
    }

    if (!oldThreads || oldThreads.length === 0) {
      return 0;
    }

    // Delete from OpenAI (optional - threads auto-expire)
    for (const thread of oldThreads) {
      try {
        await openai.beta.threads.del(thread.thread_id);
      } catch (deleteError) {
        console.warn(`Failed to delete OpenAI thread ${thread.thread_id}:`, deleteError);
      }
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from('agent_threads')
      .delete()
      .eq('agent_type', 'sdr_autopilot')
      .lt('updated_at', cutoffDate.toISOString());

    if (deleteError) {
      console.error('Failed to delete old threads from Supabase:', deleteError);
      throw deleteError;
    }

    return oldThreads.length;
  } catch (error) {
    console.error('Error in cleanupOldThreads:', error);
    throw error;
  }
}