import React, { useState } from 'react';
import { useTourStore } from '../../store/tourStore';
import { tours } from '../../config/tour.config';
import { ModernButton } from '../ui/ModernButton';
import { 
  HelpCircle, 
  Play, 
  CheckCircle, 
  Brain, 
  Users, 
  Sparkles, 
  Book,
  X,
  ChevronDown
} from 'lucide-react';

export const HelpButton: React.FC = () => {
  const { 
    showHelpButton, 
    startTour, 
    completedTours, 
    resetTourProgress,
    isTourActive 
  } = useTourStore();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!showHelpButton || isTourActive) return null;

  const availableTours = tours.filter(tour => 
    // Show all tours, but mark completed ones
    true
  );

  const getTourIcon = (category: string) => {
    switch (category) {
      case 'onboarding': return Users;
      case 'ai-features': return Brain;
      case 'advanced': return Sparkles;
      case 'updates': return CheckCircle;
      default: return Play;
    }
  };

  const handleStartTour = (tourId: string) => {
    startTour(tourId);
    setIsMenuOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-30">
      {/* Help Menu */}
      {isMenuOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Book className="w-5 h-5 mr-2 text-blue-500" />
              Help & Tutorials
            </h3>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {availableTours.map((tour) => {
              const Icon = getTourIcon(tour.category);
              const isCompleted = completedTours.includes(tour.id);

              return (
                <div
                  key={tour.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 ${tour.category === 'ai-features' ? 'text-purple-600' : 'text-blue-600'}`} />
                      <h4 className="font-medium text-gray-900">{tour.name}</h4>
                      {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {tour.steps.length} steps
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{tour.description}</p>
                  
                  <div className="flex items-center space-x-2">
                    <ModernButton
                      variant={isCompleted ? "outline" : "primary"}
                      size="sm"
                      onClick={() => handleStartTour(tour.id)}
                      className="flex items-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>{isCompleted ? 'Replay' : 'Start'} Tour</span>
                    </ModernButton>
                    
                    {isCompleted && (
                      <button
                        onClick={() => resetTourProgress(tour.id)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Reset Progress
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Help Links */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-2">
              <button className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                📖 Knowledge Base
              </button>
              <button className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                🎥 Video Tutorials
              </button>
              <button className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                💬 Contact Support
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Button */}
      <ModernButton
        variant="primary"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
      >
        {isMenuOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <HelpCircle className="w-6 h-6 text-white" />
        )}
      </ModernButton>

      {/* Pulse animation for attention */}
      {!isMenuOpen && (
        <div className="absolute inset-0 w-14 h-14 rounded-full bg-blue-400 animate-ping opacity-20"></div>
      )}
    </div>
  );
};