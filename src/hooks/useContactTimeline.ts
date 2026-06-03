import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../services/logger.service';
import { Contact } from '../types/contact';

export interface TimelineActivity {
  id: string;
  contactId: string;
  activityType: 'created' | 'updated' | 'status_changed' | 'score_calculated' | 'email_sent' | 'note_added' | 'imported' | 'exported' | 'ai_analysis' | 'attachment_added' | 'custom_field_updated';
  description: string;
  metadata?: Record<string, any>;
  userName?: string;
  createdAt: string;
}

export interface TimelineFilters {
  activityTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export function useContactTimeline(contactId: string | undefined, filters: TimelineFilters = {}) {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadActivities = async () => {
    if (!contactId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('contact_timeline')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.activityTypes?.length) {
        query = query.in('activity_type', filters.activityTypes);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setActivities((data || []) as TimelineActivity[]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to load timeline', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (
    contact: Contact,
    activityType: TimelineActivity['activityType'],
    description: string,
    metadata?: Record<string, any>
  ) => {
    if (!contact?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: insertError } = await supabase
        .from('contact_timeline')
        .insert({
          contact_id: contact.id,
          activity_type: activityType,
          description,
          metadata,
          user_name: user?.user_metadata?.full_name || user?.email || 'System'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setActivities(prev => [data as TimelineActivity, ...prev]);
    } catch (err) {
      logger.error('Failed to add timeline activity', err instanceof Error ? err : new Error(String(err)));
    }
  };

  useEffect(() => {
    loadActivities();
  }, [contactId, JSON.stringify(filters)]);

  return { activities, loading, error, refetch: loadActivities, addActivity };
}

export function useActivityTypeLabels() {
  return {
    created: { label: 'Created', color: 'bg-blue-100 text-blue-700', icon: '📝' },
    updated: { label: 'Updated', color: 'bg-gray-100 text-gray-700', icon: '✏️' },
    status_changed: { label: 'Status Changed', color: 'bg-purple-100 text-purple-700', icon: '🔄' },
    score_calculated: { label: 'AI Score', color: 'bg-yellow-100 text-yellow-700', icon: '🤖' },
    email_sent: { label: 'Email Sent', color: 'bg-green-100 text-green-700', icon: '📧' },
    note_added: { label: 'Note Added', color: 'bg-amber-100 text-amber-700', icon: '📒' },
    imported: { label: 'Imported', color: 'bg-indigo-100 text-indigo-700', icon: '📥' },
    exported: { label: 'Exported', color: 'bg-pink-100 text-pink-700', icon: '📤' },
    ai_analysis: { label: 'AI Analysis', color: 'bg-cyan-100 text-cyan-700', icon: '🧠' },
    attachment_added: { label: 'Attachment', color: 'bg-orange-100 text-orange-700', icon: '📎' },
    custom_field_updated: { label: 'Field Updated', color: 'bg-teal-100 text-teal-700', icon: '🏷️' }
  };
}
