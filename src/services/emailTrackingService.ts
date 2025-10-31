/**
 * Email Tracking and Analytics Service
 * Tracks email opens, clicks, and engagement metrics
 */

export interface EmailEvent {
  id: string;
  emailId: string;
  contactId: string;
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
  linkUrl?: string; // For click events
  metadata?: any;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  sender: string;
  recipientCount: number;
  sentAt: string;
  status: 'draft' | 'sending' | 'sent' | 'completed';
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
  };
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  category: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  performance: {
    avgOpenRate: number;
    avgClickRate: number;
    totalSends: number;
  };
}

export class EmailTrackingService {
  private static instance: EmailTrackingService;
  private emailEvents: Map<string, EmailEvent[]> = new Map();
  private campaigns: Map<string, EmailCampaign> = new Map();
  private templates: Map<string, EmailTemplate> = new Map();

  static getInstance(): EmailTrackingService {
    if (!EmailTrackingService.instance) {
      EmailTrackingService.instance = new EmailTrackingService();
    }
    return EmailTrackingService.instance;
  }

  /**
   * Track email event
   */
  trackEvent(event: Omit<EmailEvent, 'id' | 'timestamp'>): EmailEvent {
    const emailEvent: EmailEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    const contactEvents = this.emailEvents.get(event.contactId) || [];
    contactEvents.push(emailEvent);
    this.emailEvents.set(event.contactId, contactEvents);

    // Update campaign metrics if this event is part of a campaign
    if (event.metadata?.campaignId) {
      this.updateCampaignMetrics(event.metadata.campaignId, event.eventType);
    }

    return emailEvent;
  }

  /**
   * Track email open
   */
  trackOpen(emailId: string, contactId: string, userAgent?: string, ipAddress?: string): EmailEvent {
    return this.trackEvent({
      emailId,
      contactId,
      eventType: 'opened',
      userAgent,
      ipAddress,
      metadata: { source: 'tracking_pixel' }
    });
  }

  /**
   * Track email click
   */
  trackClick(emailId: string, contactId: string, linkUrl: string, userAgent?: string, ipAddress?: string): EmailEvent {
    return this.trackEvent({
      emailId,
      contactId,
      eventType: 'clicked',
      linkUrl,
      userAgent,
      ipAddress,
      metadata: { source: 'link_tracking' }
    });
  }

