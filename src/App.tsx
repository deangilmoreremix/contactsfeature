import React, { useState } from "react";
import { LandingPage } from "./components/landing/LandingPage";
import { ContactsModal } from "./components/modals/ContactsModal";
import { ViewProvider } from "./contexts/ViewContext";
import { AIProvider } from "./contexts/AIContext";
import Products from "./pages/Products";

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
        </ViewProvider>
      </AIProvider>
    </div>
  );
};

export default App;
