import React, { useEffect } from 'react';
import { useState } from 'react';
import { AIProvider } from './contexts/AIContext';
import { GuidanceProvider, useGuidance } from './contexts/GuidanceContext';
import { ContactsModal } from './components/modals/ContactsModal';
import { LandingPage } from './components/landing/LandingPage';
import { TestWebSearch } from './components/TestWebSearch';
import { AITestingSuite } from './components/AITestingSuite';
import { WelcomeExperience } from './components/guidance/WelcomeExperience';
import { ContextualHelp } from './components/guidance/ContextualHelp';
import { TooltipTest } from './components/TooltipTest';
import './styles/design-system.css';

// Remote App Props Interface
interface RemoteAppProps {
  theme?: string;
  mode?: string;
  sharedData?: {
    contacts: any[];
    appointments: any[];
    deals: any[];
    user: any;
  };
  onDataUpdate?: (data: any) => void;
}

function AppContent({ theme = 'light', mode = 'light', sharedData, onDataUpdate }: RemoteAppProps) {
  const [currentView, setCurrentView] = useState<'app' | 'landing' | 'test' | 'ai-test' | 'tooltip-test'>('app');
  const [localTheme, setLocalTheme] = useState(theme);
  const [localSharedData, setLocalSharedData] = useState(sharedData);
  const { state, setWelcomeVisible } = useGuidance();

  // Apply theme
  useEffect(() => {
    document.body.className = `theme-${localTheme} mode-${mode}`;
    document.documentElement.setAttribute('data-theme', localTheme);
  }, [localTheme, mode]);

  // Handle shared data updates
  useEffect(() => {
    if (sharedData) {
      console.log('📊 Received shared data:', sharedData);
      setLocalSharedData(sharedData);
    }
  }, [sharedData]);

  // Check URL parameters for test mode and theme
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === 'true') {
      setCurrentView('test');
    } else if (urlParams.get('ai-test') === 'true') {
      setCurrentView('ai-test');
    } else if (urlParams.get('tooltip-test') === 'true') {
      setCurrentView('tooltip-test');
    }

    // Check URL parameters for theme
    const urlTheme = urlParams.get('theme');
    if (urlTheme) {
      setLocalTheme(urlTheme);
      document.body.className = `theme-${urlTheme}`;
    }
  }, []);

  // PostMessage Listener for iframe fallback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'SET_THEME':
          setLocalTheme(data.theme);
          document.body.className = `theme-${data.theme}`;
          break;
        case 'INITIAL_DATA_SYNC':
          setLocalSharedData(data);
          break;
        case 'SHARED_STATE_UPDATED':
          setLocalSharedData(data);
          break;
        case 'MODULE_SYNC_BROADCAST':
          console.log('Sync from other module:', data);
          break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send ready signal to host
  useEffect(() => {
    window.parent?.postMessage({
      type: 'MODULE_READY',
      module: 'contacts',
      data: { initialized: true }
    }, '*');
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

  // Send data updates back to host
  const handleLocalDataUpdate = (newData: any) => {
    setLocalSharedData(newData);
    onDataUpdate?.(newData);
  };

  return (
    <AIProvider>
      <div className={`h-screen theme-${localTheme}`}>
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
        ) : currentView === 'tooltip-test' ? (
          <div className="h-full">
            <div className="p-4 bg-gray-100 border-b">
              <button
                onClick={() => setCurrentView('app')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ← Back to App
              </button>
            </div>
            <div className="overflow-y-auto">
              <TooltipTest />
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

function App(props: RemoteAppProps) {
  return (
    <GuidanceProvider>
      <AppContent {...props} />
    </GuidanceProvider>
  );
}

export default App;