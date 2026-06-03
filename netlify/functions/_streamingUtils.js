/**
 * Streaming Response Utilities for Netlify Functions
 * Handles SSE (Server-Sent Events) streaming responses
 */

const { createStreamingResponse, MODEL_CONFIG, getModelForTask } = require('./_openaiClient');

/**
 * Create a streaming response handler for Netlify Lambda
 * Uses SSE format for streaming
 */
function createStreamingHandler(generatorFn) {
  return async (event, context) => {
    // Enable binary mode for streaming
    context.callbackWaitsForEmptyEventLoop = false;

    const encoder = new TextEncoder();
    
    // For Netlify, we need to use a chunked transfer encoding
    // We'll stream the response as multiple chunks
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generatorFn()) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          // Send final done message
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const errorData = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: stream,
      isBase64Encoded: false,
    };
  };
}

/**
 * Non-streaming handler for simple responses
 */
async function createSimpleResponse({ instructions, input, model, temperature = 0.7, maxTokens = 2000 }) {
  const content = await createStreamingResponse({
    instructions,
    input,
    model: model || MODEL_CONFIG.default,
    temperature,
    maxTokens,
  });

  // For non-streaming, just collect all content
  let fullContent = '';
  for await (const chunk of createStreamingResponse({
    instructions,
    input,
    model: model || MODEL_CONFIG.default,
    temperature,
    maxTokens,
  })) {
    if (chunk.type === 'token') {
      fullContent += chunk.token;
    }
  }
  return fullContent;
}

/**
 * SDR Agent System Prompt Builder
 */
function buildSdrSystemPrompt({ agentType, persona, contact, preferences = {} }) {
  const personaContext = persona ? getPersonaContext(persona) : '';
  
  return `You are SmartCRM's SDR agent, powered by GPT-5.2.

Your role: ${agentType || 'Sales Development Representative'}

${personaContext}

Guidelines:
- Write personalized, human-sounding emails
- Focus on value proposition, not pitch
- Include soft CTAs (call-to-action)
- Keep emails concise (under 150 words)
- Personalize based on contact's company, title, and industry
- Use a ${preferences.tone || 'professional'} tone

Contact Context:
- Name: ${contact.firstName || contact.name || 'there'}
- Title: ${contact.title || 'Not specified'}
- Company: ${contact.company || 'their company'}
- Industry: ${contact.industry || 'Not specified'}
- Email: ${contact.email || 'N/A'}

${preferences.companyName ? `You are writing on behalf of: ${preferences.companyName}` : ''}
${preferences.signature ? `Use this signature: ${preferences.signature}` : ''}`;
}

/**
 * Get persona context for SDR agents
 */
function getPersonaContext(personaId) {
  const personas = {
    cold_saas_founder: 'You are reaching out to a SaaS founder. Focus on growth challenges, scaling issues, and how automation can help them focus on product.',
    course_creator_nurture: 'You are nurturing a course creator. Focus on content delivery, student engagement, and revenue optimization.',
    agency_retainer_builder: 'You are building an agency retainer. Focus on client management, scalability, and recurring revenue.',
    b2b_saas_sdr: 'You are qualifying a B2B SaaS prospect. Focus on their tech stack, team size, and current solutions.',
    churn_winback: 'You are win-back campaign. Acknowledge the past relationship, show understanding of why they left, offer a compelling reason to return.',
    trial_to_paid_conversion: 'You are converting a trial user. Highlight value they\'ve seen, address any concerns, offer incentives.',
    // Add more personas as needed
  };
  
  return personas[personaId] || 'You are a helpful SDR professional.';
}

/**
 * Parse JSON from AI response safely
 */
function parseJsonResponse(content, fallback = {}) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // Try direct parse
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

module.exports = {
  createStreamingHandler,
  createSimpleResponse,
  buildSdrSystemPrompt,
  getPersonaContext,
  parseJsonResponse,
  MODEL_CONFIG,
  getModelForTask,
};
