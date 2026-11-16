/**
 * Email Service — sends through the signed-in user's own provider via the `send-email`
 * Netlify function. Provider credentials are configured in Settings → Email & SMS and never
 * touch the browser. Nothing is simulated: without a provider, sends fail with NO_PROVIDER.
 */
import { messagingProviderService } from './messagingProviderService';

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
  /** 'CONTENT_FLAGGED' when blocked by content moderation */
  code?: string;
  categories?: string[];
  provider: string;
}

export type EmailProvider = 'resend' | 'sendgrid' | 'postmark' | 'mailgun';

class EmailService {
  private static instance: EmailService;

  static getInstance(): EmailService {
    if (!EmailService.instance) EmailService.instance = new EmailService();
    return EmailService.instance;
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      const r = await messagingProviderService.sendEmail({
        to: emailData.to,
        subject: emailData.subject,
        body_text: emailData.body,
        body_html: emailData.html,
        contact_id: emailData.metadata?.['contactId'],
        scheduled_for: emailData.metadata?.['scheduledFor'],
      });
      return { success: r.success, messageId: r.message_id, provider: r.provider || (r.queued ? 'queued' : 'unknown') };
    } catch (error) {
      const e = error as { code?: string; categories?: string[] };
      return { success: false, error: error instanceof Error ? error.message : 'Email send failed', code: e?.code, categories: e?.categories, provider: 'none' };
    }
  }

  async sendBulkEmails(emails: EmailData[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    for (const e of emails) results.push(await this.sendEmail(e));
    return results;
  }

  /** True when the user has at least one active email provider. */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { providers } = await messagingProviderService.list();
      return providers.some((p) => p.channel === 'email' && p.status === 'active')
        ? { success: true }
        : { success: false, error: 'No email provider configured. Add one in Settings → Email & SMS.' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not check providers' };
    }
  }
}

export const emailService = EmailService.getInstance();
