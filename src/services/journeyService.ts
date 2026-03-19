import { supabase } from './supabaseClient';
import { logger } from './logger.service';

export interface JourneyEvent {
  id: string;
  contact_id: string;
  user_id?: string;
  event_type: 'interaction' | 'milestone' | 'status_change' | 'ai_insight' | 'file_upload';
  title: string;
  description?: string;
  status: 'completed' | 'pending' | 'in_progress';
  event_timestamp: string;
  channel?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  score?: number;
  file_id?: string;
  metadata?: Record<string, unknown>;
  is_predicted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateJourneyEventInput {
  contact_id: string;
  event_type: JourneyEvent['event_type'];
  title: string;
  description?: string;
  status?: JourneyEvent['status'];
  event_timestamp?: string;
  channel?: string;
  sentiment?: JourneyEvent['sentiment'];
  score?: number;
  file_id?: string;
  metadata?: Record<string, unknown>;
  is_predicted?: boolean;
}

class JourneyService {
  async getContactJourneyEvents(contactId: string): Promise<JourneyEvent[]> {
    try {
      const { data, error } = await supabase
        .from('contact_journey_events')
        .select('*')
        .eq('contact_id', contactId)
        .order('event_timestamp', { ascending: false });

      if (error) {
        logger.error('Failed to fetch journey events', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Journey events fetch failed', error as Error);
      return [];
    }
  }

  async createJourneyEvent(input: CreateJourneyEventInput): Promise<JourneyEvent | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const eventData = {
        ...input,
        user_id: user?.id,
        event_timestamp: input.event_timestamp || new Date().toISOString(),
        status: input.status || 'completed',
        is_predicted: input.is_predicted || false,
        metadata: input.metadata || {}
      };

      const { data, error } = await supabase
        .from('contact_journey_events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        logger.error('Failed to create journey event', error);
        return null;
      }

      logger.info('Journey event created', { eventId: data.id, type: input.event_type });
      return data;
    } catch (error) {
      logger.error('Journey event creation failed', error as Error);
      return null;
    }
  }

  async createBulkJourneyEvents(events: CreateJourneyEventInput[]): Promise<JourneyEvent[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const eventsData = events.map(event => ({
        ...event,
        user_id: user?.id,
        event_timestamp: event.event_timestamp || new Date().toISOString(),
        status: event.status || 'completed',
        is_predicted: event.is_predicted || false,
        metadata: event.metadata || {}
      }));

      const { data, error } = await supabase
        .from('contact_journey_events')
        .insert(eventsData)
        .select();

      if (error) {
        logger.error('Failed to create bulk journey events', error);
        return [];
      }

      logger.info('Bulk journey events created', { count: data?.length });
      return data || [];
    } catch (error) {
      logger.error('Bulk journey event creation failed', error as Error);
      return [];
    }
  }

  async updateJourneyEvent(
    eventId: string,
    updates: Partial<CreateJourneyEventInput>
  ): Promise<JourneyEvent | null> {
    try {
      const { data, error } = await supabase
        .from('contact_journey_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update journey event', error);
        return null;
      }

      logger.info('Journey event updated', { eventId });
      return data;
    } catch (error) {
      logger.error('Journey event update failed', error as Error);
      return null;
    }
  }

  async deleteJourneyEvent(eventId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contact_journey_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        logger.error('Failed to delete journey event', error);
        return false;
      }

      logger.info('Journey event deleted', { eventId });
      return true;
    } catch (error) {
      logger.error('Journey event deletion failed', error as Error);
      return false;
    }
  }

  async deletePredictedEvents(contactId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contact_journey_events')
        .delete()
        .eq('contact_id', contactId)
        .eq('is_predicted', true);

      if (error) {
        logger.error('Failed to delete predicted events', error);
        return false;
      }

      logger.info('Predicted events deleted', { contactId });
      return true;
    } catch (error) {
      logger.error('Predicted events deletion failed', error as Error);
      return false;
    }
  }

  async getJourneyEventsByType(
    contactId: string,
    eventType: JourneyEvent['event_type']
  ): Promise<JourneyEvent[]> {
    try {
      const { data, error } = await supabase
        .from('contact_journey_events')
        .select('*')
        .eq('contact_id', contactId)
        .eq('event_type', eventType)
        .order('event_timestamp', { ascending: false });

      if (error) {
        logger.error('Failed to fetch journey events by type', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Journey events by type fetch failed', error as Error);
      return [];
    }
  }

  async getJourneyStats(contactId: string): Promise<{
    totalEvents: number;
    completedEvents: number;
    pendingEvents: number;
    interactionCount: number;
    milestoneCount: number;
  }> {
    try {
      const events = await this.getContactJourneyEvents(contactId);

      return {
        totalEvents: events.length,
        completedEvents: events.filter(e => e.status === 'completed').length,
        pendingEvents: events.filter(e => e.status === 'pending').length,
        interactionCount: events.filter(e => e.event_type === 'interaction').length,
        milestoneCount: events.filter(e => e.event_type === 'milestone').length
      };
    } catch (error) {
      logger.error('Journey stats calculation failed', error as Error);
      return {
        totalEvents: 0,
        completedEvents: 0,
        pendingEvents: 0,
        interactionCount: 0,
        milestoneCount: 0
      };
    }
  }
}

export const journeyService = new JourneyService();
