import { useEffect } from 'react';
import { useTourStore } from '../store/tourStore';
import { tours } from '../config/tour.config';

// Hook for managing tours within components
export const useTour = (componentName?: string) => {
  const {
    isTourActive,
    currentTourId,
    currentStepIndex,
    startTour,
    endTour,
    nextStep,
    prevStep,
    getTourStep,
    getCurrentTour
  } = useTourStore();

  const currentStep = getTourStep();
  const isCurrentComponent = currentStep?.targetSelector?.includes(componentName || '');

  return {
    isTourActive,
    currentTourId,
    currentStepIndex,
    currentStep,
    currentTour: getCurrentTour(),
    isCurrentComponent,
    startTour,
    endTour,
    nextStep,
    prevStep,
    availableTours: tours
  };
};

// Hook for components that want to trigger tours
export const useTourTrigger = () => {
  const { startTour, completedTours } = useTourStore();

  const triggerFeatureTour = (featureType: 'ai-features' | 'advanced' | 'onboarding') => {
    const tour = tours.find(t => t.category === featureType);
    if (tour) {
      startTour(tour.id);
    }
  };

  const hasCompletedTour = (tourId: string) => {
    return completedTours.includes(tourId);
  };

  return {
    triggerFeatureTour,
    hasCompletedTour,
    startSpecificTour: startTour
  };
};