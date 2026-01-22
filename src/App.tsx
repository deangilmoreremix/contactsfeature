import React, { useState } from "react";
import { ContactsModal } from "./components/modals/ContactsModal";
import { ViewProvider } from "./contexts/ViewContext";
import { AIProvider } from "./contexts/AIContext";
import Products from "./pages/Products";

type AppView = 'contacts' | 'products';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('contacts');

  return (
    <div className="min-h-screen bg-gray-100">
      <AIProvider>
        <ViewProvider>
          {currentView === 'contacts' && (
            <ContactsModal
              isOpen={true}
              onClose={() => {}}
              onNavigate={(view: string) => {
                if (view === 'products') {
                  setCurrentView('products');
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
