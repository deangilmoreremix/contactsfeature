import React from 'react';
import { useState } from 'react';
import { useDarkMode } from './hooks/useDarkMode';
import { AIProvider } from './contexts/AIContext';
import { GuidanceProvider, useGuidance } from './contexts/GuidanceContext';
import { ContactsModal } from './components/modals/ContactsModal';
import { LandingPage } from './components/landing/LandingPage';
import { TestWebSearch } from './components/TestWebSearch';
import { AITestingSuite } from './components/AITestingSuite';
import { WelcomeExperience } from './components/guidance/WelcomeExperience';
import { ContextualHelp } from './components/guidance/ContextualHelp';
import './styles/design-system.css';

function AppContent() {
  const [currentView, setCurrentView] = useState<'app' | 'landing' | 'test' | 'ai-test'>('app');
  const { state, setWelcomeVisible } = useGuidance();

  // Initialize dark mode (this will apply the theme class to body)
  useDarkMode();

  // Check URL parameters for test mode
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === 'true') {
      setCurrentView('test');
    } else if (urlParams.get('ai-test') === 'true') {
      setCurrentView('ai-test');
    }
  }, []);

  const handleShowLanding = () => {
    setCurrentView('landing');
  };

  const handleCloseLanding = () => {
    setCurrentView('app');
  };

  const handleShowTest = () => {
    setCurrentView('test');
  };

  const handleCloseTest = () => {
    setCurrentView('app');
  };

  const handleShowAITest = () => {
    setCurrentView('ai-test');
  };

  const handleCloseAITest = () => {
    setCurrentView('app');
  };

  const handleWelcomeComplete = () => {
    setWelcomeVisible(false);
  };

  const handleWelcomeSkip = () => {
    setWelcomeVisible(false);
  };

  return (
    <AIProvider>
      <div className="h-screen">
        {/* Welcome Experience for new users */}
        {state.showWelcome && (
          <WelcomeExperience
            onComplete={handleWelcomeComplete}
            onSkip={handleWelcomeSkip}
          />
        )}

        {/* Contextual Help System */}
        <ContextualHelp position="top-right" />

        {currentView === 'app' ? (
          <div data-guidance="main-app">
            <ContactsModal
              isOpen={true}
              onClose={handleShowLanding}
            />
          </div>
        ) : currentView === 'landing' ? (
          <LandingPage onClose={handleCloseLanding} />
        ) : currentView === 'test' ? (
          <div className="h-full">
            <div className="p-4 bg-gray-100 border-b">
              <button
                onClick={handleCloseTest}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ← Back to App
              </button>
            </div>
            <div className="p-4">
              <TestWebSearch />
            </div>
          </div>
        ) : (
          <div className="h-full">
            <div className="p-4 bg-gray-100 border-b">
              <button
                onClick={handleCloseAITest}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ← Back to App
              </button>
            </div>
            <div className="p-4">
              <AITestingSuite />
            </div>
          </div>
        )}
      </div>
    </AIProvider>
  );
}

function App() {
  return (
    <GuidanceProvider>
      <AppContent />
    </GuidanceProvider>
  );
}

export default App;