/**
 * Call Tracking Service
 * Tracks call interactions and engagement metrics
 */

export interface CallEvent {
  id: string;
  contactId: string;
  eventType: 'initiated' | 'connected' | 'completed' | 'missed' | 'voicemail' | 'sms_sent' | 'sms_delivered' | 'sms_failed';
  timestamp: Date;
  phoneNumber: string;
  callType?: 'inbound' | 'outbound' | 'sms';
  duration?: number;
  outcome?: 'completed' | 'no_answer' | 'busy' | 'voicemail' | 'cancelled' | 'delivered' | 'failed';
  notes?: string;
  recordingUrl?: string;
  metadata?: Record<string, any>;
}

export interface CallMetrics {
  totalCalls: number;
  totalConnected: number;
  totalCompleted: number;
  averageDuration: number;
  connectRate: number;
  completionRate: number;
  totalTalkTime: number;
}

class CallTrackingService {
  private static instance: CallTrackingService;
  private events: CallEvent[] = [];
  private metricsCache: Map<string, CallMetrics> = new Map();

  static getInstance(): CallTrackingService {
    if (!CallTrackingService.instance) {
      CallTrackingService.instance = new CallTrackingService();
    }
    return CallTrackingService.instance;
  }

  trackCallEvent(event: Omit<CallEvent, 'id' | 'timestamp'>): CallEvent {
    const callEvent: CallEvent = {
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    };

    this.events.push(callEvent);

    // Clear cached metrics for this contact
    this.metricsCache.delete(event.contactId);

    console.log(`Call event tracked: ${event.eventType} for contact ${event.contactId}`);

    return callEvent;
  }

  getEventsForContact(contactId: string, limit: number = 50): CallEvent[] {
    return this.events
      .filter(event => event.contactId === contactId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getRecentCalls(limit: number = 20): CallEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getMetricsForContact(contactId: string): CallMetrics {
    // Check cache first
    const cached = this.metricsCache.get(contactId);
    if (cached) return cached;

    const contactEvents = this.events.filter(event => event.contactId === contactId);
    const completedCalls = contactEvents.filter(e => e.eventType === 'completed');

    const metrics: CallMetrics = {
      totalCalls: contactEvents.length,
      totalConnected: contactEvents.filter(e => e.eventType === 'connected').length,
      totalCompleted: completedCalls.length,
      averageDuration: 0,
      connectRate: 0,
      completionRate: 0,
      totalTalkTime: 0
    };

    // Calculate metrics
    if (completedCalls.length > 0) {
      const totalDuration = completedCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
      metrics.averageDuration = totalDuration / completedCalls.length;
      metrics.totalTalkTime = totalDuration;
    }

    if (metrics.totalCalls > 0) {
      metrics.connectRate = (metrics.totalConnected / metrics.totalCalls) * 100;
      metrics.completionRate = (metrics.totalCompleted / metrics.totalCalls) * 100;
    }

    // Cache the metrics
    this.metricsCache.set(contactId, metrics);

    return metrics;
  }

  getOverallMetrics(): CallMetrics {
    const allEvents = this.events;
    const completedCalls = allEvents.filter(e => e.eventType === 'completed');

    const metrics: CallMetrics = {
      totalCalls: allEvents.length,
      totalConnected: allEvents.filter(e => e.eventType === 'connected').length,
      totalCompleted: completedCalls.length,
      averageDuration: 0,
      connectRate: 0,
      completionRate: 0,
      totalTalkTime: 0
    };

    // Calculate metrics
    if (completedCalls.length > 0) {
      const totalDuration = completedCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
      metrics.averageDuration = totalDuration / completedCalls.length;
      metrics.totalTalkTime = totalDuration;
    }

    if (metrics.totalCalls > 0) {
      metrics.connectRate = (metrics.totalConnected / metrics.totalCalls) * 100;
      metrics.completionRate = (metrics.totalCompleted / metrics.totalCalls) * 100;
    }

    return metrics;
  }

  // Get call history with filtering
  getCallHistory(filters?: {
    contactId?: string;
    callType?: 'inbound' | 'outbound';
    outcome?: CallEvent['outcome'];
    startDate?: Date;
    endDate?: Date;
  }): CallEvent[] {
    let filteredEvents = [...this.events];

    if (filters) {
      if (filters.contactId) {
        filteredEvents = filteredEvents.filter(e => e.contactId === filters.contactId);
      }

      if (filters.callType) {
        filteredEvents = filteredEvents.filter(e => e.callType === filters.callType);
      }

      if (filters.outcome) {
        filteredEvents = filteredEvents.filter(e => e.outcome === filters.outcome);
      }

      if (filters.startDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.startDate!);
      }

      if (filters.endDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filters.endDate!);
      }
    }

    return filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Export call data
  exportCallData(contactId?: string): string {
    const events = contactId ? this.getEventsForContact(contactId) : this.events;

    const csvHeader = 'ID,Timestamp,Contact ID,Event Type,Phone Number,Call Type,Duration,Outcome,Notes\n';
    const csvRows = events.map(event =>
      `"${event.id}","${event.timestamp.toISOString()}","${event.contactId}","${event.eventType}","${event.phoneNumber}","${event.callType}","${event.duration || ''}","${event.outcome || ''}","${event.notes || ''}"`
    ).join('\n');

    return csvHeader + csvRows;
  }
}

export const callTrackingService = CallTrackingService.getInstance();