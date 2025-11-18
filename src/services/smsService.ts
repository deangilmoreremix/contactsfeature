/**
 * SMS Service
 * Handles sending SMS via Twilio API
 */

export interface SMSData {
  to: string;
  message: string;
  from?: string;
  mediaUrl?: string[];
  statusCallback?: string;
  metadata?: Record<string, any>;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
  status?: string;
}

class SMSService {
  private static instance: SMSService;
  private config: {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
    testMode?: boolean;
    testNumber?: string;
  } = {};

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  setConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
  }

  async sendSMS(smsData: SMSData): Promise<SMSResult> {
    try {
      const accountSid = this.config.accountSid || (process.env as any)['TWILIO_ACCOUNT_SID'];
      const authToken = this.config.authToken || (process.env as any)['TWILIO_AUTH_TOKEN'];
      const fromNumber = smsData.from || this.config.phoneNumber || (process.env as any)['TWILIO_PHONE_NUMBER'];

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
      }

      if (!fromNumber) {
        throw new Error('Twilio phone number not configured');
      }

      // Format phone number (ensure it starts with +)
      const toNumber = smsData.to.startsWith('+') ? smsData.to : `+${smsData.to}`;

      const twilioData = new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Body: smsData.message
      });

      // Add media URLs if provided
      if (smsData.mediaUrl && smsData.mediaUrl.length > 0) {
        smsData.mediaUrl.forEach((url, index) => {
          twilioData.append(`MediaUrl${index}`, url);
        });
      }

      // Add status callback if provided
      if (smsData.statusCallback) {
        twilioData.append('StatusCallback', smsData.statusCallback);
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: twilioData
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Twilio API error: ${response.status} ${errorData.message || ''}`);
      }

      const result = await response.json();

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        cost: parseFloat(result.price || '0')
      };

    } catch (error) {
      console.error('SMS service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send bulk SMS (limited to prevent abuse)
  async sendBulkSMS(recipients: string[], message: string, options?: {
    delay?: number; // milliseconds between messages
    maxMessages?: number;
  }): Promise<{ results: SMSResult[]; summary: { sent: number; failed: number; totalCost: number } }> {
    const { delay = 1000, maxMessages = 10 } = options || {};
    const limitedRecipients = recipients.slice(0, maxMessages);

    const results: SMSResult[] = [];
    let totalCost = 0;

    for (const recipient of limitedRecipients) {
      const result = await this.sendSMS({ to: recipient, message });

      results.push(result);

      if (result.cost) {
        totalCost += result.cost;
      }

      // Add delay between messages to respect rate limits
      if (delay > 0 && limitedRecipients.indexOf(recipient) < limitedRecipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const summary = {
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalCost
    };

    return { results, summary };
  }

  // Test configuration
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Send a test SMS to verify configuration
      const testResult = await this.sendSMS({
        to: this.config['testNumber'] || '+15551234567', // Test number
        message: 'SMS API Configuration Test',
        metadata: { test: true }
      });

      return { success: testResult.success, error: testResult.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }

  // Get SMS limits and capabilities
  getLimits(): {
    maxMessageLength: number;
    maxRecipients: number;
    supportedCountries: string[];
    features: string[];
  } {
    return {
      maxMessageLength: 160, // Standard SMS length
      maxRecipients: 100, // Reasonable limit for bulk sending
      supportedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI'], // Major countries
      features: ['delivery receipts', 'media messages', 'scheduled sending', 'bulk messaging']
    };
  }

  // Format phone number for international use
  formatPhoneNumber(phoneNumber: string, countryCode?: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If it already starts with +, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }

    // Add country code if not present
    if (countryCode && !cleaned.startsWith(countryCode)) {
      return `+${countryCode}${cleaned}`;
    }

    // Default to US if no country code
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    // Assume it's already international format
    return `+${cleaned}`;
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): { isValid: boolean; formatted?: string; error?: string } {
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Basic validation: should be 10-15 digits
    if (cleaned.length < 10 || cleaned.length > 15) {
      return {
        isValid: false,
        error: 'Phone number must be 10-15 digits'
      };
    }

    // Format the number
    const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+${cleaned}`;

    return {
      isValid: true,
      formatted
    };
  }

  // Get message cost estimate
  estimateCost(message: string, recipientCount: number = 1): {
    segments: number;
    costPerMessage: number;
    totalCost: number;
    currency: string;
  } {
    // SMS messages are split into 160-character segments
    const segments = Math.ceil(message.length / 160);

    // Approximate cost per message (varies by country and carrier)
    const costPerMessage = 0.0075; // USD

    return {
      segments,
      costPerMessage,
      totalCost: costPerMessage * segments * recipientCount,
      currency: 'USD'
    };
  }
}

export const smsService = SMSService.getInstance();