  /**
   * Get email events for a contact
   */
  getContactEvents(contactId: string, limit: number = 100): EmailEvent[] {
    const events = this.emailEvents.get(contactId) || [];
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get email analytics for a contact
   */
  getContactAnalytics(contactId: string): {
    totalEmails: number;
    openRate: number;
    clickRate: number;
    lastActivity: string;
    preferredDevice: string;
    preferredTime: string;
    engagementScore: number;
  } {
    const events = this.getContactEvents(contactId, 1000);

    if (events.length === 0) {
      return {
        totalEmails: 0,
        openRate: 0,
        clickRate: 0,
        lastActivity: '',
        preferredDevice: '',
        preferredTime: '',
        engagementScore: 0
      };
    }

    const sentEvents = events.filter(e => e.eventType === 'sent');
    const openEvents = events.filter(e => e.eventType === 'opened');
    const clickEvents = events.filter(e => e.eventType === 'clicked');

    const openRate = sentEvents.length > 0 ? (openEvents.length / sentEvents.length) * 100 : 0;
    const clickRate = sentEvents.length > 0 ? (clickEvents.length / sentEvents.length) * 100 : 0;

    // Calculate engagement score (0-100)
    const engagementScore = Math.min(100, (openRate * 0.6) + (clickRate * 0.4));

    // Find preferred device
    const deviceCounts = events.reduce((acc, event) => {
      const device = event.deviceInfo?.type || 'unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredDevice = Object.entries(deviceCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

    // Find preferred time (hour of day)
    const hourCounts = events.reduce((acc, event) => {
      const hour = new Date(event.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const preferredHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 0;

    const preferredTime = `${preferredHour.toString().padStart(2, '0')}:00`;

    return {
      totalEmails: sentEvents.length,
      openRate,
      clickRate,
      lastActivity: events[0]?.timestamp || '',
      preferredDevice,
      preferredTime,
      engagementScore
    };
  }

  /**
   * Create email campaign
   */
  createCampaign(campaign: Omit<EmailCampaign, 'id' | 'metrics' | 'openRate' | 'clickRate' | 'bounceRate' | 'unsubscribeRate'>): EmailCampaign {
    const newCampaign: EmailCampaign = {
      ...campaign,
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metrics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0
      },
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0
    };

    this.campaigns.set(newCampaign.id, newCampaign);
    return newCampaign;
  }

  /**
   * Update campaign metrics
   */
  private updateCampaignMetrics(campaignId: string, eventType: EmailEvent['eventType']): void {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    // Update metrics
    switch (eventType) {
      case 'sent':
        campaign.metrics.sent++;
        break;
      case 'delivered':
        campaign.metrics.delivered++;
        break;
      case 'opened':
        campaign.metrics.opened++;
        break;
      case 'clicked':
        campaign.metrics.clicked++;
        break;
      case 'bounced':
        campaign.metrics.bounced++;
        break;
      case 'complained':
        campaign.metrics.complained++;
        break;
      case 'unsubscribed':
        campaign.metrics.unsubscribed++;
        break;
    }

    // Recalculate rates
    campaign.openRate = campaign.metrics.sent > 0 ? (campaign.metrics.opened / campaign.metrics.sent) * 100 : 0;
    campaign.clickRate = campaign.metrics.sent > 0 ? (campaign.metrics.clicked / campaign.metrics.sent) * 100 : 0;
    campaign.bounceRate = campaign.metrics.sent > 0 ? (campaign.metrics.bounced / campaign.metrics.sent) * 100 : 0;
    campaign.unsubscribeRate = campaign.metrics.sent > 0 ? (campaign.metrics.unsubscribed / campaign.metrics.sent) * 100 : 0;

    this.campaigns.set(campaignId, campaign);
  }

  /**
   * Get campaign by ID
   */
  getCampaign(campaignId: string): EmailCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * Get all campaigns
   */
  getCampaigns(limit: number = 50): EmailCampaign[] {
    return Array.from(this.campaigns.values())
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);
  }

  /**
   * Create email template
   */
  createTemplate(template: Omit<EmailTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt' | 'performance'>): EmailTemplate {
    const newTemplate: EmailTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      performance: {
        avgOpenRate: 0,
        avgClickRate: 0,
        totalSends: 0
      }
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  /**
   * Get email template
   */
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getTemplates(category?: string): EmailTemplate[] {
    const templates = Array.from(this.templates.values());

    if (category) {
      return templates.filter(t => t.category === category);
    }

    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Update template performance
   */
  updateTemplatePerformance(templateId: string, openRate: number, clickRate: number): void {
    const template = this.templates.get(templateId);
    if (!template) return;

    template.usageCount++;
    template.performance.totalSends++;

    // Update rolling averages
    const weight = 1 / template.performance.totalSends;
    template.performance.avgOpenRate = (template.performance.avgOpenRate * (1 - weight)) + (openRate * weight);
    template.performance.avgClickRate = (template.performance.avgClickRate * (1 - weight)) + (clickRate * weight);

    template.updatedAt = new Date().toISOString();
    this.templates.set(templateId, template);
  }

  /**
   * Generate email analytics report
   */
  generateAnalyticsReport(contactId?: string, dateRange?: { start: Date; end: Date }): {
    overview: {
      totalEmails: number;
      avgOpenRate: number;
      avgClickRate: number;
      totalContacts: number;
    };
    trends: {
      date: string;
      sent: number;
      opened: number;
      clicked: number;
    }[];
    topPerformers: {
      templateId: string;
      templateName: string;
      openRate: number;
      clickRate: number;
    }[];
    recommendations: string[];
  } {
    let allEvents: EmailEvent[] = [];

    if (contactId) {
      allEvents = this.getContactEvents(contactId, 10000);
    } else {
      // Get events for all contacts
      allEvents = Array.from(this.emailEvents.values()).flat();
    }

    // Filter by date range if provided
    if (dateRange) {
      allEvents = allEvents.filter(event =>
        new Date(event.timestamp) >= dateRange.start &&
        new Date(event.timestamp) <= dateRange.end
      );
    }

    const sentEvents = allEvents.filter(e => e.eventType === 'sent');
    const openEvents = allEvents.filter(e => e.eventType === 'opened');
    const clickEvents = allEvents.filter(e => e.eventType === 'clicked');

    // Calculate overview metrics
    const totalEmails = sentEvents.length;
    const avgOpenRate = totalEmails > 0 ? (openEvents.length / totalEmails) * 100 : 0;
    const avgClickRate = totalEmails > 0 ? (clickEvents.length / totalEmails) * 100 : 0;
    const totalContacts = new Set(allEvents.map(e => e.contactId)).size;

    // Generate trends data (last 30 days)
    const trends: Record<string, { sent: number; opened: number; clicked: number }> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    allEvents.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!trends[date]) {
        trends[date] = { sent: 0, opened: 0, clicked: 0 };
      }

      switch (event.eventType) {
        case 'sent':
          trends[date].sent++;
          break;
        case 'opened':
          trends[date].opened++;
          break;
        case 'clicked':
          trends[date].clicked++;
          break;
      }
    });

    const trendsData = Object.entries(trends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // Get top performing templates
    const templatePerformance = Array.from(this.templates.values())
      .filter(t => t.performance.totalSends > 0)
      .sort((a, b) => b.performance.avgOpenRate - a.performance.avgOpenRate)
      .slice(0, 5)
      .map(t => ({
        templateId: t.id,
        templateName: t.name,
        openRate: t.performance.avgOpenRate,
        clickRate: t.performance.avgClickRate
      }));

    // Generate recommendations
    const recommendations: string[] = [];

    if (avgOpenRate < 20) {
      recommendations.push('Consider improving email subject lines to increase open rates');
    }

    if (avgClickRate < 5) {
      recommendations.push('Email content may need more compelling calls-to-action');
    }

    if (templatePerformance.length === 0) {
      recommendations.push('Create and use email templates to improve consistency and performance');
    }

    if (totalEmails < 10) {
      recommendations.push('Send more emails to gather sufficient data for analysis');
    }

    return {
      overview: {
        totalEmails,
        avgOpenRate,
        avgClickRate,
        totalContacts
      },
      trends: trendsData,
      topPerformers: templatePerformance,
      recommendations
    };
  }
}

export const emailTrackingService = EmailTrackingService.getInstance();