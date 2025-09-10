import { GuidanceTour, GuidanceStep, ContextualHelp } from '../contexts/GuidanceContext';

// Simplified guidance tours - content will be rendered by components
export const GUIDANCE_TOURS: Record<string, GuidanceTour> = {
  welcome: {
    id: 'welcome',
    name: 'Welcome to ContactFlow',
    description: 'Get started with your AI-powered contact management platform',
    targetAudience: 'new-users',
    steps: [
      {
        id: 'welcome-intro',
        title: 'Welcome to ContactFlow! 🎉',
        description: 'Your AI-powered contact management platform is ready to help you manage relationships more effectively.',
        position: 'center',
        content: 'Welcome content will be rendered by WelcomeExperience component',
        canSkip: false,
        autoAdvance: true,
        delay: 3000
      },
      {
        id: 'contact-creation',
        title: 'Creating Your First Contact',
        description: 'Learn how to add contacts with AI assistance',
        targetElement: '[data-guidance="contact-form"]',
        position: 'bottom',
        content: 'Contact creation guidance content',
        canSkip: true
      },
      {
        id: 'ai-research',
        title: 'AI Research Features',
        description: 'Discover how AI can research and enrich your contacts',
        targetElement: '[data-guidance="ai-research"]',
        position: 'top',
        content: 'AI research features explanation',
        canSkip: true
      },
      {
        id: 'ai-autofill',
        title: 'Smart Auto-Fill',
        description: 'Learn about automatic form completion',
        targetElement: '[data-guidance="ai-autofill"]',
        position: 'top',
        content: 'Smart auto-fill guidance content',
        canSkip: true
      },
      {
        id: 'ai-toolbar',
        title: 'AI Action Toolbar',
        description: 'Explore the AI toolbar for quick actions',
        targetElement: '[data-guidance="ai-toolbar"]',
        position: 'bottom',
        content: 'AI toolbar features explanation',
        canSkip: true
      },
      {
        id: 'completion',
        title: 'You\'re All Set! 🎉',
        description: 'Start exploring your AI-powered contact management platform',
        position: 'center',
        content: 'Tour completion message',
        canSkip: false
      }
    ]
  }
};

// Simplified contextual help definitions
export const CONTEXTUAL_HELP: ContextualHelp[] = [
  {
    id: 'empty-form-help',
    trigger: 'inactivity',
    condition: 'form_empty && time_inactive > 30',
    content: 'Need help getting started? Try entering contact information.',
    priority: 'low',
    maxDisplays: 3,
    cooldownPeriod: 300
  },
  {
    id: 'ai-research-help',
    trigger: 'hover',
    condition: 'ai_button_visible && user_expertise == beginner',
    content: 'Click research buttons to automatically find contact information using AI.',
    priority: 'medium',
    maxDisplays: 5,
    cooldownPeriod: 60
  },
  {
    id: 'error-recovery-help',
    trigger: 'error',
    condition: 'api_error_occurred',
    content: 'Connection issue detected. Check your internet and try again.',
    priority: 'high',
    maxDisplays: 10,
    cooldownPeriod: 5
  }
];

// Guidance engine utilities
export class GuidanceEngine {
  static getTourById(tourId: string): GuidanceTour | null {
    return GUIDANCE_TOURS[tourId] || null;
  }

  static getRecommendedTours(userProgress: any): GuidanceTour[] {
    const tours: GuidanceTour[] = [];

    if (!userProgress.onboardingCompleted) {
      const welcomeTour = GUIDANCE_TOURS['welcome'];
      if (welcomeTour) {
        tours.push(welcomeTour);
      }
    }

    return tours;
  }

  static getContextualHelpForCondition(condition: string, userProgress: any): ContextualHelp[] {
    return CONTEXTUAL_HELP.filter(help => {
      switch (condition) {
        case 'first_visit':
          return !userProgress.onboardingCompleted;
        case 'low_engagement':
          return userProgress.helpRequests > 3;
        default:
          return false;
      }
    });
  }

  static shouldShowWelcome(userProgress: any): boolean {
    if (!userProgress.lastActiveDate) return true;

    const lastActive = new Date(userProgress.lastActiveDate);
    const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);

    return !userProgress.onboardingCompleted || daysSinceActive > 30;
  }

  static getNextGuidanceStep(currentTour: GuidanceTour, currentStepIndex: number): GuidanceStep | null {
    if (currentStepIndex + 1 >= currentTour.steps.length) {
      return null;
    }
    return currentTour.steps[currentStepIndex + 1] || null;
  }

  static getPreviousGuidanceStep(currentTour: GuidanceTour, currentStepIndex: number): GuidanceStep | null {
    if (currentStepIndex <= 0) {
      return null;
    }
    return currentTour.steps[currentStepIndex - 1] || null;
  }
}