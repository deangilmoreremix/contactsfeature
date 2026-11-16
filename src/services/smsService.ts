/**
 * SMS Service — sends through the signed-in user's own Twilio account via the `send-sms`
 * Netlify function. Credentials are configured in Settings → Email & SMS and never touch the
 * browser. Nothing is simulated.
 */
import { messagingProviderService } from './messagingProviderService';

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
  /** 'CONTENT_FLAGGED' when blocked by content moderation */
  code?: string;
  categories?: string[];
  cost?: number;
  status?: string;
}

class SMSService {
  private static instance: SMSService;

  static getInstance(): SMSService {
    if (!SMSService.instance) SMSService.instance = new SMSService();
    return SMSService.instance;
  }

  async sendSMS(smsData: SMSData): Promise<SMSResult> {
    const validation = this.validatePhoneNumber(smsData.to);
    if (!validation.isValid) return { success: false, error: validation.error };
    try {
      const r = await messagingProviderService.sendSms({
        to: validation.formatted as string,
        message: smsData.message,
        from: smsData.from,
        contactId: smsData.metadata?.['contactId'],
      });
      return { success: r.success, messageId: r.messageSid, status: 'sent' };
    } catch (error) {
      const e = error as { code?: string; categories?: string[] };
      return { success: false, error: error instanceof Error ? error.message : 'SMS send failed', code: e?.code, categories: e?.categories };
    }
  }

  async sendBulkSMS(recipients: string[], message: string): Promise<SMSResult[]> {
    const out: SMSResult[] = [];
    for (const to of recipients) out.push(await this.sendSMS({ to, message }));
    return out;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { providers } = await messagingProviderService.list();
      return providers.some((p) => p.channel === 'sms' && p.status === 'active')
        ? { success: true }
        : { success: false, error: 'No SMS provider configured. Add Twilio in Settings → Email & SMS.' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not check providers' };
    }
  }

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