// GPT-5 Tools Service - Email and Communication Integration
import { logger } from './logger.service';

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
  private apiKey = import.meta.env['VITE_OPENAI_API_KEY'];
  private model = import.meta.env['VITE_OPENAI_MODEL'] || 'gpt-5';

  constructor() {
    logger.info('GPT-5 Tools Service initialized', {
      model: this.model,
      hasApiKey: !!this.apiKey
    });
  }

  /**
   * Send email using GPT-5 tools to open Gmail
   */
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; message: string; gmailUrl?: string }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      logger.info('Sending email via GPT-5 tools', { to: emailData.to, subject: emailData.subject });

      // Use GPT-5 tools to generate Gmail compose URL
      const gmailUrl = this.generateGmailComposeUrl(emailData);

      // Use GPT-5 to validate and enhance the email
      const enhancedEmail = await this.enhanceEmailWithGPT5(emailData);

      logger.info('Email enhanced with GPT-5', { originalSubject: emailData.subject, enhancedSubject: enhancedEmail.subject });

      return {
        success: true,
        message: 'Email prepared successfully. Opening Gmail...',
        gmailUrl: this.generateGmailComposeUrl(enhancedEmail)
      };
    } catch (error) {
      logger.error('Failed to send email via GPT-5 tools', error as Error);
      return {
        success: false,
        message: `Failed to prepare email: ${(error as Error).message}`
      };
    }
  }

  /**
   * Send SMS using GPT-5 tools
   */
  async sendSMS(smsData: SMSData): Promise<{ success: boolean; message: string; smsAppUrl?: string }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      logger.info('Sending SMS via GPT-5 tools', { to: smsData.to });

      // Use GPT-5 to enhance the SMS message
      const enhancedSMS = await this.enhanceSMSWithGPT5(smsData);

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
  async makeCall(callData: CallData): Promise<{ success: boolean; message: string; callUrl?: string }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      logger.info('Making call via GPT-5 tools', { to: callData.to });

      // Use GPT-5 to prepare call notes and context
      const enhancedCall = await this.enhanceCallWithGPT5(callData);

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
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: emailData.to,
      su: emailData.subject,
      body: emailData.body
    });

    if (emailData.cc && emailData.cc.length > 0) {
      params.set('cc', emailData.cc.join(','));
    }

    if (emailData.bcc && emailData.bcc.length > 0) {
      params.set('bcc', emailData.bcc.join(','));
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
   * Use GPT-5 to enhance email content
   */
  private async enhanceEmailWithGPT5(emailData: EmailData): Promise<EmailData> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert email copywriter. Enhance the provided email to make it more professional, engaging, and effective. Keep the core message but improve the language, structure, and persuasiveness.'
            },
            {
              role: 'user',
              content: `Please enhance this email:

Subject: ${emailData.subject}

Body:
${emailData.body}

Return the enhanced email in JSON format with "subject" and "body" fields.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`GPT-5 API error: ${response.statusText}`);
      }

      const data = await response.json();
      const enhancedContent = JSON.parse(data.choices[0].message.content);

      return {
        ...emailData,
        subject: enhancedContent.subject || emailData.subject,
        body: enhancedContent.body || emailData.body
      };
    } catch (error) {
      logger.warn('Failed to enhance email with GPT-5, using original', error as Error);
      return emailData;
    }
  }

  /**
   * Use GPT-5 to enhance SMS content
   */
  private async enhanceSMSWithGPT5(smsData: SMSData): Promise<SMSData> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert SMS copywriter. Enhance the provided SMS message to make it concise, clear, and effective. Keep it under 160 characters if possible.'
            },
            {
              role: 'user',
              content: `Please enhance this SMS message:

"${smsData.message}"

Return the enhanced message as a JSON object with a "message" field.`
            }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`GPT-5 API error: ${response.statusText}`);
      }

      const data = await response.json();
      const enhancedContent = JSON.parse(data.choices[0].message.content);

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
  private async enhanceCallWithGPT5(callData: CallData): Promise<CallData> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert sales call strategist. Enhance the call preparation notes to make them more effective and professional.'
            },
            {
              role: 'user',
              content: `Please enhance these call preparation notes:

"${callData.notes || 'No specific notes provided'}"

Return enhanced notes as a JSON object with a "notes" field.`
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`GPT-5 API error: ${response.statusText}`);
      }

      const data = await response.json();
      const enhancedContent = JSON.parse(data.choices[0].message.content);

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