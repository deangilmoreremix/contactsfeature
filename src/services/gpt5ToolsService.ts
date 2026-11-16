// GPT-5 Tools Service - Email and Communication Integration
import { logger } from './logger.service';
import { aiCache } from '../utils/cache';
import { sanitizeString } from '../utils/validation';
import { aiJson } from './aiClient';
import type { LiveOptions } from './liveOptions';

interface EmailData {
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

interface SMSData {
  to: string;
  message: string;
}

interface CallData {
  to: string;
  notes?: string;
}

export class GPT5ToolsService {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    logger.info('AI Tools Service initialized (server-proxied)');
  }

  /**
    * Prepare email using GPT-5 tools to open Gmail compose window
    */
   async prepareEmail(emailData: EmailData, live?: LiveOptions): Promise<{ success: boolean; message: string; gmailUrl?: string }> {

     try {
       logger.info('Preparing email via GPT-5 tools', { to: emailData.to, subject: emailData.subject });

       // Check cache first
       const cacheKey = aiCache.getEmailCacheKey(emailData);
       let enhancedEmail = aiCache.get(cacheKey);

       if (!enhancedEmail) {
         // Use GPT-5 to validate and enhance the email
         enhancedEmail = await this.enhanceEmailWithGPT5(emailData, live);
         // Cache the result
         aiCache.set(cacheKey, enhancedEmail);
       }

       logger.info('Email enhanced with GPT-5', { originalSubject: emailData.subject, enhancedSubject: enhancedEmail.subject });

       return {
         success: true,
         message: 'Email prepared successfully. Opening Gmail compose window...',
         gmailUrl: this.generateGmailComposeUrl(enhancedEmail)
       };
     } catch (error) {
       logger.error('Failed to prepare email via GPT-5 tools', error as Error);
       return {
         success: false,
         message: `Failed to prepare email: ${(error as Error).message}`
       };
     }
   }

  /**
   * Send SMS using GPT-5 tools
   */
  async sendSMS(smsData: SMSData, live?: LiveOptions): Promise<{ success: boolean; message: string; smsAppUrl?: string }> {

    try {
      logger.info('Sending SMS via GPT-5 tools', { to: smsData.to });

      // Use GPT-5 to enhance the SMS message
      const enhancedSMS = await this.enhanceSMSWithGPT5(smsData, live);

      // Generate SMS app URL (this would depend on the user's SMS app)
      const smsUrl = this.generateSMSUrl(enhancedSMS);

      return {
        success: true,
        message: 'SMS prepared successfully. Opening SMS app...',
        smsAppUrl: smsUrl
      };
    } catch (error) {
      logger.error('Failed to send SMS via GPT-5 tools', error as Error);
      return {
        success: false,
        message: `Failed to prepare SMS: ${(error as Error).message}`
      };
    }
  }

  /**
   * Make call using GPT-5 tools
   */
  async makeCall(callData: CallData, live?: LiveOptions): Promise<{ success: boolean; message: string; callUrl?: string }> {

    try {
      logger.info('Making call via GPT-5 tools', { to: callData.to });

      // Use GPT-5 to prepare call notes and context
      const enhancedCall = await this.enhanceCallWithGPT5(callData, live);

      // Generate call URL (this would depend on the user's calling app like Skype)
      const callUrl = this.generateCallUrl(enhancedCall);

      return {
        success: true,
        message: 'Call prepared successfully. Opening calling app...',
        callUrl: callUrl
      };
    } catch (error) {
      logger.error('Failed to make call via GPT-5 tools', error as Error);
      return {
        success: false,
        message: `Failed to prepare call: ${(error as Error).message}`
      };
    }
  }

