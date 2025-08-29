import React, { useEffect } from 'react';
import { useTourStore } from '../../store/tourStore';

interface TourOverlayProps {
  targetSelector?: string;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({ targetSelector }) => {
  const { isTourActive } = useTourStore();

  useEffect(() => {
    if (!isTourActive) return;

    // Highlight the target element
    const highlightElement = () => {
      // Remove any existing highlights
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });

      if (targetSelector) {
        const target = document.querySelector(targetSelector);
        if (target) {
          target.classList.add('tour-highlight');
          
          // Scroll element into view if needed
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(highlightElement, 100);

    return () => {
      // Cleanup highlights when component unmounts
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [targetSelector, isTourActive]);

  if (!isTourActive) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 tour-overlay"
      style={{ 
        pointerEvents: 'none' // Allow clicks to pass through to highlighted elements
      }}
    />
  );
};