import React from 'react';
import { useState } from 'react';
import { useDarkMode } from './hooks/useDarkMode';
import { AIProvider } from './contexts/AIContext';
import { TourProvider } from './components/tour/TourProvider';
import { ContactsModal } from './components/modals/ContactsModal';
import { LandingPage } from './components/landing/LandingPage';
import './styles/design-system.css';

function App() {
  const [currentView, setCurrentView] = useState<'app' | 'landing'>('app');
  
  // Initialize dark mode (this will apply the theme class to body)
  useDarkMode();

  const handleShowLanding = () => {
    setCurrentView('landing');
  };

  const handleCloseLanding = () => {
    setCurrentView('app');
  };

  return (
    <AIProvider>
      <TourProvider>
      <div className="h-screen">
        {currentView === 'app' ? (
          <ContactsModal 
            isOpen={true} 
            onClose={handleShowLanding}
          />
        ) : (
          <LandingPage onClose={handleCloseLanding} />
        )}
      </div>
      </TourProvider>
    </AIProvider>
  );
}

export default App;