/**
 * OpenAI Responses API + Agents API Client
 * Handles streaming responses and agent tool execution
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Model configuration - use GPT-5.2 by default
const MODEL_CONFIG = {
  default: process.env.SMARTCRM_MODEL || 'gpt-5.2',
  thinking: process.env.SMARTCRM_THINKING_MODEL || 'gpt-5.2-thinking',
  fast: process.env.SMARTCRM_FAST_MODEL || 'gpt-5.2-instant',
  pro: process.env.SMARTCRM_SDR_PRO || 'gpt-5.2-pro',
};

/**
 * Create a streaming response using the Responses API
 * Returns an async generator for streaming tokens
 */
async function* createStreamingResponse({ instructions, input, model = 'gpt-5.2', temperature = 0.7, maxTokens = 2000 }) {
  const stream = await openai.responses.create({
    model,
    instructions,
    input,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === 'response.output_text.delta') {
      yield {
        type: 'token',
        token: event.delta,
      };
    } else if (event.type === 'response.completed') {
      const output = event.response.output[0];
      if (output && output.type === 'message') {
        const content = output.content[0];
        if (content.type === 'output_text') {
          yield {
            type: 'complete',
            content: content.text,
          };
        }
      }
    } else if (event.type === 'error') {
      yield {
        type: 'error',
        error: event.error,
      };
    }
  }
}

/**
 * Create a non-streaming response using the Responses API
 */
async function createResponse({ instructions, input, model = 'gpt-5.2', temperature = 0.7, maxTokens = 2000 }) {
  const response = await openai.responses.create({
    model,
    instructions,
    input,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  });

  const output = response.output[0];
  if (output && output.type === 'message') {
    const content = output.content[0];
    if (content.type === 'output_text') {
      return content.text;
    }
  }
  return '';
}

/**
 * Create an agent with tools using the Agents API
 */
async function createAgent({ name, instructions, tools = [], model = 'gpt-5.2-thinking' }) {
  const agent = await openai.beta.agents.create({
    name,
    instructions,
    model,
    tools,
  });
  return agent;
}

/**
 * Create a run with streaming for an agent
 */
async function* createAgentStream({ agentId, threadId, additionalInstructions, stream = true }) {
  const run = openai.beta.threads.runs.createAndStream(threadId, {
    agent_id: agentId,
    additional_instructions: additionalInstructions,
    stream: true,
  });

  for await (const event of run) {
    if (event.type === 'thread.message.delta') {
      yield {
        type: 'token',
        token: event.data.delta.content?.[0]?.text?.value || '',
      };
    } else if (event.type === 'thread.run.completed') {
      yield { type: 'complete' };
    } else if (event.type === 'thread.run.failed') {
      yield {
        type: 'error',
        error: event.data.last_error,
      };
    }
  }
}

/**
 * Create a thread for agent conversations
 */
async function createThread() {
  const thread = await openai.beta.threads.create();
  return thread;
}

/**
 * Add a message to a thread
 */
async function addMessageToThread({ threadId, content, role = 'user' }) {
  const message = await openai.beta.threads.messages.create(threadId, {
    role,
    content,
  });
  return message;
}

/**
 * Get the model name based on task type
 */
function getModelForTask(taskType) {
  switch (taskType) {
    case 'sdr':
    case 'autopilot':
    case 'analysis':
    case 'deep_reasoning':
      return MODEL_CONFIG.thinking;
    case 'analytics':
    case 'heavy_analytics':
      return MODEL_CONFIG.pro;
    case 'fast':
    case 'email':
    case 'summary':
    case 'quick':
      return MODEL_CONFIG.fast;
    default:
      return MODEL_CONFIG.default;
  }
}

module.exports = {
  openai,
  MODEL_CONFIG,
  createStreamingResponse,
  createResponse,
  createAgent,
  createAgentStream,
  createThread,
  addMessageToThread,
  getModelForTask,
};
