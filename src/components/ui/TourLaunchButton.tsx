import React from 'react';
import { ModernButton } from './ModernButton';
import { useTourStore } from '../../store/tourStore';
import { Play, Brain, Users, Sparkles } from 'lucide-react';

interface TourLaunchButtonProps {
  tourId: string;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export const TourLaunchButton: React.FC<TourLaunchButtonProps> = ({
  tourId,
  variant = 'outline',
  size = 'sm',
  className = '',
  children
}) => {
  const { startTour, completedTours } = useTourStore();
  
  const isCompleted = completedTours.includes(tourId);
  
  const getTourInfo = () => {
    switch (tourId) {
      case 'onboarding':
        return { 
          label: 'Take Tour', 
          icon: Users,
          description: 'Learn the basics'
        };
      case 'ai-features-deep-dive':
        return { 
          label: 'AI Features Tour', 
          icon: Brain,
          description: 'Explore AI capabilities'
        };
      default:
        return { 
          label: 'Start Tour', 
          icon: Play,
          description: 'Learn more'
        };
    }
  };

  const { label, icon: Icon, description } = getTourInfo();

  const handleClick = () => {
    startTour(tourId);
  };

  return (
    <ModernButton
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`flex items-center space-x-2 ${className} ${
        tourId.includes('ai') ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' : ''
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{children || (isCompleted ? `Replay ${label}` : label)}</span>
      {tourId.includes('ai') && <Sparkles className="w-3 h-3 text-yellow-500" />}
    </ModernButton>
  );
};