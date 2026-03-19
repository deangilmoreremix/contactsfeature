/**
 * Event Types and Payload Structures
 * 
 * This module defines all event types and their corresponding payload
 * structures for the event-driven architecture.
 */

// ============================================================================
// Event Type Definitions
// ============================================================================

export type EventType =
  // Lead/Contact Events
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'LEAD_QUALIFIED'
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  
  // Email Events
  | 'MESSAGE_SENT'
  | 'MESSAGE_DELIVERED'
  | 'MESSAGE_FAILED'
  | 'MESSAGE_OPENED'
  | 'LINK_CLICKED'
  | 'REPLY_RECEIVED'
  | 'BOUNCE_RECORDED'
  | 'UNSUBSCRIBE_RECORDED'
  
  // Sequence Events
  | 'SEQUENCE_STEP_DUE'
  | 'SEQUENCE_STEP_COMPLETED'
  | 'SEQUENCE_PAUSED'
  | 'SEQUENCE_RESUMED'
  | 'SEQUENCE_COMPLETED'
  | 'SEQUENCE_ABORTED'
  
  // Meeting Events
  | 'MEETING_BOOKED'
  | 'MEETING_CANCELLED'
  | 'MEETING_RESCHEDULED'
  | 'MEETING_COMPLETED'
  
  // Autopilot Events
  | 'AUTOPILOT_TICK'
  | 'AUTOPILOT_STARTED'
  | 'AUTOPILOT_STOPPED'
  | 'AUTOPILOT_ERROR'
  
  // Webhook Events
  | 'WEBHOOK_RECEIVED'
  | 'WEBHOOK_VALIDATED'
  | 'WEBHOOK_FAILED';

// ============================================================================
// Event Priority Levels
// ============================================================================

export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Get priority for an event type
 */
export function getEventPriority(type: EventType): EventPriority {
  const priorityMap: Partial<Record<EventType, EventPriority>> = {
    MESSAGE_FAILED: EventPriority.CRITICAL,
    AUTOPILOT_ERROR: EventPriority.CRITICAL,
    MEETING_BOOKED: EventPriority.HIGH,
    REPLY_RECEIVED: EventPriority.HIGH,
    SEQUENCE_STEP_DUE: EventPriority.NORMAL,
    AUTOPILOT_TICK: EventPriority.LOW,
    MESSAGE_SENT: EventPriority.NORMAL
  };
  
  return priorityMap[type] ?? EventPriority.NORMAL;
}

// ============================================================================
// Base Event Interface
// ============================================================================

export interface BaseEvent {
  id: string;
  type: EventType;
  idempotencyKey: string;
  timestamp: Date;
  source: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface ProcessedEvent extends BaseEvent {
  payload: any;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  retryCount?: number;
}

// ============================================================================
// Payload Structures - Email Events
// ============================================================================

export interface EmailSentPayload {
  messageId: string;
  providerMessageId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  sequenceId?: string;
  sequenceStepId?: string;
  contactId: string;
  provider: 'agentmail' | 'sendgrid' | 'mailgun' | 'postmark' | 'ses';
}

export interface EmailDeliveredPayload {
  messageId: string;
  providerMessageId: string;
  deliveredAt: Date;
  provider: string;
}

export interface EmailOpenedPayload {
  messageId: string;
  openedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
  };
}

