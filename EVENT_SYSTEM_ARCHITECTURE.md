# Event-Driven Architecture Documentation

## Overview

This document describes the event-driven architecture implemented in the AgentMail SDR system. The architecture provides a robust, scalable way to handle email events, sequence automation, and autopilot workflows.

## Architecture Components

### 1. Event Bus (`lib/events/eventBus.ts`)

The Event Bus is the central component that handles event publishing and subscription.

**Key Features:**
- **Event Emission**: Publish events with types and payloads
- **Handler Subscription**: Subscribe to specific event types
- **Idempotency**: Prevent duplicate event processing using idempotency keys
- **Database Persistence**: All events are stored in the database
- **Retry Logic**: Automatic retry with exponential backoff for failed events
- **Timeout Protection**: Handlers execute with configurable timeouts

**Event Types:**
```typescript
type EventType =
  | 'LEAD_CREATED' | 'LEAD_UPDATED' | 'LEAD_QUALIFIED'
  | 'CONTACT_CREATED' | 'CONTACT_UPDATED'
  | 'MESSAGE_SENT' | 'MESSAGE_DELIVERED' | 'MESSAGE_FAILED'
  | 'MESSAGE_OPENED' | 'LINK_CLICKED' | 'REPLY_RECEIVED'
  | 'BOUNCE_RECORDED' | 'UNSUBSCRIBE_RECORDED'
  | 'SEQUENCE_STEP_DUE' | 'SEQUENCE_STEP_COMPLETED'
  | 'SEQUENCE_PAUSED' | 'SEQUENCE_RESUMED' | 'SEQUENCE_COMPLETED'
  | 'MEETING_BOOKED' | 'MEETING_CANCELLED' | 'MEETING_RESCHEDULED'
  | 'AUTOPILOT_TICK' | 'AUTOPILOT_STARTED' | 'AUTOPILOT_STOPPED'
  | 'AUTOPILOT_ERROR';
```

### 2. Event Types (`lib/events/types.ts`)

Defines all event types and their payload structures.

**Priority Levels:**
- `CRITICAL` (3): System failures, important notifications
- `HIGH` (2): Meeting bookings, replies received
- `NORMAL` (1): Standard email events
- `LOW` (0): Background tasks like autopilot ticks

### 3. Webhook Handlers (`lib/events/webhookHandlers.ts`)

Handles incoming webhooks from email providers.

**Handlers:**
- [`handleEmailDeliveryWebhook()`](lib/events/webhookHandlers.ts:6) - Email delivery status
- [`handleEmailOpenWebhook()`](lib/events/webhookHandlers.ts:39) - Email open tracking
- [`handleEmailClickWebhook()`](lib/events/webhookHandlers.ts:68) - Link click tracking
- [`handleEmailReplyWebhook()`](lib/events/webhookHandlers.ts:97) - Reply processing
- [`handleInboundMessageWebhook()`](lib/events/webhookHandlers.ts:164) - Inbound messages

### 4. Webhook Validation (`lib/events/webhookValidation.ts`)

Validates webhook signatures to ensure request authenticity.

**Supported Providers:**
- AgentMail
- SendGrid
- Mailgun
- Postmark
- AWS SES

**Environment Variables Required:**
```env
AGENTMAIL_WEBHOOK_SECRET=your_secret
SENDGRID_WEBHOOK_SECRET=your_secret
MAILGUN_WEBHOOK_SECRET=your_secret
POSTMARK_WEBHOOK_SECRET=your_secret
SES_WEBHOOK_SECRET=your_secret
```

### 5. Cron Job Runner (`lib/events/cronRunner.ts`)

Schedules and executes periodic tasks.

**Features:**
- Configurable intervals (1-5 minutes)
- Job enable/disable
- Execution statistics
- Error handling and logging

### 6. Scheduled Jobs (`lib/events/scheduledJobs.ts`)

Predefined jobs that run on schedule.

