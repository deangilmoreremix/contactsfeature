import { supabase } from "../core/supabaseClient";
import { logger } from "../core/logger";
import { EventType, eventBus } from "./eventBus";

// Email provider webhook handlers
export async function handleEmailDeliveryWebhook(req: any): Promise<void> {
  try {
    const { message_id, status, timestamp } = req.body;
    
    // Validate signature (implementation depends on provider)
    if (!validateEmailWebhookSignature(req)) {
      logger.warn('Invalid email webhook signature');
      return;
    }

    // Normalize payload to internal event
    const eventPayload = {
      messageId: message_id,
      status,
      timestamp: new Date(timestamp),
      provider: 'agentmail' // or other provider
    };

    // Emit standardized event
    await eventBus.emit(EventType.MESSAGE_DELIVERED, eventPayload, `delivery_${message_id}`);

    // Update email status in database
    await supabase
      .from('emails')
      .update({ delivery_status: status, delivered_at: new Date(timestamp) })
      .eq('provider_message_id', message_id);

  } catch (error) {
    logger.error('Failed to handle email delivery webhook', { error, req: req.body });
    throw error;
  }
}

export async function handleEmailOpenWebhook(req: any): Promise<void> {
  try {
    const { message_id, timestamp, ip_address } = req.body;
    
    if (!validateEmailWebhookSignature(req)) {
      logger.warn('Invalid email webhook signature');
      return;
    }

    const eventPayload = {
      messageId: message_id,
      timestamp: new Date(timestamp),
      ipAddress: ip_address,
      provider: 'agentmail'
    };

    await eventBus.emit(EventType.MESSAGE_OPENED, eventPayload, `open_${message_id}`);

    await supabase
      .from('emails')
      .update({ open_status: true, opened_at: new Date(timestamp) })
      .eq('provider_message_id', message_id);

  } catch (error) {
    logger.error('Failed to handle email open webhook', { error, req: req.body });
    throw error;
  }
}

export async function handleEmailClickWebhook(req: any): Promise<void> {
  try {
    const { message_id, timestamp, url } = req.body;
    
    if (!validateEmailWebhookSignature(req)) {
      logger.warn('Invalid email webhook signature');
      return;
    }

    const eventPayload = {
      messageId: message_id,
      timestamp: new Date(timestamp),
      url,
      provider: 'agentmail'
    };

    await eventBus.emit(EventType.LINK_CLICKED, eventPayload, `click_${message_id}`);

    await supabase
      .from('emails')
      .update({ click_status: true, clicked_at: new Date(timestamp), clicked_url: url })
      .eq('provider_message_id', message_id);

  } catch (error) {
    logger.error('Failed to handle email click webhook', { error, req: req.body });
    throw error;
  }
}

export async function handleEmailReplyWebhook(req: any): Promise<void> {
  try {
    const { message_id, from_email, subject, body, timestamp } = req.body;
    
    if (!validateEmailWebhookSignature(req)) {
      logger.warn('Invalid email webhook signature');
      return;
    }

    const eventPayload = {
      messageId: message_id,
      fromEmail: from_email,
      subject,
      body,
      timestamp: new Date(timestamp),
      provider: 'agentmail'
    };

    await eventBus.emit(EventType.REPLY_RECEIVED, eventPayload, `reply_${message_id}`);

    await supabase
      .from('emails')
      .update({ 
        response_type: classifyResponseType(body),
        replied_at: new Date(timestamp),
        reply_body: body,
        reply_from: from_email
      })
      .eq('provider_message_id', message_id);

  } catch (error) {
    logger.error('Failed to handle email reply webhook', { error, req: req.body });
    throw error;
  }
}

// Generic webhook validation (implementation depends on provider)
function validateEmailWebhookSignature(req: any): boolean {
  // Implement provider-specific signature validation
  // This is a placeholder - actual implementation depends on the email provider
  return true;
}

// Response type classification
function classifyResponseType(body: string): string {
  const lowerBody = body.toLowerCase();
  
  if (lowerBody.includes('unsubscribe') || lowerBody.includes('remove')) {
    return 'unsubscribe';
  }
  
  if (lowerBody.includes('not interested') || lowerBody.includes('not now')) {
    return 'negative';
  }
  
  if (lowerBody.includes('yes') || lowerBody.includes('interested') || lowerBody.includes('sure')) {
    return 'positive';
  }
  
  if (lowerBody.includes('how much') || lowerBody.includes('price') || lowerBody.includes('cost')) {
    return 'objection';
  }
  
  return 'neutral';
}

// Inbound message webhook handler
export async function handleInboundMessageWebhook(req: any): Promise<void> {
  try {
    const { channel, from, to, message, timestamp, metadata } = req.body;
    
    // Normalize payload
    const eventPayload = {
      channel,
      from,
      to,
      message,
      timestamp: new Date(timestamp),
      metadata
    };

    // Emit appropriate event based on channel
    let eventType: EventType;
    switch (channel) {
      case 'email':
        eventType = EventType.REPLY_RECEIVED;
        break;
      case 'sms':
        eventType = EventType.REPLY_RECEIVED;
        break;
      case 'linkedin':
        eventType = EventType.REPLY_RECEIVED;
        break;
      case 'whatsapp':
        eventType = EventType.REPLY_RECEIVED;
        break;
      default:
        eventType = EventType.REPLY_RECEIVED;
    }

    await eventBus.emit(eventType, eventPayload, `inbound_${from}_${timestamp}`);

    // Update contact engagement
    await updateContactEngagement(from, channel, message, timestamp);

  } catch (error) {
    logger.error('Failed to handle inbound message webhook', { error, req: req.body });
    throw error;
  }
}

async function updateContactEngagement(from: string, channel: string, message: string, timestamp: string): Promise<void> {
  try {
    // Find contact by email/phone
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, engagement_score, last_contacted')
      .or(`email.eq.${from},phone.eq.${from}`);

    if (error || !contacts?.length) {
      logger.warn('Contact not found for inbound message', { from, channel });
      return;
    }

    const contact = contacts[0];
    
    // Update engagement score and last contacted
    const newEngagementScore = Math.min(contact.engagement_score + 5, 100); // Increase by 5 points
    
    await supabase
      .from('contacts')
      .update({
        engagement_score: newEngagementScore,
        last_contacted: new Date(timestamp)
      })
      .eq('id', contact.id);

    // Log engagement history
    await supabase
      .from('engagement_history')
      .insert({
        contact_id: contact.id,
        event_type: 'reply',
        event_value: message,
        timestamp: new Date(timestamp),
        source: channel
      });

  } catch (error) {
    logger.error('Failed to update contact engagement', { error, from, channel });
  }
}