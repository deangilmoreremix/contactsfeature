/**
 * Email Scheduling Service
 * Handles scheduling emails for future delivery
 */

export interface ScheduledEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  scheduledFor: Date;
  contactId: string;
  template?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'scheduled' | 'sent' | 'cancelled';
  createdAt: Date;
  sentAt?: Date;
}

class EmailSchedulerService {
  private static instance: EmailSchedulerService;
  private scheduledEmails: Map<string, ScheduledEmail> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): EmailSchedulerService {
    if (!EmailSchedulerService.instance) {
      EmailSchedulerService.instance = new EmailSchedulerService();
    }
    return EmailSchedulerService.instance;
  }

  async scheduleEmail(emailData: Omit<ScheduledEmail, 'id' | 'status' | 'createdAt'>): Promise<ScheduledEmail> {
    const id = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const scheduledEmail: ScheduledEmail = {
      id,
      ...emailData,
      status: 'scheduled',
      createdAt: new Date()
    };

    this.scheduledEmails.set(id, scheduledEmail);

    // Schedule the email delivery
    const delay = scheduledEmail.scheduledFor.getTime() - Date.now();

    if (delay > 0) {
      const timer = setTimeout(() => {
        this.sendScheduledEmail(id);
      }, delay);

      this.timers.set(id, timer);
    } else {
      // If scheduled time is in the past, send immediately
      this.sendScheduledEmail(id);
    }

    return scheduledEmail;
  }

  private async sendScheduledEmail(emailId: string): Promise<void> {
    const email = this.scheduledEmails.get(emailId);
    if (!email || email.status !== 'scheduled') return;

    try {
      // In a real implementation, this would integrate with email service providers
      // For demo purposes, we'll simulate sending via mailto
      const mailtoUrl = `mailto:${email.to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
      window.open(mailtoUrl, '_blank');

      // Update status
      email.status = 'sent';
      email.sentAt = new Date();
      this.scheduledEmails.set(emailId, email);

      // Clean up timer
      const timer = this.timers.get(emailId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(emailId);
      }

      console.log(`Scheduled email sent to ${email.to}: ${email.subject}`);
    } catch (error) {
      console.error('Failed to send scheduled email:', error);
    }
  }

  cancelScheduledEmail(emailId: string): boolean {
    const email = this.scheduledEmails.get(emailId);
    if (!email || email.status !== 'scheduled') return false;

    // Cancel timer
    const timer = this.timers.get(emailId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(emailId);
    }

    // Update status
    email.status = 'cancelled';
    this.scheduledEmails.set(emailId, email);

    return true;
  }

  getScheduledEmails(contactId?: string): ScheduledEmail[] {
    const emails = Array.from(this.scheduledEmails.values());

    if (contactId) {
      return emails.filter(email => email.contactId === contactId);
    }

    return emails;
  }

  getUpcomingEmails(hours: number = 24): ScheduledEmail[] {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return Array.from(this.scheduledEmails.values())
      .filter(email =>
        email.status === 'scheduled' &&
        email.scheduledFor <= futureTime &&
        email.scheduledFor > now
      )
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }
}

export const emailSchedulerService = EmailSchedulerService.getInstance();