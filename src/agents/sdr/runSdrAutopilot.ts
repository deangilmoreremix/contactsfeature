import { callEdgeFunction } from "../../lib/supabase";

export interface SdrAutopilotParams {
  contactId: string;
  personaId?: string;
  sequenceLength?: number;
}

export interface SdrAutopilotResult {
  success: boolean;
  contactId: string;
  action: string;
  error?: string;
}

export async function startSdrAutopilot(params: SdrAutopilotParams): Promise<SdrAutopilotResult> {
  try {
    const result = await callEdgeFunction("sdr-autopilot", {
      action: "start",
      contactId: params.contactId,
      personaId: params.personaId || "cold_saas_founder",
      sequenceLength: params.sequenceLength || 5,
    });
    return { success: true, contactId: params.contactId, action: "started", ...result };
  } catch (error) {
    return {
      success: false,
      contactId: params.contactId,
      action: "start",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function pauseSdrAutopilot(contactId: string): Promise<SdrAutopilotResult> {
  try {
    const result = await callEdgeFunction("sdr-autopilot", {
      action: "pause",
      contactId,
    });
    return { success: true, contactId, action: "paused", ...result };
  } catch (error) {
    return {
      success: false,
      contactId,
      action: "pause",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resumeSdrAutopilot(contactId: string): Promise<SdrAutopilotResult> {
  try {
    const result = await callEdgeFunction("sdr-autopilot", {
      action: "resume",
      contactId,
    });
    return { success: true, contactId, action: "resumed", ...result };
  } catch (error) {
    return {
      success: false,
      contactId,
      action: "resume",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function stopSdrAutopilot(contactId: string): Promise<SdrAutopilotResult> {
  try {
    const result = await callEdgeFunction("sdr-autopilot", {
      action: "stop",
      contactId,
    });
    return { success: true, contactId, action: "stopped", ...result };
  } catch (error) {
    return {
      success: false,
      contactId,
      action: "stop",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getAutopilotStatus(): Promise<{ states: any[] }> {
  try {
    const result = await callEdgeFunction("sdr-autopilot", { action: "status" });
    return { states: result.states || [] };
  } catch {
    return { states: [] };
  }
}

export async function getAutopilotLogs(contactId?: string): Promise<{ logs: any[] }> {
  try {
    const result = await callEdgeFunction("sdr-autopilot", {
      action: "logs",
      contactId,
    });
    return { logs: result.logs || [] };
  } catch {
    return { logs: [] };
  }
}

export async function bulkStartAutopilot(
  contactIds: string[],
  personaId?: string,
  sequenceLength?: number
): Promise<{ results: any[] }> {
  try {
    const result = await callEdgeFunction("sdr-autopilot", {
      action: "bulk_start",
      contactIds,
      personaId: personaId || "cold_saas_founder",
      sequenceLength: sequenceLength || 5,
    });
    return { results: result.results || [] };
  } catch {
    return { results: [] };
  }
}
