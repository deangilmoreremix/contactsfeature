import React, { useState, useEffect } from 'react';
import { useGuidance } from '../../contexts/GuidanceContext';
import { ModernButton } from '../ui/ModernButton';
import { GlassCard } from '../ui/GlassCard';
import {
  Sparkles,
  Users,
  Brain,
  ArrowRight,
  Play,
  X,
  CheckCircle
} from 'lucide-react';

interface WelcomeExperienceProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { startTour } = useGuidance();

  const welcomeSteps = [
    {
      icon: Sparkles,
      title: 'Welcome to ContactFlow! 🚀',
      description: 'Your AI-powered contact management platform is ready to transform how you manage relationships.',
      features: [
        'AI-powered contact research',
        'Smart form auto-completion',
        'Intelligent lead scoring',
        'Automated data enrichment'
      ],
      color: 'from-blue-500 to-purple-600'
    },
    {
      icon: Users,
      title: 'Smart Contact Management',
      description: 'Manage your contacts with intelligent AI assistance that learns from your preferences.',
      features: [
        'Automatic contact enrichment',
        'LinkedIn profile integration',
        'Email verification & validation',
        'Relationship tracking'
      ],
      color: 'from-green-500 to-teal-600'
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Get actionable insights about your contacts and business relationships.',
      features: [
        'Lead scoring & prioritization',
        'Communication optimization',
        'Business intelligence',
        'Predictive analytics'
      ],
      color: 'from-orange-500 to-red-600'
    }
  ];

  const handleNext = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      handleStartTour();
    }
  };

  const handleStartTour = () => {
    // Start the full product tour
    startTour({
      id: 'welcome',
      name: 'Welcome to ContactFlow',
      description: 'Get started with your AI-powered contact management platform',
      targetAudience: 'new-users',
      steps: [] // Will be populated by the guidance engine
    });
    onComplete();
  };

  const currentStepData = welcomeSteps[currentStep];
  const IconComponent = currentStepData?.icon || Sparkles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <GlassCard className="max-w-2xl mx-4 p-8 relative">
        {/* Close Button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Skip welcome experience"
        >
          <X size={20} />
        </button>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {welcomeSteps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'bg-blue-500 scale-125'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        {currentStepData && (
          <div className={`transition-all duration-500 ${isAnimating ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'}`}>
            {/* Icon */}
            <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r ${currentStepData.color} flex items-center justify-center`}>
              <IconComponent size={40} className="text-white" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
              {currentStepData.title}
            </h1>

            {/* Description */}
            <p className="text-lg text-center text-gray-600 mb-8 leading-relaxed">
              {currentStepData.description}
            </p>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {currentStepData.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <CheckCircle size={20} className="text-green-500" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <ModernButton
                variant="outline"
                onClick={onSkip}
                className="flex items-center space-x-2"
              >
                <span>Skip Tour</span>
              </ModernButton>

              <ModernButton
                onClick={handleNext}
                className={`flex items-center space-x-2 bg-gradient-to-r ${currentStepData.color} hover:opacity-90`}
              >
                <span>
                  {currentStep === welcomeSteps.length - 1 ? 'Start Exploring' : 'Next'}
                </span>
                <ArrowRight size={16} />
              </ModernButton>
            </div>
          </div>
        )}

        {/* Quick Start Option */}
        {currentStep === 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Play size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Ready to dive in?</h4>
                <p className="text-sm text-blue-700">
                  We'll guide you through the key features, or you can explore on your own.
                </p>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};