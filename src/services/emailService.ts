/**
 * Email Service
 * Handles sending emails via various providers (SendGrid, Mailgun, SMTP)
 */

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
  template?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  type: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export type EmailProvider = 'sendgrid' | 'mailgun' | 'smtp';

class EmailService {
  private static instance: EmailService;
  private provider: EmailProvider = 'sendgrid';
  private config: Record<string, any> = {};

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  setProvider(provider: EmailProvider): void {
    this.provider = provider;
  }

  setConfig(config: Record<string, any>): void {
    this.config = { ...this.config, ...config };
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      switch (this.provider) {
        case 'sendgrid':
          return await this.sendViaSendGrid(emailData);
        case 'mailgun':
          return await this.sendViaMailgun(emailData);
        case 'smtp':
          return await this.sendViaSMTP(emailData);
        default:
          throw new Error(`Unsupported email provider: ${this.provider}`);
      }
    } catch (error) {
      console.error('Email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.provider
      };
    }
  }

  private async sendViaSendGrid(emailData: EmailData): Promise<EmailResult> {
    const apiKey = this.config['sendgridApiKey'] || (process.env as any)['SENDGRID_API_KEY'];
    const fromEmail = this.config['fromEmail'] || (process.env as any)['FROM_EMAIL'] || 'noreply@yourapp.com';

    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const sendGridData = {
      personalizations: [{
        to: [{ email: emailData.to }],
        subject: emailData.subject
      }],
      from: { email: fromEmail },
      reply_to: emailData.replyTo ? { email: emailData.replyTo } : undefined,
      content: [
        {
          type: 'text/html',
          value: emailData.html || emailData.body.replace(/\n/g, '<br>')
        }
      ],
      attachments: emailData.attachments?.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: 'attachment'
      })),
      custom_args: emailData.metadata
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendGridData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`SendGrid API error: ${response.status} ${errorData.message || ''}`);
    }

    // SendGrid returns 202 on success, no body
    return {
      success: true,
      provider: 'sendgrid'
    };
  }

  private async sendViaMailgun(emailData: EmailData): Promise<EmailResult> {
    const apiKey = this.config['mailgunApiKey'] || (process.env as any)['MAILGUN_API_KEY'];
    const domain = this.config['mailgunDomain'] || (process.env as any)['MAILGUN_DOMAIN'];
    const fromEmail = this.config['fromEmail'] || (process.env as any)['FROM_EMAIL'] || 'noreply@yourapp.com';

    if (!apiKey || !domain) {
      throw new Error('Mailgun API key and domain not configured');
    }

    const formData = new FormData();
    formData.append('from', `${fromEmail.split('@')[0]} <${fromEmail}>`);
    formData.append('to', emailData.to);
    formData.append('subject', emailData.subject);
    formData.append('html', emailData.html || emailData.body.replace(/\n/g, '<br>'));

    if (emailData.replyTo) {
      formData.append('h:Reply-To', emailData.replyTo);
    }

    emailData.attachments?.forEach(att => {
      const blob = new Blob([atob(att.content)], { type: att.type });
      formData.append('attachment', blob, att.filename);
    });

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Mailgun API error: ${response.status} ${errorData.message || ''}`);
    }

    const result = await response.json();

    return {
      success: true,
      messageId: result.id,
      provider: 'mailgun'
    };
  }

  private async sendViaSMTP(emailData: EmailData): Promise<EmailResult> {
    // For SMTP, we'll use a service like Resend or a custom SMTP implementation
    // For demo purposes, we'll simulate the call
    const smtpHost = this.config['smtpHost'] || (process.env as any)['SMTP_HOST'];
    const smtpPort = this.config['smtpPort'] || (process.env as any)['SMTP_PORT'] || 587;
    const smtpUser = this.config['smtpUser'] || (process.env as any)['SMTP_USER'];
    const smtpPass = this.config['smtpPass'] || (process.env as any)['SMTP_PASS'];

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('SMTP configuration incomplete');
    }

    // In a real implementation, you'd use a library like nodemailer
    // For demo purposes, we'll simulate success
    console.log('SMTP email would be sent:', {
      host: smtpHost,
      port: smtpPort,
      to: emailData.to,
      subject: emailData.subject
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      messageId: `smtp_${Date.now()}`,
      provider: 'smtp'
    };
  }

  // Test configuration
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Send a test email to verify configuration
      const testResult = await this.sendEmail({
        to: this.config['testEmail'] || 'test@example.com',
        subject: 'API Configuration Test',
        body: 'This is a test email to verify your email service configuration.',
        metadata: { test: true }
      });

      return { success: testResult.success, error: testResult.error || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }

  // Get provider-specific limits and capabilities
  getProviderLimits(): {
    dailyLimit?: number;
    monthlyLimit?: number;
    rateLimit?: number;
    features: string[];
  } {
    switch (this.provider) {
      case 'sendgrid':
        return {
          dailyLimit: 100, // Free tier limit
          rateLimit: 600, // per minute
          features: ['templates', 'analytics', 'attachments', 'scheduling']
        };
      case 'mailgun':
        return {
          dailyLimit: 5000, // Free tier limit
          rateLimit: 300, // per minute
          features: ['templates', 'analytics', 'attachments', 'webhooks']
        };
      case 'smtp':
        return {
          features: ['attachments', 'custom headers']
        };
      default:
        return { features: [] };
    }
  }
}

export const emailService = EmailService.getInstance();