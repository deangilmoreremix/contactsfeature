import React, { useEffect, useState, useRef } from 'react';
import { useTourStore } from '../../store/tourStore';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Sparkles, 
  Brain, 
  Users, 
  Search, 
  UserPlus, 
  Upload, 
  Target, 
  Lightbulb, 
  Mail, 
  Zap,
  Play,
  HelpCircle
} from 'lucide-react';

const iconMap = {
  Sparkles, Brain, Users, Search, UserPlus, Upload, Target, Lightbulb, Mail, Zap, Play, HelpCircle
};

export const TourStepCard: React.FC = () => {
  const { 
    isTourActive, 
    currentStepIndex, 
    getTourStep, 
    getCurrentTour, 
    nextStep, 
    prevStep, 
    endTour 
  } = useTourStore();
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cardPosition, setCardPosition] = useState<'top' | 'bottom' | 'left' | 'right' | 'center'>('top');
  const cardRef = useRef<HTMLDivElement>(null);
  
  const currentTour = getCurrentTour();
  const currentStep = getTourStep();

  useEffect(() => {
    if (!isTourActive || !currentStep) return;

    const updatePosition = () => {
      if (currentStep.position === 'center') {
        // Center the card in the viewport
        setPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        });
        setCardPosition('center');
        return;
      }

      const target = document.querySelector(currentStep.targetSelector);
      if (!target) {
        // Fallback to center if target not found
        setPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        });
        setCardPosition('center');
        return;
      }

      const rect = target.getBoundingClientRect();
      const cardWidth = 320; // Approximate card width
      const cardHeight = 200; // Approximate card height
      const margin = 20; // Margin from target element

      let x = rect.left + rect.width / 2;
      let y = rect.top;
      let actualPosition = currentStep.position;

      // Adjust position based on viewport constraints
      switch (currentStep.position) {
        case 'top':
          y = rect.top - cardHeight - margin;
          if (y < 0) {
            y = rect.bottom + margin;
            actualPosition = 'bottom';
          }
          break;
        case 'bottom':
          y = rect.bottom + margin;
          if (y + cardHeight > window.innerHeight) {
            y = rect.top - cardHeight - margin;
            actualPosition = 'top';
          }
          break;
        case 'left':
          x = rect.left - cardWidth - margin;
          y = rect.top + rect.height / 2;
          if (x < 0) {
            x = rect.right + margin;
            actualPosition = 'right';
          }
          break;
        case 'right':
          x = rect.right + margin;
          y = rect.top + rect.height / 2;
          if (x + cardWidth > window.innerWidth) {
            x = rect.left - cardWidth - margin;
            actualPosition = 'left';
          }
          break;
      }

      // Ensure card stays within viewport bounds
      x = Math.max(margin, Math.min(x, window.innerWidth - cardWidth - margin));
      y = Math.max(margin, Math.min(y, window.innerHeight - cardHeight - margin));

      setPosition({ x, y });
      setCardPosition(actualPosition);
    };

    updatePosition();

    // Update position on window resize
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isTourActive, currentStep, currentStepIndex]);

  if (!isTourActive || !currentStep || !currentTour) return null;

  const Icon = currentStep.icon && iconMap[currentStep.icon as keyof typeof iconMap];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === currentTour.steps.length - 1;

  const getCardStyle = () => {
    if (cardPosition === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        maxWidth: '90vw',
        width: '400px'
      };
    }

    return {
      position: 'fixed' as const,
      left: cardPosition === 'right' ? position.x : 
            cardPosition === 'left' ? position.x - 320 : 
            position.x - 160,
      top: cardPosition === 'center' ? position.y - 100 :
           cardPosition === 'bottom' ? position.y :
           cardPosition === 'top' ? position.y - 200 :
           position.y - 100,
      zIndex: 50,
      maxWidth: '90vw',
      width: '320px'
    };
  };

  return (
    <div
      ref={cardRef}
      style={getCardStyle()}
      className="tour-step-card animate-scale-in"
    >
      <GlassCard className="p-6 border-2 border-blue-500/50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {Icon && (
              <div className={`p-3 rounded-xl ${currentStep.aiFeature ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                <Icon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{currentStep.title}</h3>
              {currentStep.aiFeature && (
                <div className="flex items-center space-x-1 mt-1">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600 font-medium">AI-Powered Feature</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={endTour}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Quick Actions */}
        {currentStep.quickActions && currentStep.quickActions.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Quick Actions:</p>
            <div className="space-y-2">
              {currentStep.quickActions.map((action, index) => (
                <ModernButton
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center space-x-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => {
                    if (action.type === 'message' && action.message) {
                      console.log('Quick action:', action.message);
                    } else if (action.type === 'link' && action.href) {
                      window.open(action.href, '_blank');
                    }
                  }}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{action.label}</span>
                </ModernButton>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Step {currentStepIndex + 1} of {currentTour.steps.length}
          </div>
          
          <div className="flex items-center space-x-2">
            <ModernButton
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={isFirstStep}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </ModernButton>
            
            <ModernButton
              variant="primary"
              size="sm"
              onClick={nextStep}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <span>{isLastStep ? 'Finish' : 'Next'}</span>
              {!isLastStep && <ArrowRight className="w-4 h-4" />}
              {isLastStep && <CheckCircle className="w-4 h-4" />}
            </ModernButton>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / currentTour.steps.length) * 100}%` }}
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
};