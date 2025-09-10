import { useEffect, useCallback } from 'react';
import { useGuidance } from '../contexts/GuidanceContext';

export interface UserAction {
  type: 'feature_used' | 'help_requested' | 'error_encountered' | 'tutorial_completed' | 'navigation';
  feature?: string;
  context?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface GuidanceTrigger {
  condition: string;
  priority: 'low' | 'medium' | 'high';
  content: any;
  cooldownMinutes: number;
  maxDisplays: number;
}

export const useUserProgressTracker = () => {
  const { state, updateProgress, showContextualHelp } = useGuidance();

  // Track user actions for analytics and guidance decisions
  const trackAction = useCallback((action: Omit<UserAction, 'timestamp'>) => {
    const fullAction: UserAction = {
      ...action,
      timestamp: Date.now()
    };

    // Store in localStorage for persistence
    const actions = JSON.parse(localStorage.getItem('user_actions') || '[]');
    actions.push(fullAction);

    // Keep only last 100 actions to prevent storage bloat
    if (actions.length > 100) {
      actions.splice(0, actions.length - 100);
    }

    localStorage.setItem('user_actions', JSON.stringify(actions));

    // Update user progress based on actions
    updateUserProgress(fullAction);
  }, []);

  // Update user progress based on tracked actions
  const updateUserProgress = useCallback((action: UserAction) => {
    const progressUpdates: any = {};

    switch (action.type) {
      case 'feature_used':
        if (action.feature && !state.userProgress.featuresDiscovered.includes(action.feature)) {
          progressUpdates.featuresDiscovered = [
            ...state.userProgress.featuresDiscovered,
            action.feature
          ];
        }
        break;

      case 'help_requested':
        progressUpdates.helpRequests = state.userProgress.helpRequests + 1;
        break;

      case 'tutorial_completed':
        progressUpdates.onboardingCompleted = true;
        break;

      case 'error_encountered':
        // Could trigger error-specific help
        break;
    }

    // Update expertise level based on feature usage
    const featureCount = (progressUpdates.featuresDiscovered || state.userProgress.featuresDiscovered).length;
    if (featureCount > 10) {
      progressUpdates.expertiseLevel = 'expert';
    } else if (featureCount > 5) {
      progressUpdates.expertiseLevel = 'intermediate';
    } else {
      progressUpdates.expertiseLevel = 'beginner';
    }

    if (Object.keys(progressUpdates).length > 0) {
      updateProgress(progressUpdates);
    }
  }, [state.userProgress, updateProgress]);

  // Check if guidance should be triggered based on user behavior
  const shouldTriggerGuidance = useCallback((trigger: GuidanceTrigger): boolean => {
    const actions = JSON.parse(localStorage.getItem('user_actions') || '[]');

    // Check cooldown period
    const recentActions = actions.filter((action: UserAction) =>
      action.timestamp > Date.now() - (trigger.cooldownMinutes * 60 * 1000)
    );

    // Check if trigger condition is met
    const conditionMet = evaluateTriggerCondition(trigger.condition, recentActions);

    // Check display limits
    const displayCount = recentActions.filter((action: UserAction) =>
      action.type === 'help_requested' && action.context === trigger.condition
    ).length;

    return conditionMet && displayCount < trigger.maxDisplays;
  }, []);

  // Evaluate trigger conditions
  const evaluateTriggerCondition = useCallback((condition: string, actions: UserAction[]): boolean => {
    switch (condition) {
      case 'first_visit':
        return !state.userProgress.onboardingCompleted;

      case 'new_feature_available':
        return state.userProgress.featuresDiscovered.length < 3;

      case 'high_error_rate':
        const recentErrors = actions.filter(action =>
          action.type === 'error_encountered' &&
          action.timestamp > Date.now() - (5 * 60 * 1000) // Last 5 minutes
        );
        return recentErrors.length >= 3;

      case 'low_feature_usage':
        const recentFeatures = actions.filter(action =>
          action.type === 'feature_used' &&
          action.timestamp > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
        );
        return recentFeatures.length < 2;

      case 'returning_user':
        const lastActive = new Date(state.userProgress.lastActiveDate);
        const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActive > 7;

      default:
        return false;
    }
  }, [state.userProgress]);

  // Get user engagement score (0-100)
  const getEngagementScore = useCallback((): number => {
    const actions = JSON.parse(localStorage.getItem('user_actions') || '[]');
    const recentActions = actions.filter((action: UserAction) =>
      action.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000) // Last 7 days
    );

    let score = 0;

    // Feature usage (40 points)
    const featureUsage = recentActions.filter((a: UserAction) => a.type === 'feature_used').length;
    score += Math.min(featureUsage * 4, 40);

    // Help requests (negative impact, -20 points max)
    const helpRequests = recentActions.filter((a: UserAction) => a.type === 'help_requested').length;
    score -= Math.min(helpRequests * 2, 20);

    // Tutorial completion (20 points)
    const tutorialsCompleted = recentActions.filter((a: UserAction) => a.type === 'tutorial_completed').length;
    score += Math.min(tutorialsCompleted * 20, 20);

    // Onboarding completion (20 points)
    if (state.userProgress.onboardingCompleted) {
      score += 20;
    }

    return Math.max(0, Math.min(100, score));
  }, [state.userProgress.onboardingCompleted]);

