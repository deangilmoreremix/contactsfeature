import React, { useState, useEffect } from 'react';
import { Playbook } from '../../data/playbooks';
import { Contact } from '../../types/contact';
import { PlaybookSelector } from './PlaybookSelector';
import { PlaybookExecutor } from './PlaybookExecutor';
import { ModernButton } from '../ui/ModernButton';
import { X, BookOpen, Activity, TrendingUp } from 'lucide-react';

interface PlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
}

export const PlaybookModal: React.FC<PlaybookModalProps> = ({
  isOpen,
  onClose,
  contact
}) => {
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [currentView, setCurrentView] = useState<'selector' | 'executor'>('selector');
  const [executionProgress, setExecutionProgress] = useState({
    currentPhase: 1,
    totalPhases: 3,
    completionPercentage: 35,
    daysActive: 12,
    revenueGenerated: 45000,
    nextMilestone: 'Phase 2: Value Demonstration'
  });

  // Simulate live execution progress updates
  useEffect(() => {
    if (currentView !== 'executor' || !isOpen) return;

    const interval = setInterval(() => {
      setExecutionProgress(prev => ({
        ...prev,
        completionPercentage: Math.min(prev.completionPercentage + Math.floor(Math.random() * 3), 85),
        revenueGenerated: prev.revenueGenerated + Math.floor(Math.random() * 2000),
        daysActive: prev.daysActive + Math.floor(Math.random() * 0.5)
      }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [currentView, isOpen]);

  const handleSelectPlaybook = (playbook: Playbook) => {
    setSelectedPlaybook(playbook);
    setCurrentView('executor');
  };

  const handleBackToSelector = () => {
    setSelectedPlaybook(null);
    setCurrentView('selector');
  };

  const handleClose = () => {
    setSelectedPlaybook(null);
    setCurrentView('selector');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col animate-scale-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentView === 'selector' ? 'Recurring Revenue Playbooks' : 'Execute Playbook'}
              </h2>
              <p className="text-gray-600">
                {currentView === 'selector'
                  ? 'Choose the perfect strategy to convert this contact into recurring revenue'
                  : `Executing ${selectedPlaybook?.name} for ${contact.firstName || contact.name}`
                }
              </p>
            </div>
          </div>

          <ModernButton
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </ModernButton>
        </div>

        {/* Live Execution Progress - Only show in executor view */}
        {currentView === 'executor' && (
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-600 animate-pulse" />
                <span className="text-sm font-medium text-gray-700">Live Execution Progress</span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{executionProgress.currentPhase}/{executionProgress.totalPhases}</span>
                  <span className="text-gray-600">Phase</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{executionProgress.completionPercentage}%</span>
                  <span className="text-gray-600">Complete</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-600">${Math.floor(executionProgress.revenueGenerated / 1000)}K</span>
                  <span className="text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{Math.floor(executionProgress.daysActive)}</span>
                  <span className="text-gray-600">Days Active</span>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress to Goal</span>
                <span>{executionProgress.completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-1000 ease-out animate-pulse"
                  style={{ width: `${executionProgress.completionPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Current: Phase {executionProgress.currentPhase}</span>
                <span>Next: {executionProgress.nextMilestone}</span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {currentView === 'selector' ? (
              <PlaybookSelector
                onSelectPlaybook={handleSelectPlaybook}
                selectedContact={contact}
              />
            ) : selectedPlaybook ? (
              <PlaybookExecutor
                playbook={selectedPlaybook}
                contact={contact}
                onBack={handleBackToSelector}
              />
            ) : null}
          </div>
        </div>

        {/* Footer */}
        {currentView === 'executor' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white">
            <div className="text-sm text-gray-600">
              Following the proven 60-day process to convert this contact into recurring revenue
            </div>
            <div className="flex items-center space-x-3">
              <ModernButton
                variant="outline"
                onClick={handleBackToSelector}
              >
                Choose Different Playbook
              </ModernButton>
              <ModernButton
                variant="primary"
                onClick={handleClose}
              >
                Continue in Background
              </ModernButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};