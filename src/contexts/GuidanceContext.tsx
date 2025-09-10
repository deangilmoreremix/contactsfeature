import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Types for the guidance system
export interface UserProgress {
  onboardingCompleted: boolean;
  featuresDiscovered: string[];
  helpRequests: number;
  lastActiveDate: string;
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  preferredHelpStyle: 'tooltips' | 'overlays' | 'minimal';
}

export interface GuidanceStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  content: ReactNode;
  showArrow?: boolean;
  canSkip?: boolean;
  autoAdvance?: boolean;
  delay?: number;
}

export interface GuidanceTour {
  id: string;
  name: string;
  description: string;
  steps: GuidanceStep[];
  targetAudience: 'new-users' | 'returning-users' | 'power-users';
  triggerCondition?: string;
}

export interface ContextualHelp {
  id: string;
  trigger: 'hover' | 'click' | 'focus' | 'inactivity' | 'error';
  condition: string;
  content: ReactNode;
  priority: 'low' | 'medium' | 'high';
  maxDisplays: number;
  cooldownPeriod: number; // minutes
}

interface GuidanceState {
  isActive: boolean;
  currentTour: GuidanceTour | null;
  currentStepIndex: number;
  userProgress: UserProgress;
  contextualHelp: ContextualHelp[];
  showWelcome: boolean;
  guidanceHistory: string[];
}

type GuidanceAction =
  | { type: 'START_TOUR'; tour: GuidanceTour }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SKIP_TOUR' }
  | { type: 'COMPLETE_TOUR' }
  | { type: 'UPDATE_PROGRESS'; progress: Partial<UserProgress> }
  | { type: 'SHOW_CONTEXTUAL_HELP'; help: ContextualHelp }
  | { type: 'HIDE_CONTEXTUAL_HELP'; helpId: string }
  | { type: 'SET_WELCOME_VISIBLE'; visible: boolean }
  | { type: 'RESET_GUIDANCE' };

const initialState: GuidanceState = {
  isActive: false,
  currentTour: null,
  currentStepIndex: 0,
  userProgress: {
    onboardingCompleted: false,
    featuresDiscovered: [],
    helpRequests: 0,
    lastActiveDate: new Date().toISOString(),
    expertiseLevel: 'beginner',
    preferredHelpStyle: 'tooltips'
  },
  contextualHelp: [],
  showWelcome: false,
  guidanceHistory: []
};

function guidanceReducer(state: GuidanceState, action: GuidanceAction): GuidanceState {
  switch (action.type) {
    case 'START_TOUR':
      return {
        ...state,
        isActive: true,
        currentTour: action.tour,
        currentStepIndex: 0,
        guidanceHistory: [...state.guidanceHistory, `started_tour_${action.tour.id}`]
      };

    case 'NEXT_STEP':
      if (!state.currentTour) return state;
      const nextIndex = state.currentStepIndex + 1;
      if (nextIndex >= state.currentTour.steps.length) {
        return {
          ...state,
          isActive: false,
          currentTour: null,
          currentStepIndex: 0,
          userProgress: {
            ...state.userProgress,
            onboardingCompleted: true
          }
        };
      }
      return {
        ...state,
        currentStepIndex: nextIndex
      };

    case 'PREVIOUS_STEP':
      return {
        ...state,
        currentStepIndex: Math.max(0, state.currentStepIndex - 1)
      };

    case 'SKIP_TOUR':
      return {
        ...state,
        isActive: false,
        currentTour: null,
        currentStepIndex: 0,
        guidanceHistory: [...state.guidanceHistory, `skipped_tour_${state.currentTour?.id || 'unknown'}`]
      };

    case 'COMPLETE_TOUR':
      return {
        ...state,
        isActive: false,
        currentTour: null,
        currentStepIndex: 0,
        userProgress: {
          ...state.userProgress,
          onboardingCompleted: true
        },
        guidanceHistory: [...state.guidanceHistory, `completed_tour_${state.currentTour?.id || 'unknown'}`]
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        userProgress: {
          ...state.userProgress,
          ...action.progress,
          lastActiveDate: new Date().toISOString()
        }
      };

    case 'SHOW_CONTEXTUAL_HELP':
      return {
        ...state,
        contextualHelp: [...state.contextualHelp, action.help]
      };

    case 'HIDE_CONTEXTUAL_HELP':
      return {
        ...state,
        contextualHelp: state.contextualHelp.filter(help => help.id !== action.helpId)
      };

    case 'SET_WELCOME_VISIBLE':
      return {
        ...state,
        showWelcome: action.visible
      };

    case 'RESET_GUIDANCE':
      return {
        ...initialState,
        userProgress: {
          ...initialState.userProgress,
          lastActiveDate: new Date().toISOString()
        }
      };

    default:
      return state;
  }
}

interface GuidanceContextType {
  state: GuidanceState;
  startTour: (tour: GuidanceTour) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  updateProgress: (progress: Partial<UserProgress>) => void;
  showContextualHelp: (help: ContextualHelp) => void;
  hideContextualHelp: (helpId: string) => void;
  setWelcomeVisible: (visible: boolean) => void;
  resetGuidance: () => void;
}

const GuidanceContext = createContext<GuidanceContextType | undefined>(undefined);

export const useGuidance = () => {
  const context = useContext(GuidanceContext);
  if (!context) {
    throw new Error('useGuidance must be used within a GuidanceProvider');
  }
  return context;
};

interface GuidanceProviderProps {
  children: ReactNode;
}

export const GuidanceProvider: React.FC<GuidanceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(guidanceReducer, initialState);

  // Load user progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('guidance_progress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        dispatch({ type: 'UPDATE_PROGRESS', progress });
      } catch (error) {
        console.warn('Failed to load guidance progress:', error);
      }
    }

    // Check if this is a first-time user
    const isFirstTime = !savedProgress || !JSON.parse(savedProgress).onboardingCompleted;
    if (isFirstTime) {
      dispatch({ type: 'SET_WELCOME_VISIBLE', visible: true });
    }
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('guidance_progress', JSON.stringify(state.userProgress));
  }, [state.userProgress]);

  const contextValue: GuidanceContextType = {
    state,
    startTour: (tour) => dispatch({ type: 'START_TOUR', tour }),
    nextStep: () => dispatch({ type: 'NEXT_STEP' }),
    previousStep: () => dispatch({ type: 'PREVIOUS_STEP' }),
    skipTour: () => dispatch({ type: 'SKIP_TOUR' }),
    completeTour: () => dispatch({ type: 'COMPLETE_TOUR' }),
    updateProgress: (progress) => dispatch({ type: 'UPDATE_PROGRESS', progress }),
    showContextualHelp: (help) => dispatch({ type: 'SHOW_CONTEXTUAL_HELP', help }),
    hideContextualHelp: (helpId) => dispatch({ type: 'HIDE_CONTEXTUAL_HELP', helpId }),
    setWelcomeVisible: (visible) => dispatch({ type: 'SET_WELCOME_VISIBLE', visible }),
    resetGuidance: () => dispatch({ type: 'RESET_GUIDANCE' })
  };

  return (
    <GuidanceContext.Provider value={contextValue}>
      {children}
    </GuidanceContext.Provider>
  );
};