  // Get personalized guidance recommendations
  const getGuidanceRecommendations = useCallback(() => {
    const recommendations = [];
    const engagementScore = getEngagementScore();

    if (engagementScore < 30) {
      recommendations.push({
        type: 'onboarding',
        priority: 'high',
        message: 'Complete the onboarding tour to get started'
      });
    }

    if (state.userProgress.featuresDiscovered.length < 5) {
      recommendations.push({
        type: 'feature_discovery',
        priority: 'medium',
        message: 'Explore more AI features to enhance your workflow'
      });
    }

    if (state.userProgress.helpRequests > 5) {
      recommendations.push({
        type: 'advanced_help',
        priority: 'medium',
        message: 'Consider switching to expert mode for less guidance'
      });
    }

    return recommendations;
  }, [state.userProgress, getEngagementScore]);

  // Auto-trigger contextual help based on user behavior
  useEffect(() => {
    const checkForGuidanceTriggers = () => {
      // Define common triggers
      const triggers: GuidanceTrigger[] = [
        {
          condition: 'first_visit',
          priority: 'high',
          content: 'Welcome! Would you like a quick tour?',
          cooldownMinutes: 60,
          maxDisplays: 1
        },
        {
          condition: 'low_feature_usage',
          priority: 'medium',
          content: 'Try exploring our AI features to enhance your contact management',
          cooldownMinutes: 1440, // 24 hours
          maxDisplays: 3
        },
        {
          condition: 'returning_user',
          priority: 'low',
          content: 'Welcome back! Check out our latest AI improvements',
          cooldownMinutes: 10080, // 7 days
          maxDisplays: 2
        }
      ];

      triggers.forEach(trigger => {
        if (shouldTriggerGuidance(trigger)) {
          showContextualHelp({
            id: `trigger_${trigger.condition}_${Date.now()}`,
            trigger: 'inactivity',
            condition: trigger.condition,
            content: trigger.content,
            priority: trigger.priority,
            maxDisplays: trigger.maxDisplays,
            cooldownPeriod: trigger.cooldownMinutes
          });
        }
      });
    };

    // Check for triggers every 30 seconds
    const interval = setInterval(checkForGuidanceTriggers, 30000);

    return () => clearInterval(interval);
  }, [shouldTriggerGuidance, showContextualHelp]);

  return {
    trackAction,
    getEngagementScore,
    getGuidanceRecommendations,
    shouldTriggerGuidance
  };
};