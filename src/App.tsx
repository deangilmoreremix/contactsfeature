import React, { useEffect, Suspense, lazy } from 'react';
import { useState } from 'react';
import { useDarkMode } from './hooks/useDarkMode';
import { AIProvider } from './contexts/AIContext';
import { GuidanceProvider, useGuidance } from './contexts/GuidanceContext';
import { TooltipProvider } from './contexts/TooltipContext';
import { ViewProvider } from './contexts/ViewContext';
import { ContactsModal } from './components/modals/ContactsModal';
import { WelcomeExperience } from './components/guidance/WelcomeExperience';
import { ContextualHelp } from './components/guidance/ContextualHelp';
import { securityService } from './services/security.service';
import './styles/design-system.css';

// Lazy load heavy components
const LandingPage = lazy(() => import('./components/landing/LandingPage').then(module => ({ default: module.LandingPage })));
const TestWebSearch = lazy(() => import('./components/TestWebSearch').then(module => ({ default: module.TestWebSearch })));
const AITestingSuite = lazy(() => import('./components/AITestingSuite').then(module => ({ default: module.AITestingSuite })));
const TooltipTest = lazy(() => import('./components/TooltipTest').then(module => ({ default: module.TooltipTest })));
const ProductIntelligenceModal = lazy(() => import('./components/product-intelligence/ProductIntelligenceModal').then(module => ({ default: module.ProductIntelligenceModal })));

// Remote App Props Interface
interface SharedData {
  contacts: unknown[];
  appointments: unknown[];
  deals: unknown[];
  user: unknown;
}

interface RemoteAppProps {
  theme?: string;
  mode?: string;
  sharedData?: SharedData;
  onDataUpdate?: (data: unknown) => void;
}

function AppContent({ theme = 'light', mode = 'light', sharedData }: RemoteAppProps) {
  const [currentView, setCurrentView] = useState<'app' | 'landing' | 'test' | 'ai-test' | 'tooltip-test' | 'product-intelligence'>('app');
  const [, setLocalSharedData] = useState(sharedData);
  const { state, setWelcomeVisible } = useGuidance();

  // Initialize dark mode (starts in dark mode by default)
  const { isDarkMode, setDarkMode } = useDarkMode();

  // Initialize security measures
  useEffect(() => {
    securityService.initialize();
  }, []);

  // Determine the effective theme (Module Federation props take precedence)
  const effectiveTheme = theme !== 'light' ? theme : (isDarkMode ? 'dark' : 'light');

  // Apply theme (integrate both systems)
  useEffect(() => {
    // Apply Module Federation theme classes
    document.body.className = `theme-${effectiveTheme} mode-${mode}`;
    document.documentElement.setAttribute('data-theme', effectiveTheme);

    // Also apply legacy dark-mode class for backward compatibility
    if (effectiveTheme === 'dark') {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark');
    }
  }, [effectiveTheme, mode]);

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
    } else if (urlParams.get('product-intelligence') === 'true') {
      setCurrentView('product-intelligence');
    } else if (urlParams.get('app') === 'true') {
      setCurrentView('app');
    }

    // Check URL parameters for theme
    const urlTheme = urlParams.get('theme');
    if (urlTheme) {
      setDarkMode(urlTheme === 'dark');
    }
  }, [setCurrentView, setDarkMode]);

  // PostMessage Listener for iframe fallback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'SET_THEME':
          setDarkMode(data.theme === 'dark');
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
  }, [setDarkMode, setLocalSharedData]);

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

  const handleCloseTest = () => {
    setCurrentView('app');
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
      <div className={`h-screen theme-${effectiveTheme}`}>
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
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <LandingPage onClose={handleCloseLanding} />
          </Suspense>
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
              <Suspense fallback={<div>Loading...</div>}>
                <TestWebSearch />
              </Suspense>
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
              <Suspense fallback={<div>Loading...</div>}>
                <TooltipTest />
              </Suspense>
            </div>
          </div>
        ) : currentView === 'product-intelligence' ? (
          <div className="h-full">
            <div className="p-4 bg-gray-100 border-b">
              <button
                onClick={() => setCurrentView('app')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ← Back to App
              </button>
            </div>
            <div className="p-4">
              <Suspense fallback={<div>Loading...</div>}>
                <ProductIntelligenceModal
                  isOpen={true}
                  onClose={() => setCurrentView('app')}
                />
              </Suspense>
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
              <Suspense fallback={<div>Loading...</div>}>
                <AITestingSuite />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </AIProvider>
  );
}

function App(props: RemoteAppProps) {
  return (
    <TooltipProvider>
      <GuidanceProvider>
        <ViewProvider>
          <AppContent {...props} />
        </ViewProvider>
      </GuidanceProvider>
    </TooltipProvider>
  );
}

export default App;