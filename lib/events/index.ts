/**
 * Event System Index
 * 
 * Exports all event-related modules for easy importing.
 */

// Event Bus
export { eventBus, EventType, EventPriority, EventHandler, PrioritizedEventHandler, EventBusConfig } from './eventBus';
export type { ProcessedEvent } from './eventBus';

// Types
export * from './types';

// Webhook Validation
export { 
  validateWebhookSignature, 
  autoValidateWebhook, 
  generateWebhookSignature,
  createWebhookValidationMiddleware,
  type WebhookRequest,
  type ValidationResult,
  type EmailProvider
} from './webhookValidation';

// Webhook Handlers
export {
  handleEmailDeliveryWebhook,
  handleEmailOpenWebhook,
  handleEmailClickWebhook,
  handleEmailReplyWebhook,
  handleInboundMessageWebhook
} from './webhookHandlers';

// Scheduled Jobs
export {
  checkSequenceStepsDue,
  checkAutopilotsTick,
  registerScheduledJobs,
  startScheduledJobs,
  stopScheduledJobs
} from './scheduledJobs';

// Cron Runner
export { cronRunner } from './cronRunner';
export type { CronInterval, ScheduledJob, JobResult, JobStats } from './cronRunner';