  /**
   * Generate Gmail compose URL with email data
   */
  private generateGmailComposeUrl(emailData: EmailData): string {
    // Properly encode URL parameters to handle special characters
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: encodeURIComponent(emailData.to),
      su: encodeURIComponent(emailData.subject),
      body: encodeURIComponent(emailData.body)
    });

    if (emailData.cc && emailData.cc.length > 0) {
      params.set('cc', emailData.cc.map(email => encodeURIComponent(email)).join(','));
    }

    if (emailData.bcc && emailData.bcc.length > 0) {
      params.set('bcc', emailData.bcc.map(email => encodeURIComponent(email)).join(','));
    }

    return `https://mail.google.com/mail/u/0/?${params.toString()}`;
  }

  /**
   * Generate SMS URL (generic, would need to be adapted for specific SMS apps)
   */
  private generateSMSUrl(smsData: SMSData): string {
    // This is a generic SMS URL - in practice, you'd need to detect the user's SMS app
    const encodedMessage = encodeURIComponent(smsData.message);
    return `sms:${smsData.to}?body=${encodedMessage}`;
  }

  /**
   * Generate call URL (generic, would need to be adapted for specific calling apps like Skype)
   */
  private generateCallUrl(callData: CallData): string {
    // This is a generic call URL - in practice, you'd need to detect the user's calling app
    return `tel:${callData.to}`;
  }

  /**
   * Use GPT-5 to enhance email content with retry logic
   */
  private async enhanceEmailWithGPT5(emailData: EmailData, live?: LiveOptions): Promise<EmailData> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const enhancedContent = await aiJson<{ subject: string; body: string }>({
          role: 'fast',
          instructions: 'You are an expert email copywriter. Enhance the provided email to make it more professional, engaging, and effective. Keep the core message but improve the language, structure, and persuasiveness.',
          input: `Please enhance this email:

Subject: ${emailData.subject}

Body:
${emailData.body}`,
          schema: { type: 'object', properties: { subject: { type: 'string' },body: { type: 'string' } }, required: ['subject','body'], additionalProperties: false },
          schemaName: 'enhanced_email',
          maxOutputTokens: 1000
        }, live);

        // Sanitize AI-generated content
        const sanitizedSubject = sanitizeString(enhancedContent.subject || emailData.subject);
        const sanitizedBody = sanitizeString(enhancedContent.body || emailData.body);

        return {
          ...emailData,
          subject: sanitizedSubject,
          body: sanitizedBody
        };
      } catch (error) {
        logger.warn(`Email enhancement attempt ${attempt} failed:`, error as Error);

        if (attempt === this.maxRetries) {
          logger.warn('All email enhancement attempts failed, using original content');
          return emailData;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1)));
      }
    }

    return emailData;
  }

  /**
   * Use GPT-5 to enhance SMS content
   */
  private async enhanceSMSWithGPT5(smsData: SMSData, live?: LiveOptions): Promise<SMSData> {
    try {
      const enhancedContent = await aiJson<{ message: string }>({
        role: 'fast',
        instructions: 'You are an expert SMS copywriter. Enhance the provided SMS message to make it concise, clear, and effective. Keep it under 160 characters if possible.',
        input: `Please enhance this SMS message:\n\n"${smsData.message}"`,
        schema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'], additionalProperties: false },
        schemaName: 'enhanced_sms',
        maxOutputTokens: 200
      }, live);

      return {
        ...smsData,
        message: enhancedContent.message || smsData.message
      };
    } catch (error) {
      logger.warn('Failed to enhance SMS with GPT-5, using original', error as Error);
      return smsData;
    }
  }

  /**
   * Use GPT-5 to enhance call preparation
   */
  private async enhanceCallWithGPT5(callData: CallData, live?: LiveOptions): Promise<CallData> {
    try {
      const enhancedContent = await aiJson<{ notes: string }>({
        role: 'fast',
        instructions: 'You are an expert sales call strategist. Enhance the call preparation notes to make them more effective and professional.',
        input: `Please enhance these call preparation notes:\n\n"${callData.notes || 'No specific notes provided'}"`,
        schema: { type: 'object', properties: { notes: { type: 'string' } }, required: ['notes'], additionalProperties: false },
        schemaName: 'enhanced_call_notes',
        maxOutputTokens: 300
      }, live);

      return {
        ...callData,
        notes: enhancedContent.notes || callData.notes
      };
    } catch (error) {
      logger.warn('Failed to enhance call notes with GPT-5, using original', error as Error);
      return callData;
    }
  }
}

export const gpt5ToolsService = new GPT5ToolsService();