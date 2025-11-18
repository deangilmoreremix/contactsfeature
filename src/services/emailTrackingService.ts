/**
 * Email Tracking Service
 * Tracks email interactions and engagement metrics
 */

export interface EmailEvent {
  id: string;
  emailId: string;
  contactId: string;
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed';
  timestamp: Date;
  metadata?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
}

export interface EmailMetrics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  averageResponseTime: number;
}

class EmailTrackingService {
  private static instance: EmailTrackingService;
  private events: EmailEvent[] = [];
  private metricsCache: Map<string, EmailMetrics> = new Map();

  static getInstance(): EmailTrackingService {
    if (!EmailTrackingService.instance) {
      EmailTrackingService.instance = new EmailTrackingService();
    }
    return EmailTrackingService.instance;
  }

  trackEvent(event: Omit<EmailEvent, 'id' | 'timestamp'>): EmailEvent {
    const emailEvent: EmailEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    };

    this.events.push(emailEvent);

    // Clear cached metrics for this contact
    this.metricsCache.delete(event.contactId);

    console.log(`Email event tracked: ${event.eventType} for contact ${event.contactId}`);

    return emailEvent;
  }

  getEventsForContact(contactId: string, limit: number = 50): EmailEvent[] {
    return this.events
      .filter(event => event.contactId === contactId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getEventsForEmail(emailId: string): EmailEvent[] {
    return this.events
      .filter(event => event.emailId === emailId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getMetricsForContact(contactId: string): EmailMetrics {
    // Check cache first
    const cached = this.metricsCache.get(contactId);
    if (cached) return cached;

    const contactEvents = this.events.filter(event => event.contactId === contactId);

    const metrics: EmailMetrics = {
      totalSent: contactEvents.filter(e => e.eventType === 'sent').length,
      totalOpened: contactEvents.filter(e => e.eventType === 'opened').length,
      totalClicked: contactEvents.filter(e => e.eventType === 'clicked').length,
      totalReplied: contactEvents.filter(e => e.eventType === 'replied').length,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      averageResponseTime: 0
    };

    // Calculate rates
    if (metrics.totalSent > 0) {
      metrics.openRate = (metrics.totalOpened / metrics.totalSent) * 100;
      metrics.clickRate = (metrics.totalClicked / metrics.totalSent) * 100;
      metrics.replyRate = (metrics.totalReplied / metrics.totalSent) * 100;
    }

    // Calculate average response time (time between sent and first reply)
    const sentEvents = contactEvents.filter(e => e.eventType === 'sent');
    const replyEvents = contactEvents.filter(e => e.eventType === 'replied');

    if (sentEvents.length > 0 && replyEvents.length > 0) {
      const responseTimes: number[] = [];

      sentEvents.forEach(sentEvent => {
        const replyEvent = replyEvents.find(reply =>
          reply.timestamp > sentEvent.timestamp &&
          replyEvents.filter(r => r.timestamp > sentEvent.timestamp && r.timestamp < reply.timestamp).length === 0
        );

        if (replyEvent) {
          responseTimes.push(replyEvent.timestamp.getTime() - sentEvent.timestamp.getTime());
        }
      });

      if (responseTimes.length > 0) {
        metrics.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      }
    }

    // Cache the metrics
    this.metricsCache.set(contactId, metrics);

    return metrics;
  }

  getOverallMetrics(): EmailMetrics {
    const allEvents = this.events;

    const metrics: EmailMetrics = {
      totalSent: allEvents.filter(e => e.eventType === 'sent').length,
      totalOpened: allEvents.filter(e => e.eventType === 'opened').length,
      totalClicked: allEvents.filter(e => e.eventType === 'clicked').length,
      totalReplied: allEvents.filter(e => e.eventType === 'replied').length,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      averageResponseTime: 0
    };

    // Calculate rates
    if (metrics.totalSent > 0) {
      metrics.openRate = (metrics.totalOpened / metrics.totalSent) * 100;
      metrics.clickRate = (metrics.totalClicked / metrics.totalSent) * 100;
      metrics.replyRate = (metrics.totalReplied / metrics.totalSent) * 100;
    }

    return metrics;
  }

  // Simulate tracking pixel for demo purposes
  generateTrackingPixel(emailId: string, contactId: string): string {
    // In a real implementation, this would generate a unique tracking URL
    // For demo purposes, we'll return a placeholder
    return `https://track.example.com/pixel/${emailId}/${contactId}`;
  }

  // Simulate link tracking
  generateTrackedLink(originalUrl: string, emailId: string, contactId: string): string {
    // In a real implementation, this would generate a tracked redirect URL
    // For demo purposes, we'll return the original URL
    return originalUrl;
  }
}

export const emailTrackingService = EmailTrackingService.getInstance();