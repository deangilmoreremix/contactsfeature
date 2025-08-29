import React, { useEffect } from 'react';
import { TourOverlay } from './TourOverlay';
import { TourStepCard } from './TourStepCard';
import { HelpButton } from './HelpButton';
import { useTourStore } from '../../store/tourStore';
import { initializeTours } from '../../store/tourStore';

interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const { isTourActive, getTourStep } = useTourStore();
  const currentStep = getTourStep();

  useEffect(() => {
    // Initialize tours when app loads
    initializeTours();

    // Keyboard shortcuts for tour navigation
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isTourActive) return;

      const store = useTourStore.getState();
      
      switch (event.key) {
        case 'Escape':
          store.endTour();
          break;
        case 'ArrowRight':
        case ' ': // Spacebar
          event.preventDefault();
          store.nextStep();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          store.prevStep();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isTourActive]);

  return (
    <>
      {children}
      
      {/* Tour Components */}
      {isTourActive && (
        <>
          <TourOverlay targetSelector={currentStep?.targetSelector} />
          <TourStepCard />
        </>
      )}
      
      {/* Help Button */}
      <HelpButton />
    </>
  );
};