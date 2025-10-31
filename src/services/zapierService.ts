/**
 * Zapier Integration Service
 * Handles integration with Zapier for workflow automation
 */

export interface ZapierWebhook {
  id: string;
  name: string;
  url: string;
  description: string;
  triggers: string[];
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface ZapierTrigger {
  event: string;
  data: any;
  timestamp: string;
  source: 'contact_created' | 'contact_updated' | 'deal_closed' | 'email_sent' | 'meeting_scheduled';
}

export class ZapierService {
  private static instance: ZapierService;
  private webhooks: Map<string, ZapierWebhook> = new Map();

  static getInstance(): ZapierService {
    if (!ZapierService.instance) {
      ZapierService.instance = new ZapierService();
    }
    return ZapierService.instance;
  }

  /**
   * Register a new Zapier webhook
   */
  async registerWebhook(webhook: Omit<ZapierWebhook, 'id' | 'createdAt' | 'triggerCount'>): Promise<ZapierWebhook> {
    const newWebhook: ZapierWebhook = {
      ...webhook,
      id: `zapier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      triggerCount: 0
    };

    this.webhooks.set(newWebhook.id, newWebhook);
    return newWebhook;
  }

  /**
   * Trigger a Zapier webhook
   */
  async triggerWebhook(webhookId: string, trigger: ZapierTrigger): Promise<boolean> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || !webhook.isActive) {
      return false;
    }

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Source': 'contact-crm'
        },
        body: JSON.stringify({
          event: trigger.event,
          data: trigger.data,
          timestamp: trigger.timestamp,
          source: trigger.source,
          webhookId: webhook.id
        })
      });

      if (response.ok) {
        // Update webhook stats
        webhook.triggerCount++;
        webhook.lastTriggered = new Date().toISOString();
        this.webhooks.set(webhookId, webhook);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to trigger Zapier webhook:', error);
      return false;
    }
  }

  /**
   * Get all registered webhooks
   */
  getWebhooks(): ZapierWebhook[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId: string): ZapierWebhook | undefined {
    return this.webhooks.get(webhookId);
  }

  /**
   * Update webhook
   */
  updateWebhook(webhookId: string, updates: Partial<ZapierWebhook>): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return false;

    this.webhooks.set(webhookId, { ...webhook, ...updates });
    return true;
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId: string): boolean {
    return this.webhooks.delete(webhookId);
  }

  /**
   * Trigger webhooks for a specific event
   */
  async triggerEvent(event: string, data: any, source: ZapierTrigger['source']): Promise<void> {
    const trigger: ZapierTrigger = {
      event,
      data,
      timestamp: new Date().toISOString(),
      source
    };

    const promises = Array.from(this.webhooks.values())
      .filter(webhook => webhook.isActive && webhook.triggers.includes(event))
      .map(webhook => this.triggerWebhook(webhook.id, trigger));

    await Promise.allSettled(promises);
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(): { total: number; active: number; totalTriggers: number } {
    const webhooks = Array.from(this.webhooks.values());
    return {
      total: webhooks.length,
      active: webhooks.filter(w => w.isActive).length,
      totalTriggers: webhooks.reduce((sum, w) => sum + w.triggerCount, 0)
    };
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(webhookId: string): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Source': 'contact-crm',
          'X-Zapier-Test': 'true'
        },
        body: JSON.stringify({
          event: 'test',
          data: { message: 'Test webhook from Contact CRM' },
          timestamp: new Date().toISOString(),
          source: 'test'
        })
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { success: true, responseTime };
      } else {
        return {
          success: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const zapierService = ZapierService.getInstance();