**Jobs:**
- **Sequence Step Due Check** (1 min): Checks for sequence steps that need to be sent
- **Find Missed Sequence Steps** (2 min): Catches steps missed due to downtime
- **Autopilot Tick Check** (1 min): Triggers autopilot processing
- **Check Stalled Autopilots** (5 min): Monitors for stuck autopilots

## Usage Examples

### Emitting Events

```typescript
import { eventBus, EventType } from './lib/events';

// Emit a simple event
await eventBus.emit(
  EventType.MESSAGE_SENT,
  {
    messageId: 'msg-123',
    toEmail: 'recipient@example.com'
  },
  'msg-123-sent' // idempotency key
);

// Emit with options
await eventBus.emit(
  EventType.SEQUENCE_STEP_DUE,
  payload,
  `sequence_${stepId}`,
  {
    source: 'cron.schedule',
    correlationId: 'corr-123',
    metadata: { userId: 'user-456' }
  }
);
```

### Subscribing to Events

```typescript
import { eventBus, EventType, EventPriority } from './lib/events';

// Subscribe to an event type
eventBus.subscribe(
  EventType.REPLY_RECEIVED,
  async (event) => {
    const { fromEmail, body } = event.payload;
    console.log(`Reply from ${fromEmail}: ${body}`);
  },
  { 
    priority: EventPriority.HIGH,
    name: 'reply-handler'
  }
);
```

### Validating Webhooks

```typescript
import { validateWebhookSignature, EmailProvider } from './lib/events';

function handleWebhook(req, res) {
  const result = validateWebhookSignature(req, EmailProvider.agentmail);
  
  if (!result.valid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
}
```

### Running Scheduled Jobs

```typescript
import { startScheduledJobs, stopScheduledJobs } from './lib/events';

// Start all scheduled jobs
startScheduledJobs();

// Stop all scheduled jobs
// stopScheduledJobs();
```

## Database Schema

The events table stores all processed events:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  source VARCHAR(100),
  correlation_id VARCHAR(255),
  metadata JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  priority INTEGER DEFAULT 1,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_idempotency ON events(idempotency_key);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_processed ON events(processed);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

## Event Flow

### Email Tracking Flow

1. **Email Sent** → `MESSAGE_SENT` event emitted
2. **Provider Delivers** → Webhook received → `MESSAGE_DELIVERED` event
3. **Recipient Opens** → Webhook received → `MESSAGE_OPENED` event
4. **Recipient Clicks** → Webhook received → `LINK_CLICKED` event
5. **Recipient Replies** → Webhook received → `REPLY_RECEIVED` event

### Sequence Automation Flow

1. **Scheduled Job** checks for due sequence steps every minute
2. **SEQUENCE_STEP_DUE** event emitted for each due step
3. **Handler** processes step (sends email, waits, etc.)
4. **SEQUENCE_STEP_COMPLETED** event emitted on success
5. **Next step** scheduled based on sequence configuration

### Autopilot Flow

1. **Autopilot Tick** runs every minute for active autopilots
2. **AUTOPILOT_TICK** event emitted
3. **Handler** processes autopilot tasks
4. **Next tick** scheduled based on interval

## Best Practices

1. **Always use idempotency keys** to prevent duplicate processing
2. **Handle errors in handlers** - events will be retried automatically
3. **Keep payloads small** - store large data in database, reference by ID
4. **Use priorities** - high-priority handlers execute first
5. **Monitor job stats** - check cron runner status regularly

## Error Handling

The event bus implements automatic retry with exponential backoff:

- Maximum 3 retries (configurable)
- Delay increases: 1s, 2s, 3s...
- Failed events marked with error message
- Can be replayed using `replayEvents()`

## Performance Considerations

- Events processed asynchronously
- Database persistence is fire-and-forget (errors logged, not thrown)
- Handlers execute in parallel for different event types
- Same-type handlers execute sequentially (ordered by priority)
