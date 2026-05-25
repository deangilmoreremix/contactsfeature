import React, { useState, useEffect, lazy, Suspense } from "react";
import { ViewProvider } from "./contexts/ViewContext";
import { AIProvider } from "./contexts/AIContext";

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

const ContactsModal = lazy(() => import("./components/modals/ContactsModal").then(m => ({ default: m.ContactsModal })));
const Products = lazy(() => import("./pages/Products"));

const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      <span className="text-sm text-gray-500">Loading...</span>
    </div>
  </div>
);

type AppView = 'contacts' | 'products';

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

  // Apply theme from host sharedData if provided (full app bootstrap support)
  const theme = sharedData?.theme || 'light';
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Full remote lifecycle: notify host on mount + support callbacks (per spec)
  useEffect(() => {
    console.log('[SmartCRM Remote] Full app bootstrap complete inside host', { sharedData, initialRoute });
    onEvent?.({ type: 'remote-mounted', payload: { view: currentView } });
    // Example: could wire onDataUpdate for cross-app sync
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Allow host to drive navigation via initialRoute (extendable)
  useEffect(() => {
    if (initialRoute) {
      const nextView = initialRoute.includes('products') ? 'products' : 'contacts';
      if (nextView !== currentView) setCurrentView(nextView);
    }
  }, [initialRoute]);

  return (
    <div className="min-h-screen bg-gray-100" data-smartcrm-remote="true">
      <AIProvider>
        <ViewProvider>
          <Suspense fallback={<PageLoader />}>
            {currentView === 'contacts' && (
              <ContactsModal
                isOpen={true}
                onClose={() => {
                  // In host context, closing may mean navigate away - notify host
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
          </Suspense>
        </ViewProvider>
      </AIProvider>
    </div>
  );
};

export default App;
