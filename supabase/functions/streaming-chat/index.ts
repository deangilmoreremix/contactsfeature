import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { message, conversationId, context, stream } = await req.json()

    if (stream) {
      return await handleStreamingChat(message, conversationId, context, supabaseClient)
    } else {
      const response = await generateChatResponse(message, conversationId, context)
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleStreamingChat(message: string, conversationId: string, context: any, supabaseClient: any) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      generateStreamingResponse(message, conversationId, context, controller, encoder, supabaseClient)
    }
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

async function generateStreamingResponse(
  message: string,
  conversationId: string,
  context: any,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  supabaseClient: any
) {
  try {
    // Get conversation history
    const conversationHistory = await getConversationHistory(conversationId, supabaseClient)

    // Generate response in chunks
    const fullResponse = await generateChatResponse(message, conversationId, context)
    const words = fullResponse.content.split(' ')

    // Stream response word by word
    for (let i = 0; i < words.length; i++) {
      const chunk = words[i] + (i < words.length - 1 ? ' ' : '')
      const data = {
        type: 'chunk',
        content: chunk,
        done: false
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Send completion signal
    const completionData = {
      type: 'done',
      content: '',
      done: true,
      metadata: fullResponse.metadata
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`))

    // Save the response to conversation history
    await saveMessage(conversationId, 'assistant', fullResponse.content, supabaseClient)

  } catch (error) {
    const errorData = {
      type: 'error',
      content: error.message,
      done: true
    }
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
  } finally {
    controller.close()
  }
}

async function generateChatResponse(message: string, conversationId: string, context: any) {
  // Save user message
  await saveMessage(conversationId, 'user', message)

  // Get conversation context
  const conversationHistory = await getConversationHistory(conversationId)
  const contactContext = await getContactContext(context.contactId)

  // Analyze message intent
  const intent = await analyzeChatIntent(message, conversationHistory)

  // Generate contextual response
  const response = await craftContextualResponse(message, intent, conversationHistory, contactContext, context)

  return {
    content: response.content,
    suggestions: response.suggestions,
    actions: response.actions,
    metadata: {
      intent: intent.type,
      confidence: intent.confidence,
      responseType: response.type,
      generatedAt: new Date().toISOString()
    }
  }
}

async function analyzeChatIntent(message: string, history: any[]) {
  const lowerMessage = message.toLowerCase()

  // Define intent patterns
  const intents = {
    question: {
      patterns: ['what', 'how', 'when', 'where', 'why', 'who', '?'],
      responses: ['I understand you have a question. Let me help you with that.']
    },
    request: {
      patterns: ['please', 'can you', 'would you', 'need', 'want', 'help'],
      responses: ['I\'d be happy to help you with that request.']
    },
    information: {
      patterns: ['tell me', 'show me', 'find', 'search', 'look for'],
      responses: ['I\'ll find that information for you.']
    },
    action: {
      patterns: ['create', 'update', 'delete', 'send', 'schedule', 'book'],
      responses: ['I\'ll take care of that action for you.']
    },
    greeting: {
      patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
      responses: ['Hello! How can I assist you today?']
    },
    gratitude: {
      patterns: ['thank', 'thanks', 'appreciate', 'grateful'],
      responses: ['You\'re welcome! Is there anything else I can help you with?']
    }
  }

  // Check for intent matches
  for (const [intentType, intentData] of Object.entries(intents)) {
    for (const pattern of intentData.patterns) {
      if (lowerMessage.includes(pattern)) {
        return {
          type: intentType,
          confidence: 0.8,
          patterns: [pattern]
        }
      }
    }
  }

  // Check conversation history for context
  if (history.length > 0) {
    const lastMessage = history[history.length - 1]
    if (lastMessage.role === 'assistant') {
      return {
        type: 'follow_up',
        confidence: 0.6,
        context: 'continuing_conversation'
      }
    }
  }

  return {
    type: 'general',
    confidence: 0.5,
    patterns: []
  }
}

async function craftContextualResponse(message: string, intent: any, history: any[], contactContext: any, context: any) {
  let response = {
    content: '',
    suggestions: [],
    actions: [],
    type: 'text'
  }

  switch (intent.type) {
    case 'question':
      response = await handleQuestion(message, contactContext, context)
      break
    case 'request':
      response = await handleRequest(message, contactContext, context)
      break
    case 'information':
      response = await handleInformationRequest(message, contactContext, context)
      break
    case 'action':
      response = await handleActionRequest(message, contactContext, context)
      break
    case 'greeting':
      response = await handleGreeting(message, contactContext, context)
      break
    case 'gratitude':
      response = await handleGratitude(message, contactContext, context)
      break
    default:
      response = await handleGeneralMessage(message, contactContext, context)
  }

  return response
}

async function handleQuestion(message: string, contactContext: any, context: any) {
  const contactName = contactContext?.name || 'the contact'

  return {
    content: `I'd be happy to help answer your question about ${contactName}. Let me gather the relevant information for you.`,
    suggestions: [
      'Show contact details',
      'View recent activity',
      'Check related documents'
    ],
    actions: ['fetch_contact_details', 'get_recent_activity'],
    type: 'question_response'
  }
}

async function handleRequest(message: string, contactContext: any, context: any) {
  return {
    content: 'I understand your request. Let me assist you with that.',
    suggestions: [
      'Create a task',
      'Schedule a follow-up',
      'Send an email'
    ],
    actions: ['create_task', 'schedule_followup'],
    type: 'request_response'
  }
}

async function handleInformationRequest(message: string, contactContext: any, context: any) {
  return {
    content: 'I\'ll search for that information and provide you with the relevant details.',
    suggestions: [
      'Search contacts',
      'Find documents',
      'Check recent activity'
    ],
    actions: ['search_contacts', 'search_documents'],
    type: 'information_response'
  }
}

async function handleActionRequest(message: string, contactContext: any, context: any) {
  return {
    content: 'I\'ll help you complete that action. What specific details do you need?',
    suggestions: [
      'Update contact info',
      'Send email',
      'Schedule meeting'
    ],
    actions: ['update_contact', 'send_email', 'schedule_meeting'],
    type: 'action_response'
  }
}

async function handleGreeting(message: string, contactContext: any, context: any) {
  const contactName = contactContext?.name || 'there'
  const timeOfDay = getTimeOfDay()

  return {
    content: `Hello ${contactName}! Good ${timeOfDay}. How can I assist you today?`,
    suggestions: [
      'View contact details',
      'Check recent activity',
      'Create a task'
    ],
    actions: ['show_dashboard', 'view_recent_activity'],
    type: 'greeting_response'
  }
}

async function handleGratitude(message: string, contactContext: any, context: any) {
  return {
    content: 'You\'re very welcome! I\'m glad I could help. Is there anything else you need assistance with?',
    suggestions: [
      'Ask another question',
      'View more details',
      'Create a follow-up task'
    ],
    actions: ['ask_question', 'view_more_details'],
    type: 'gratitude_response'
  }
}

async function handleGeneralMessage(message: string, contactContext: any, context: any) {
  return {
    content: 'I understand. How else can I help you with this contact or your work today?',
    suggestions: [
      'View contact details',
      'Check activity history',
      'Create a task or note'
    ],
    actions: ['view_details', 'check_history', 'create_note'],
    type: 'general_response'
  }
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

async function getConversationHistory(conversationId: string, supabaseClient?: any) {
  // In production, this would fetch from database
  return []
}

async function getContactContext(contactId: string) {
  // In production, this would fetch contact details
  return {
    name: 'Contact',
    company: 'Company',
    lastContact: new Date().toISOString()
  }
}

async function saveMessage(conversationId: string, role: string, content: string, supabaseClient?: any) {
  // In production, this would save to database
  console.log(`Saving ${role} message to conversation ${conversationId}: ${content}`)
}