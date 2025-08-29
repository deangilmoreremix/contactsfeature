import { create } from 'zustand';
import { tours, Tour, TourStep } from '../config/tour.config';

interface TourState {
  isTourActive: boolean;
  currentTourId: string | null;
  currentStepIndex: number;
  tourProgress: Record<string, number>;
  completedTours: string[];
  isTooltipVisible: Record<string, boolean>;
  showHelpButton: boolean;
}

interface TourActions {
  startTour: (tourId: string, startIndex?: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipToStep: (stepIndex: number) => void;
  endTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  getTourStep: (tourId?: string, stepIndex?: number) => TourStep | null;
  getCurrentTour: () => Tour | null;
  markTourCompleted: (tourId: string) => void;
  resetTourProgress: (tourId?: string) => void;
  setTooltipVisible: (elementId: string, visible: boolean) => void;
  toggleHelpButton: () => void;
  loadProgress: () => void;
  saveProgress: () => void;
}

interface TourStore extends TourState, TourActions {}

const STORAGE_KEY = 'smartcrm_tour_progress';

export const useTourStore = create<TourStore>((set, get) => ({
  // State
  isTourActive: false,
  currentTourId: null,
  currentStepIndex: 0,
  tourProgress: {},
  completedTours: [],
  isTooltipVisible: {},
  showHelpButton: true,

  // Actions
  startTour: (tourId: string, startIndex = 0) => {
    const tour = tours.find(t => t.id === tourId);
    if (!tour) {
      console.warn(`Tour ${tourId} not found`);
      return;
    }

    set({
      isTourActive: true,
      currentTourId: tourId,
      currentStepIndex: startIndex,
    });

    // Add body class to prevent scrolling during tour
    document.body.classList.add('tour-active');
  },

  nextStep: () => {
    const { currentTourId, currentStepIndex } = get();
    if (!currentTourId) return;

    const tour = tours.find(t => t.id === currentTourId);
    if (!tour) return;

    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= tour.steps.length) {
      // Tour completed
      get().markTourCompleted(currentTourId);
      get().endTour();
    } else {
      set({ 
        currentStepIndex: nextIndex,
        tourProgress: { 
          ...get().tourProgress, 
          [currentTourId]: nextIndex 
        }
      });
      get().saveProgress();
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  skipToStep: (stepIndex: number) => {
    const { currentTourId } = get();
    if (!currentTourId) return;

    const tour = tours.find(t => t.id === currentTourId);
    if (!tour || stepIndex < 0 || stepIndex >= tour.steps.length) return;

    set({ currentStepIndex: stepIndex });
  },

  endTour: () => {
    set({
      isTourActive: false,
      currentTourId: null,
      currentStepIndex: 0,
    });

    // Remove body class
    document.body.classList.remove('tour-active');
  },

  pauseTour: () => {
    const { currentTourId, currentStepIndex } = get();
    if (currentTourId) {
      set({
        isTourActive: false,
        tourProgress: { 
          ...get().tourProgress, 
          [currentTourId]: currentStepIndex 
        }
      });
      get().saveProgress();
    }
  },

  resumeTour: () => {
    const { currentTourId } = get();
    if (currentTourId) {
      set({ isTourActive: true });
      document.body.classList.add('tour-active');
    }
  },

  getTourStep: (tourId?: string, stepIndex?: number) => {
    const { currentTourId, currentStepIndex } = get();
    const targetTourId = tourId || currentTourId;
    const targetStepIndex = stepIndex !== undefined ? stepIndex : currentStepIndex;

    if (!targetTourId) return null;

    const tour = tours.find(t => t.id === targetTourId);
    if (!tour || targetStepIndex < 0 || targetStepIndex >= tour.steps.length) {
      return null;
    }

    return tour.steps[targetStepIndex];
  },

  getCurrentTour: () => {
    const { currentTourId } = get();
    if (!currentTourId) return null;
    return tours.find(t => t.id === currentTourId) || null;
  },

  markTourCompleted: (tourId: string) => {
    const { completedTours } = get();
    if (!completedTours.includes(tourId)) {
      set({
        completedTours: [...completedTours, tourId],
        tourProgress: { ...get().tourProgress, [tourId]: -1 } // -1 indicates completed
      });
      get().saveProgress();
    }
  },

  resetTourProgress: (tourId?: string) => {
    if (tourId) {
      const { tourProgress, completedTours } = get();
      const newProgress = { ...tourProgress };
      delete newProgress[tourId];
      
      set({
        tourProgress: newProgress,
        completedTours: completedTours.filter(id => id !== tourId)
      });
    } else {
      set({
        tourProgress: {},
        completedTours: []
      });
    }
    get().saveProgress();
  },

  setTooltipVisible: (elementId: string, visible: boolean) => {
    set({
      isTooltipVisible: {
        ...get().isTooltipVisible,
        [elementId]: visible
      }
    });
  },

  toggleHelpButton: () => {
    set({ showHelpButton: !get().showHelpButton });
  },

  loadProgress: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const progress = JSON.parse(stored);
        set({
          tourProgress: progress.tourProgress || {},
          completedTours: progress.completedTours || []
        });
      }
    } catch (error) {
      console.warn('Failed to load tour progress:', error);
    }
  },

  saveProgress: () => {
    try {
      const { tourProgress, completedTours } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tourProgress,
        completedTours,
        lastSaved: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to save tour progress:', error);
    }
  }
}));

// Auto-start tours for new users
export const initializeTours = () => {
  const store = useTourStore.getState();
  store.loadProgress();

  // Check if user should see onboarding tour
  const hasCompletedOnboarding = store.completedTours.includes('onboarding');
  const isFirstVisit = !localStorage.getItem('smartcrm_visited');

  if (!hasCompletedOnboarding && isFirstVisit) {
    localStorage.setItem('smartcrm_visited', 'true');
    setTimeout(() => {
      store.startTour('onboarding');
    }, 1000); // Small delay to let the app load
  }
};