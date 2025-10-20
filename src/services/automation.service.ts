/**
 * Contact Automation Service
 * Handles automated workflows and triggers for contact management
 */

import { contactAPI } from './contact-api.service';
import { logger } from './logger.service';
import { Contact } from '../types';
import { ContactAutomation, AutomationExecution } from '../types/automation';

export class AutomationService {
  private static instance: AutomationService;

  static getInstance(): AutomationService {
    if (!AutomationService.instance) {
      AutomationService.instance = new AutomationService();
    }
    return AutomationService.instance;
  }

  /**
   * Process contact automation based on trigger and conditions
   */
  async processContactAutomation(
    contact: Contact,
    trigger: string,
    changedFields?: string[]
  ): Promise<void> {
    try {
      // Get active automations for this trigger
      const automations = await this.getActiveAutomations(trigger);

      for (const automation of automations) {
        if (await this.evaluateConditions(contact, automation, changedFields)) {
          await this.executeActions(contact, automation);
        }
      }
    } catch (error) {
      logger.error('Automation processing failed', error as Error, {
        contactId: contact.id,
        trigger
      });
    }
  }

  /**
   * Evaluate automation conditions
   */
  private async evaluateConditions(
    contact: Contact,
    automation: ContactAutomation,
    changedFields?: string[]
  ): Promise<boolean> {
    for (const condition of automation.conditions) {
      // Check if condition is relevant for this trigger
      if (changedFields && !changedFields.includes(condition.field)) {
        continue;
      }

      const fieldValue = (contact as any)[condition.field];
      const conditionMet = this.evaluateCondition(fieldValue, condition);

      if (!conditionMet) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(fieldValue: any, condition: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return fieldValue && fieldValue !== '';
      default:
        return false;
    }
  }

  /**
   * Execute automation actions
   */
  private async executeActions(contact: Contact, automation: ContactAutomation): Promise<void> {
    for (const action of automation.actions) {
      try {
        await this.executeAction(contact, action);
      } catch (error) {
        logger.error('Automation action failed', error as Error, {
          contactId: contact.id,
          automationId: automation.id,
          actionType: action.type
        });
      }
    }
  }

  /**
   * Execute individual action
   */
  private async executeAction(contact: Contact, action: any): Promise<void> {
    switch (action.type) {
      case 'update_field':
        await contactAPI.updateContact(contact.id, { [action.config.field]: action.config.value });
        break;
      case 'send_email':
        await this.sendEmail(contact, action.config);
        break;
      case 'send_notification':
        await this.sendNotification(contact, action.config);
        break;
      case 'create_task':
        await this.createTask(contact, action.config);
        break;
      case 'webhook':
        await this.callWebhook(contact, action.config);
        break;
      case 'api_call':
        await this.callExternalAPI(contact, action.config);
        break;
    }
  }

  // Action implementations
  private async sendEmail(contact: Contact, config: any): Promise<void> {
    const response = await fetch('/.netlify/functions/send-contact-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact,
        templateId: config.templateId,
        automationId: config.automationId
      })
    });

    if (!response.ok) {
      throw new Error(`Email sending failed: ${response.statusText}`);
    }
  }

  private async sendNotification(contact: Contact, config: any): Promise<void> {
    // Implementation for notifications
    logger.info('Sending notification', { contactId: contact.id, config });
  }

  private async createTask(contact: Contact, config: any): Promise<void> {
    // Implementation for task creation
    logger.info('Creating task', { contactId: contact.id, config });
  }

  private async callWebhook(contact: Contact, config: any): Promise<void> {
    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'contact_automation',
        contact,
        automation: config.automationId
      })
    });
  }

  private async callExternalAPI(contact: Contact, config: any): Promise<void> {
    // Implementation for external API calls
    logger.info('Calling external API', { contactId: contact.id, config });
  }

  // CRUD operations for automations
  async getActiveAutomations(trigger?: string): Promise<ContactAutomation[]> {
    // Implementation to fetch active automations
    // This would typically fetch from a database
    return [];
  }

  async createAutomation(automation: Omit<ContactAutomation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContactAutomation> {
    // Implementation to create automation
    const newAutomation: ContactAutomation = {
      ...automation,
      id: `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    logger.info('Automation created', { automationId: newAutomation.id });
    return newAutomation;
  }

  async updateAutomation(id: string, updates: Partial<ContactAutomation>): Promise<ContactAutomation> {
    // Implementation to update automation
    logger.info('Automation updated', { automationId: id, updates: Object.keys(updates) });
    return {} as ContactAutomation;
  }

  async deleteAutomation(id: string): Promise<void> {
    // Implementation to delete automation
    logger.info('Automation deleted', { automationId: id });
  }

  /**
   * Get automation execution history
   */
  async getAutomationHistory(contactId?: string): Promise<AutomationExecution[]> {
    // Implementation to fetch automation execution history
    return [];
  }
}

export const automationService = AutomationService.getInstance();