export interface LinkClickedPayload {
  messageId: string;
  url: string;
  clickedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface ReplyReceivedPayload {
  messageId: string;
  fromEmail: string;
  subject?: string;
  body: string;
  bodyPlain?: string;
  receivedAt: Date;
  inReplyTo?: string;
  references?: string[];
  metadata?: Record<string, any>;
}

export interface BounceRecordedPayload {
  messageId: string;
  bounceType: 'hard' | 'soft';
  bounceReason: string;
  bouncedAt: Date;
}

export interface UnsubscribeRecordedPayload {
  messageId: string;
  email: string;
  reason?: string;
  unsubscribedAt: Date;
}

// ============================================================================
// Payload Structures - Sequence Events
// ============================================================================

export interface SequenceStepDuePayload {
  sequenceId: string;
  sequenceStepId: string;
  contactId: string;
  scheduledFor: Date;
  messageId?: string;
}

export interface SequenceStepCompletedPayload {
  sequenceId: string;
  sequenceStepId: string;
  contactId: string;
  completedAt: Date;
  action: 'sent' | 'wait' | 'condition';
}

export interface SequencePausedPayload {
  sequenceId: string;
  contactId: string;
  pausedAt: Date;
  reason?: string;
}

export interface SequenceResumedPayload {
  sequenceId: string;
  contactId: string;
  resumedAt: Date;
}

export interface SequenceCompletedPayload {
  sequenceId: string;
  contactId: string;
  completedAt: Date;
  totalSteps: number;
  completedSteps: number;
}

export interface SequenceAbortedPayload {
  sequenceId: string;
  contactId: string;
  abortedAt: Date;
  reason: string;
}

// ============================================================================
// Payload Structures - Meeting Events
// ============================================================================

export interface MeetingBookedPayload {
  meetingId: string;
  contactId: string;
  scheduledFor: Date;
  duration: number;
  title: string;
  location?: string;
  attendees: string[];
  meetingUrl?: string;
}

export interface MeetingCancelledPayload {
  meetingId: string;
  contactId: string;
  cancelledAt: Date;
  reason?: string;
}

export interface MeetingRescheduledPayload {
  meetingId: string;
  contactId: string;
  oldTime: Date;
  newTime: Date;
  reason?: string;
}

export interface MeetingCompletedPayload {
  meetingId: string;
  contactId: string;
  completedAt: Date;
  notes?: string;
  outcome?: 'positive' | 'neutral' | 'negative';
}

// ============================================================================
// Payload Structures - Autopilot Events
// ============================================================================

export interface AutopilotTickPayload {
  autopilotId: string;
  tickNumber: number;
  processedAt: Date;
  tasksProcessed: number;
  tasksSucceeded: number;
  tasksFailed: number;
}

export interface AutopilotStartedPayload {
  autopilotId: string;
  startedAt: Date;
  mode: 'immediate' | 'scheduled';
}

export interface AutopilotStoppedPayload {
  autopilotId: string;
  stoppedAt: Date;
  reason?: string;
}

export interface AutopilotErrorPayload {
  autopilotId: string;
  error: string;
  errorStack?: string;
  occurredAt: Date;
  recoverable: boolean;
}

// ============================================================================
// Payload Structures - Webhook Events
// ============================================================================

export interface WebhookReceivedPayload {
  webhookId: string;
  provider: string;
  eventType: string;
  receivedAt: Date;
  headers: Record<string, string>;
  body: any;
}

export interface WebhookValidatedPayload {
  webhookId: string;
  signatureValid: boolean;
  validatedAt: Date;
}

export interface WebhookFailedPayload {
  webhookId: string;
  provider: string;
  error: string;
  failedAt: Date;
  retryable: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isEmailEvent(type: EventType): boolean {
  return [
    'MESSAGE_SENT',
    'MESSAGE_DELIVERED',
    'MESSAGE_FAILED',
    'MESSAGE_OPENED',
    'LINK_CLICKED',
    'REPLY_RECEIVED',
    'BOUNCE_RECORDED',
    'UNSUBSCRIBE_RECORDED'
  ].includes(type);
}

export function isSequenceEvent(type: EventType): boolean {
  return type.startsWith('SEQUENCE_');
}

export function isMeetingEvent(type: EventType): boolean {
  return type.startsWith('MEETING_');
}

export function isAutopilotEvent(type: EventType): boolean {
  return type.startsWith('AUTOPILOT_');
}

export function isWebhookEvent(type: EventType): boolean {
  return type.startsWith('WEBHOOK_');
}

// ============================================================================
// Event Factory Functions
// ============================================================================

export interface EventFactoryOptions {
  correlationId?: string;
  metadata?: Record<string, any>;
}

export function createEmailSentPayload(data: {
  messageId: string;
  providerMessageId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  contactId: string;
  sequenceId?: string;
  sequenceStepId?: string;
  provider?: EmailSentPayload['provider'];
}): EmailSentPayload {
  return {
    messageId: data.messageId,
    providerMessageId: data.providerMessageId,
    fromEmail: data.fromEmail,
    toEmail: data.toEmail,
    subject: data.subject,
    contactId: data.contactId,
    sequenceId: data.sequenceId,
    sequenceStepId: data.sequenceStepId,
    provider: data.provider || 'agentmail'
  };
}

export function createSequenceStepDuePayload(data: {
  sequenceId: string;
  sequenceStepId: string;
  contactId: string;
  scheduledFor: Date;
  messageId?: string;
}): SequenceStepDuePayload {
  return {
    sequenceId: data.sequenceId,
    sequenceStepId: data.sequenceStepId,
    contactId: data.contactId,
    scheduledFor: data.scheduledFor,
    messageId: data.messageId
  };
}

export function createAutopilotTickPayload(data: {
  autopilotId: string;
  tickNumber: number;
  tasksProcessed: number;
  tasksSucceeded: number;
  tasksFailed: number;
}): AutopilotTickPayload {
  return {
    autopilotId: data.autopilotId,
    tickNumber: data.tickNumber,
    processedAt: new Date(),
    tasksProcessed: data.tasksProcessed,
    tasksSucceeded: data.tasksSucceeded,
    tasksFailed: data.tasksFailed
  };
}
