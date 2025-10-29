import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { tooltipService, TooltipConfiguration } from '../services/tooltipService';

interface TooltipContextType {
  isInitialized: boolean;
  getTooltip: (featureId: string) => TooltipConfiguration | null;
  hasTooltip: (featureId: string) => boolean;
  refreshTooltips: () => Promise<void>;
  tooltipCount: number;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export const useTooltip = () => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
};

interface TooltipProviderProps {
  children: ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [tooltipCount, setTooltipCount] = useState(0);

  useEffect(() => {
    const initializeTooltips = async () => {
      try {
        console.log('TooltipProvider: Initializing tooltip service...');
        await tooltipService.initialize();
        setTooltipCount(tooltipService.getTooltipCount());
        setIsInitialized(true);
        console.log(`TooltipProvider: Initialized with ${tooltipService.getTooltipCount()} tooltips`);
      } catch (error) {
        console.error('TooltipProvider: Failed to initialize:', error);
        setIsInitialized(true);
      }
    };

    initializeTooltips();
  }, []);

  const getTooltip = (featureId: string): TooltipConfiguration | null => {
    return tooltipService.getTooltip(featureId);
  };

  const hasTooltip = (featureId: string): boolean => {
    return tooltipService.hasTooltip(featureId);
  };

  const refreshTooltips = async (): Promise<void> => {
    await tooltipService.refresh();
    setTooltipCount(tooltipService.getTooltipCount());
  };

  const contextValue: TooltipContextType = {
    isInitialized,
    getTooltip,
    hasTooltip,
    refreshTooltips,
    tooltipCount
  };

  return (
    <TooltipContext.Provider value={contextValue}>
      {children}
    </TooltipContext.Provider>
  );
};
