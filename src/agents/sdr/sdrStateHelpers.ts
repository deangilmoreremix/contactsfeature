import { supabase } from "../../lib/supabase";

export interface AutopilotState {
  leadId: string;
  agentType: string;
  stateJson: any;
  status: 'active' | 'paused' | 'stopped' | 'completed';
}

export async function getOrCreateThreadForLead(leadId: string): Promise<string> {
  try {
    const response = await fetch('/.netlify/functions/manage-sdr-thread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getOrCreate', leadId })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to get or create thread');
    }

    const data = await response.json();
    return data.threadId;
  } catch (error) {
    console.error('Error in getOrCreateThreadForLead:', error);
    throw error;
  }
}

export async function saveAutopilotState(params: {
  leadId: string;
  stateJson: string;
  status?: 'active' | 'paused' | 'stopped' | 'completed';
}): Promise<void> {
  try {
    const { leadId, stateJson, status = 'active' } = params;

    let parsedState;
    try {
      parsedState = JSON.parse(stateJson);
    } catch (parseError) {
      console.error('Invalid state JSON:', parseError);
      throw new Error('Invalid state JSON format');
    }

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
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch autopilot state:', error);
      throw error;
    }

    if (!data) {
      return null;
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

export async function cleanupOldThreads(daysOld: number = 90): Promise<number> {
  try {
    const response = await fetch('/.netlify/functions/manage-sdr-thread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cleanup', daysOld })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to cleanup threads');
    }

    const data = await response.json();
    return data.cleaned;
  } catch (error) {
    console.error('Error in cleanupOldThreads:', error);
    throw error;
  }
}
