import React, { useState, lazy, Suspense } from "react";
import { LandingPage } from "./components/landing/LandingPage";
import { ViewProvider } from "./contexts/ViewContext";
import { AIProvider } from "./contexts/AIContext";

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

type AppView = 'landing' | 'contacts' | 'products';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');

  return (
    <div className="min-h-screen bg-gray-100">
      <AIProvider>
        <ViewProvider>
          {currentView === 'landing' && (
            <LandingPage onClose={() => setCurrentView('contacts')} />
          )}
          <Suspense fallback={<PageLoader />}>
            {currentView === 'contacts' && (
              <ContactsModal
                isOpen={true}
                onClose={() => setCurrentView('landing')}
                onNavigate={(view: string) => {
                  if (view === 'products') {
                    setCurrentView('products');
                  } else if (view === 'landing') {
                    setCurrentView('landing');
                  }
                }}
              />
            )}
            {currentView === 'products' && (
              <div className="min-h-screen">
                <Products onNavigateBack={() => setCurrentView('contacts')} />
              </div>
            )}
          </Suspense>
        </ViewProvider>
      </AIProvider>
    </div>
  );
};

export default App;
