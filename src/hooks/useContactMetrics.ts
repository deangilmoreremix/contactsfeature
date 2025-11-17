import { useMemo } from 'react';
import { Contact } from '../types/contact';

interface ContactMetrics {
  engagementScore: number;
  lastInteraction: Date | null;
  nextFollowUp: Date | null;
  healthScore: number;
  activityLevel: 'low' | 'medium' | 'high' | 'very-high';
  relationshipStrength: 'weak' | 'moderate' | 'strong' | 'excellent';
  daysSinceLastContact: number;
  interactionFrequency: number; // interactions per month
}

interface UseContactMetricsResult {
  metrics: ContactMetrics | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to calculate contact metrics for preview cards and analytics
 * Uses existing contact data to compute health scores and engagement metrics
 */
export const useContactMetrics = (contact: Contact | null): UseContactMetricsResult => {
  const metrics = useMemo((): ContactMetrics | null => {
    if (!contact) return null;

    // Calculate days since last interaction
    const lastInteraction = contact.updatedAt ? new Date(contact.updatedAt) : null;
    const daysSinceLastContact = lastInteraction
      ? Math.floor((Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Calculate engagement score based on AI score and recency
    let engagementScore = contact.aiScore || 0;

    // Adjust based on recency (more recent = higher score)
    if (daysSinceLastContact <= 7) {
      engagementScore = Math.min(100, engagementScore + 20);
    } else if (daysSinceLastContact <= 30) {
      engagementScore = Math.min(100, engagementScore + 10);
    } else if (daysSinceLastContact <= 90) {
      // No adjustment
    } else {
      engagementScore = Math.max(0, engagementScore - 20);
    }

    // Calculate activity level based on interaction patterns
    let activityLevel: ContactMetrics['activityLevel'] = 'low';
    if (daysSinceLastContact <= 7) {
      activityLevel = 'very-high';
    } else if (daysSinceLastContact <= 30) {
      activityLevel = 'high';
    } else if (daysSinceLastContact <= 90) {
      activityLevel = 'medium';
    }

    // Calculate relationship strength based on multiple factors
    let relationshipStrength: ContactMetrics['relationshipStrength'] = 'weak';
    const score = engagementScore;

    if (score >= 80) {
      relationshipStrength = 'excellent';
    } else if (score >= 60) {
      relationshipStrength = 'strong';
    } else if (score >= 40) {
      relationshipStrength = 'moderate';
    }

    // Calculate interaction frequency (mock data - would be calculated from actual interaction history)
    const interactionFrequency = Math.max(0.1, Math.min(5, (100 - daysSinceLastContact) / 20));

    // Calculate health score (combination of engagement and recency)
    const recencyScore = Math.max(0, 100 - (daysSinceLastContact * 2));
    const healthScore = Math.round((engagementScore + recencyScore) / 2);

    // Calculate next follow-up (simple heuristic)
    let nextFollowUp: Date | null = null;
    if (daysSinceLastContact > 30) {
      nextFollowUp = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 1 week from now
    } else if (daysSinceLastContact > 14) {
      nextFollowUp = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)); // 3 days from now
    }

    return {
      engagementScore: Math.round(engagementScore),
      lastInteraction,
      nextFollowUp,
      healthScore,
      activityLevel,
      relationshipStrength,
      daysSinceLastContact,
      interactionFrequency
    };
  }, [contact]);

  return {
    metrics,
    loading: false, // Synchronous calculation
    error: null
  };
};