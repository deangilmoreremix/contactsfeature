const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Map email addresses to agent keys
const EMAIL_TO_AGENT_MAP = {
  'deansales@agentmail.to': 'sales_qualification',
  'deansupport@agentmail.to': 'support_response',
  'deangilmore@agentmail.to': 'general_agent'
};

async function runOutboundAgent(agentKey, emailData) {
  try {
    console.log(`🤖 Running agent: ${agentKey}`);

    // Get agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('outbound_agents')
      .select('*')
      .eq('key', agentKey)
      .single();

    if (agentError || !agent) {
      console.error(`Agent ${agentKey} not found:`, agentError);
      return;
    }

    // Find or create contact
    let { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', emailData.senderEmail)
      .single();

    if (contactError && contactError.code !== 'PGRST116') {
      console.error('Error finding contact:', contactError);
      return;
    }

    let contactId;
    if (!contact) {
      // Create new contact
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          name: emailData.senderName || emailData.senderEmail.split('@')[0],
          email: emailData.senderEmail,
          status: 'lead',
          interestLevel: 'medium',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating contact:', createError);
        return;
      }
      contact = newContact;
    }
    contactId = contact.id;

    // Generate AI response using SmartCRM tools
    const response = await generateAgentResponse(agent, emailData, contact);

    console.log(`📧 Agent ${agentKey} responding to ${emailData.senderEmail}`);

    // Here you would integrate with AgentMail SDK to send the response
    // For now, just log the response
    console.log('Generated response:', response);

  } catch (error) {
    console.error(`Error running agent ${agentKey}:`, error);
  }
}

async function generateAgentResponse(agent, emailData, contact) {
  // This would integrate with SmartCRM's AI tools
  // For now, return a simple response based on agent type
  const responses = {
    sales_qualification: `Hi ${emailData.senderName || 'there'}! Thanks for reaching out about our services. I'd love to learn more about your needs. Could you tell me about your current challenges and what you're hoping to achieve?`,
    support_response: `Hi ${emailData.senderName || 'there'}! I'm here to help with your support question. Could you provide more details about the issue you're experiencing so I can assist you better?`,
    general_agent: `Hi ${emailData.senderName || 'there'}! Thank you for your email. How can I help you today?`
  };

  return responses[agent.key] || responses.general_agent;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const { event_type, message } = payload;

    console.log('📨 Webhook received:', event_type);

    if (event_type === 'message.sent') {
      console.log('📤 Message sent event - ignoring');
      return {
        statusCode: 200,
        body: 'OK'
      };
    }

    if (!message || !message.message_id || !message.inbox_id) {
      console.log('⚠️ Invalid message data');
      return {
        statusCode: 200,
        body: 'OK'
      };
    }

    // Extract sender information
    const fromField = message.from_ || message.from || '';
    let senderEmail, senderName;

    if (fromField.includes('<')) {
      const match = fromField.match(/^(.+?)\s*<(.+)>$/);
      if (match) {
        senderName = match[1].trim();
        senderEmail = match[2];
      } else {
        senderEmail = fromField;
      }
    } else {
      senderEmail = fromField;
    }

    // Extract recipient information
    const toField = message.to || '';
    let recipientEmail = '';

    if (Array.isArray(toField)) {
      recipientEmail = toField[0];
    } else if (typeof toField === 'string') {
      if (toField.includes('<')) {
        const match = toField.match(/^(.+?)\s*<(.+)>$/);
        recipientEmail = match ? match[2] : toField;
      } else {
        recipientEmail = toField;
      }
    }

    console.log('👤 From:', senderEmail, 'To:', recipientEmail);
    console.log('📧 Subject:', message.subject);
    console.log('💬 Body:', (message.text || message.body || message.html || '').substring(0, 100) + '...');

    // Only process incoming messages (not our own sent messages)
    if (event_type === 'message.received' && recipientEmail) {
      const agentKey = EMAIL_TO_AGENT_MAP[recipientEmail.toLowerCase()];

      if (agentKey) {
        console.log(`🎯 Routing to agent: ${agentKey}`);

        const emailData = {
          senderEmail,
          senderName,
          recipientEmail,
          subject: message.subject,
          body: message.text || message.body || message.html,
          threadId: message.thread_id,
          messageId: message.message_id
        };

        // Run agent asynchronously (don't wait for response)
        runOutboundAgent(agentKey, emailData);

      } else {
        console.log(`⚠️ No agent found for email: ${recipientEmail}`);
      }
    }

    return {
      statusCode: 200,
      body: 'OK'
    };
  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    return {
      statusCode: 200,
      body: 'OK'
    };
  }
};
