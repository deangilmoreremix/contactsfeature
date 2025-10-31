/**
 * Twilio Integration Service
 * Handles SMS communication and phone number validation
 */

export interface SMSMessage {
  id: string;
  to: string;
  from: string;
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  direction: 'outbound' | 'inbound';
  timestamp: string;
  contactId?: string | undefined;
  cost?: number;
  errorMessage?: string;
}

export interface PhoneNumberValidation {
  phoneNumber: string;
  isValid: boolean;
  countryCode?: string;
  nationalFormat?: string;
  carrier?: string;
  lineType?: 'mobile' | 'landline' | 'voip' | 'unknown';
}

export class TwilioService {
  private static instance: TwilioService;
  private messages: SMSMessage[] = [];
  private phoneNumbers: string[] = [];

  static getInstance(): TwilioService {
    if (!TwilioService.instance) {
      TwilioService.instance = new TwilioService();
    }
    return TwilioService.instance;
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, body: string, contactId?: string): Promise<SMSMessage> {
    // Validate phone number first
    const validation = await this.validatePhoneNumber(to);
    if (!validation.isValid) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    // In a real implementation, this would call Twilio API
    // For demo purposes, we'll simulate the SMS sending
    const message: SMSMessage = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to: validation.nationalFormat || to,
      from: this.phoneNumbers[0] || '+1234567890', // Default demo number
      body,
      status: 'sent',
      direction: 'outbound',
      timestamp: new Date().toISOString(),
      contactId,
      cost: 0.0075 // Standard SMS cost
    };

    this.messages.push(message);
    return message;
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(recipients: { phone: string; contactId?: string }[], body: string): Promise<SMSMessage[]> {
    const promises = recipients.map(recipient =>
      this.sendSMS(recipient.phone, body, recipient.contactId)
    );

    const results = await Promise.allSettled(promises);
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<SMSMessage>).value);
  }

  /**
   * Validate phone number using Twilio Lookup API
   */
  async validatePhoneNumber(phoneNumber: string): Promise<PhoneNumberValidation> {
    try {
      // Remove all non-digit characters except +
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');

      // Basic validation
      if (!cleanNumber || cleanNumber.length < 10) {
        return {
          phoneNumber,
          isValid: false
        };
      }

      // In a real implementation, this would call Twilio Lookup API
      // For demo purposes, we'll simulate validation
      const isValid = cleanNumber.length >= 10 && /^\+?\d+$/.test(cleanNumber);

      if (isValid) {
        return {
          phoneNumber,
          isValid: true,
          countryCode: 'US',
          nationalFormat: cleanNumber.startsWith('+1') ? cleanNumber : `+1${cleanNumber.replace(/^\+?1?/, '')}`,
          carrier: 'Demo Carrier',
          lineType: 'mobile'
        };
      }

      return {
        phoneNumber,
        isValid: false
      };
    } catch (error) {
      console.error('Phone number validation failed:', error);
      return {
        phoneNumber,
        isValid: false
      };
    }
  }

  /**
   * Get SMS message history
   */
  getMessageHistory(contactId?: string, limit: number = 50): SMSMessage[] {
    let messages = this.messages;

    if (contactId) {
      messages = messages.filter(msg => msg.contactId === contactId);
    }

    return messages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get SMS statistics
   */
  getSMSStats(contactId?: string): {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalCost: number;
    averageDeliveryRate: number;
  } {
    let messages = this.messages;

    if (contactId) {
      messages = messages.filter(msg => msg.contactId === contactId);
    }

    const totalSent = messages.filter(msg => msg.direction === 'outbound').length;
    const totalDelivered = messages.filter(msg => msg.status === 'delivered').length;
    const totalFailed = messages.filter(msg => msg.status === 'failed').length;
    const totalCost = messages.reduce((sum, msg) => sum + (msg.cost || 0), 0);
    const averageDeliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      totalCost,
      averageDeliveryRate
    };
  }

  /**
   * Purchase phone number (simulated)
   */
  async purchasePhoneNumber(areaCode?: string): Promise<string> {
    // In a real implementation, this would call Twilio API to purchase a number
    const newNumber = `+1${areaCode || '555'}${Math.floor(Math.random() * 900000 + 100000)}`;
    this.phoneNumbers.push(newNumber);
    return newNumber;
  }

  /**
   * Get available phone numbers
   */
  getPhoneNumbers(): string[] {
    return [...this.phoneNumbers];
  }

  /**
   * Configure SMS webhook URL for incoming messages
   */
  async configureWebhook(webhookUrl: string): Promise<boolean> {
    // In a real implementation, this would configure Twilio webhooks
    console.log('SMS webhook configured:', webhookUrl);
    return true;
  }

  /**
   * Handle incoming SMS (webhook handler)
   */
  async handleIncomingSMS(from: string, body: string, contactId?: string): Promise<SMSMessage> {
    const message: SMSMessage = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to: this.phoneNumbers[0] || '+1234567890',
      from,
      body,
      status: 'delivered',
      direction: 'inbound',
      timestamp: new Date().toISOString(),
      contactId
    };

    this.messages.push(message);
    return message;
  }

  /**
   * Send templated SMS
   */
  async sendTemplatedSMS(
    to: string,
    templateId: string,
    variables: Record<string, string>,
    contactId?: string
  ): Promise<SMSMessage> {
    // Predefined templates
    const templates: Record<string, string> = {
      welcome: 'Welcome to our service! We\'re excited to have you on board.',
      appointment_reminder: 'Hi {{name}}, reminder: Your appointment is tomorrow at {{time}}.',
      follow_up: 'Hi {{name}}, just following up on our conversation. How can we help?',
      promotional: 'Special offer: {{discount}} off our premium service! Limited time only.'
    };

    const template = templates[templateId];
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Replace variables
    let body = template;
    Object.entries(variables).forEach(([key, value]) => {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return this.sendSMS(to, body, contactId);
  }

  /**
   * Schedule SMS for later delivery
   */
  async scheduleSMS(
    to: string,
    body: string,
    scheduledTime: Date,
    contactId?: string
  ): Promise<SMSMessage> {
    // In a real implementation, this would use Twilio's messaging service scheduling
    // For demo purposes, we'll create the message but mark it as queued
    const message: SMSMessage = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to,
      from: this.phoneNumbers[0] || '+1234567890',
      body,
      status: 'queued',
      direction: 'outbound',
      timestamp: scheduledTime.toISOString(),
      contactId
    };

    this.messages.push(message);

    // Simulate delivery at scheduled time
    setTimeout(() => {
      const index = this.messages.findIndex(msg => msg.id === message.id);
      if (index !== -1) {
        this.messages[index].status = 'sent';
        // Simulate delivery after a short delay
        setTimeout(() => {
          const deliveryIndex = this.messages.findIndex(msg => msg.id === message.id);
          if (deliveryIndex !== -1) {
            this.messages[deliveryIndex].status = 'delivered';
          }
        }, 2000);
      }
    }, scheduledTime.getTime() - Date.now());

    return message;
  }
}

export const twilioService = TwilioService.getInstance();