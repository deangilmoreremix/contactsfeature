/**
 * SDR Autopilot Runner
 * Orchestrates GPT-5.2 SDR agent execution with tool calling
 */

import { openai } from "../../lib/core/openaiClient";
import { pickModelForSdrTask } from "../../config/ai";
import { sdrTools } from "./sdrTools";
import { buildSdrMessages } from "./sdrAgentDefinition";
import { getOrCreateThreadForLead } from "./sdrStateHelpers";
import {
  getLeadContextFromSmartCRM,
  sendViaAgentMail,
  createTaskInSmartCRM,
  updateDealStageInSmartCRM,
  scheduleMeetingForLead,
  saveAutopilotStateWrapper
} from "./sdrToolImplementations";

export interface SdrAutopilotParams {
  leadId: string;
  goal: string;
  mailboxKey: string;
}

export interface SdrAutopilotResult {
  threadId: string;
  runId: string;
  completed: boolean;
  finalOutput?: string;
  error?: string;
}

export async function runSdrAutopilot(params: SdrAutopilotParams): Promise<SdrAutopilotResult> {
  const { leadId, goal, mailboxKey } = params;

  try {
    // Step 1: Get or create thread for this lead
    const threadId = await getOrCreateThreadForLead(leadId);

    // Step 2: Get lead context for the agent
    const leadContext = await getLeadContextFromSmartCRM(leadId);
    const contextString = JSON.stringify(leadContext, null, 2);

    // Step 3: Build messages for the agent
    const messages = buildSdrMessages(contextString, goal);

    // Step 4: Create and run the agent
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: await getOrCreateSdrAssistant(),
      model: pickModelForSdrTask("autopilot"),
      instructions: messages[0].content as string, // System prompt
      additional_instructions: goal,
      tools: sdrTools.map(tool => ({
        type: "function" as const,
        function: tool.function
      }))
    });

    // Step 5: Stream and handle tool calls
    let completed = false;
    let finalOutput: string | undefined;

    while (!completed) {
      // Wait for the run to complete or require action
      const runStatus = await waitForRunCompletion(threadId, run.id);

      if (runStatus.status === 'completed') {
        completed = true;

        // Get the final messages
        const messages = await openai.beta.threads.messages.list(threadId);
        const lastMessage = messages.data[0];
        if (lastMessage?.content[0]?.type === 'text') {
          finalOutput = lastMessage.content[0].text.value;
        }

      } else if (runStatus.status === 'requires_action') {
        // Handle tool calls
        await handleToolCalls(threadId, run.id, runStatus.required_action);

      } else if (runStatus.status === 'failed') {
        throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);

      } else if (runStatus.status === 'expired' || runStatus.status === 'cancelled') {
        throw new Error(`Run ${runStatus.status}`);
      }
    }

    return {
      threadId,
      runId: run.id,
      completed: true,
      finalOutput
    };

  } catch (error) {
    console.error('Error in runSdrAutopilot:', error);
    return {
      threadId: '',
      runId: '',
      completed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

let cachedAssistantId: string | null = null;

async function getOrCreateSdrAssistant(): Promise<string> {
  if (process.env.SDR_ASSISTANT_ID) {
    return process.env.SDR_ASSISTANT_ID;
  }

  if (cachedAssistantId) {
    return cachedAssistantId;
  }

  try {
    const assistants = await openai.beta.assistants.list({ limit: 100 });
    const existingAssistant = assistants.data.find(
      (a) => a.name === 'SmartCRM SDR Autopilot'
    );

    if (existingAssistant) {
      cachedAssistantId = existingAssistant.id;
      return cachedAssistantId;
    }

    const newAssistant = await openai.beta.assistants.create({
      name: 'SmartCRM SDR Autopilot',
      description: 'AI-powered SDR agent for automated outreach and lead nurturing',
      model: pickModelForSdrTask('autopilot'),
      instructions: `You are an AI SDR (Sales Development Representative) autopilot for SmartCRM.
Your job is to nurture leads through personalized outreach campaigns.

Key responsibilities:
- Send personalized emails to leads based on their profile and engagement
- Create follow-up tasks to ensure timely responses
- Move deals through the pipeline based on lead engagement
- Schedule discovery calls when leads show buying intent
- Log all campaign state for tracking and optimization

Always be professional, helpful, and focused on providing value to the prospect.
Never be pushy or aggressive. Build genuine relationships.`,
      tools: sdrTools.map(tool => ({
        type: 'function' as const,
        function: tool.function
      }))
    });

    cachedAssistantId = newAssistant.id;
    console.log('Created new SDR Assistant:', newAssistant.id);

    return cachedAssistantId;
  } catch (error) {
    console.error('Error creating SDR Assistant:', error);
    throw new Error('Failed to create or retrieve SDR Assistant');
  }
}

async function waitForRunCompletion(threadId: string, runId: string) {
  while (true) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);

    if (['completed', 'failed', 'expired', 'cancelled', 'requires_action'].includes(run.status)) {
      return run;
    }

    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function handleToolCalls(threadId: string, runId: string, requiredAction: any) {
  const toolCalls = requiredAction.submit_tool_outputs.tool_calls;
  const toolOutputs: any[] = [];

  for (const toolCall of toolCalls) {
    const { id: callId, function: func } = toolCall;
    const { name, arguments: argsJson } = func;

    try {
      const args = JSON.parse(argsJson);
      let result: any = {};

      // Dispatch to appropriate tool implementation
      switch (name) {
        case 'get_lead_context':
          result = await getLeadContextFromSmartCRM(args.lead_id);
          break;

        case 'send_sdr_email':
          result = await sendViaAgentMail(args);
          break;

        case 'create_followup_task':
          result = await createTaskInSmartCRM(args);
          break;

        case 'update_pipeline_stage':
          result = await updateDealStageInSmartCRM(args);
          break;

        case 'schedule_meeting':
          result = await scheduleMeetingForLead(args);
          break;

        case 'log_autopilot_state':
          result = await saveAutopilotStateWrapper(args);
          break;

        default:
          result = { error: `Unknown tool: ${name}` };
      }

      toolOutputs.push({
        tool_call_id: callId,
        output: JSON.stringify(result)
      });

    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      toolOutputs.push({
        tool_call_id: callId,
        output: JSON.stringify({
          error: error instanceof Error ? error.message : 'Tool execution failed'
        })
      });
    }
  }

  // Submit tool outputs back to the run
  await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
    tool_outputs: toolOutputs
  });
}

// Helper function to start SDR Autopilot for a lead
export async function startSdrAutopilot(
  leadId: string,
  goal: string = "Run a 30-day nurture campaign to book a discovery call",
  mailboxKey: string = "deansales"
): Promise<SdrAutopilotResult> {
  return await runSdrAutopilot({ leadId, goal, mailboxKey });
}

// Helper function to resume SDR Autopilot with new input (e.g., from email reply)
export async function resumeSdrAutopilot(
  leadId: string,
  newInput: string,
  mailboxKey: string = "deansales"
): Promise<SdrAutopilotResult> {
  // Get existing thread
  const threadId = await getOrCreateThreadForLead(leadId);

  // Add the new input as a user message
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: newInput
  });

  // Run the autopilot with the new context
  return await runSdrAutopilot({
    leadId,
    goal: `Continue SDR campaign based on new input: ${newInput}`,
    mailboxKey
  });
}