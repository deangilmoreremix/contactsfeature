import React, { useState, useEffect } from "react";
import { ViewProvider } from "./contexts/ViewContext";
import { AIProvider } from "./contexts/AIContext";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ContactsModal } from "./components/modals/ContactsModal";
import Products from "./pages/Products";

// SmartCRM Remote Props Contract (per host bootstrap spec)
// The host (app.smartcrm.vip) passes these when dynamically loading this remote via MF.
export interface SmartCRMRemoteProps {
  sharedData?: {
    user?: any;
    isAuthenticated?: boolean;
    session?: any;
    tenant?: any;
    theme?: "light" | "dark";
  };
  initialRoute?: string; // e.g. "/contacts", "/products"
  onEvent?: (event: { type: string; payload?: any }) => void;
  onDataUpdate?: (data: any) => void;
}

type AppView = 'contacts' | 'products';

const LoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      <span className="text-sm text-gray-500">Loading...</span>
    </div>
  </div>
);

const App: React.FC<SmartCRMRemoteProps> = ({
  sharedData,
  initialRoute,
  onEvent,
  onDataUpdate,
}) => {
  // Bootstrap: derive initial view from route or default
  const getInitialView = (): AppView => {
    if (initialRoute?.includes('products')) return 'products';
    return 'contacts';
  };

  const [currentView, setCurrentView] = useState<AppView>(getInitialView());
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme from host sharedData if provided (full app bootstrap support)
  const theme = sharedData?.theme || 'light';
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.classList.toggle('dark', theme === 'dark');
    }
    setIsLoading(false);
  }, [theme]);

  // Full remote lifecycle: notify host on mount + support callbacks (per spec)
  useEffect(() => {
    console.log('[SmartCRM Remote] Full app bootstrap complete inside host', { sharedData, initialRoute });
    onEvent?.({ type: 'remote-mounted', payload: { view: currentView } });
  }, [currentView, sharedData, initialRoute, onEvent]);

  // Allow host to drive navigation via initialRoute (extendable)
  useEffect(() => {
    if (initialRoute) {
      const nextView = initialRoute.includes('products') ? 'products' : 'contacts';
      if (nextView !== currentView) setCurrentView(nextView);
    }
  }, [initialRoute, currentView]);

  if (isLoading) return <LoadingFallback />;

  return (
    <div className="min-h-screen bg-gray-100" data-smartcrm-remote="true">
      <AIProvider>
        <ViewProvider>
          <ErrorBoundary
            onError={(error, errorInfo) => {
              console.error('App ErrorBoundary caught:', error, errorInfo);
              const root = document.getElementById('root');
              if (root) {
                const pre = root.querySelector('pre[data-app-error]');
                if (pre) {
                  pre.textContent = `APP ERROR: ${error.message}`;
                }
              }
            }}
          >
            {currentView === 'contacts' && (
              <ContactsModal
                isOpen={true}
                onClose={() => {
                  onEvent?.({ type: 'modal-closed', payload: { view: 'contacts' } });
                }}
                onNavigate={(view: string) => {
                  if (view === 'products') {
                    setCurrentView('products');
                    onEvent?.({ type: 'navigate', payload: { to: 'products' } });
                  }
                }}
              />
            )}
            {currentView === 'products' && (
              <div className="min-h-screen">
                <Products
                  onNavigateBack={() => {
                    setCurrentView('contacts');
                    onEvent?.({ type: 'navigate', payload: { to: 'contacts' } });
                  }}
                />
              </div>
            )}
          </ErrorBoundary>
        </ViewProvider>
      </AIProvider>
    </div>
  );
};

export default App;

// NOTE: For the complete SmartCRM experience (all features + full shell) use SmartCRMApp instead.
// This file remains as the legacy minimal shell for backward compatibility with any host still referencing ./App.

