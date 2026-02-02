import React from "react";
import { ContactsModal } from "./components/modals/ContactsModal";
import { ViewProvider } from "./contexts/ViewContext";
import { AIProvider } from "./contexts/AIContext";

const App: React.FC = () => {
  return (
    <AIProvider>
      <ViewProvider>
        <div className="relative">
          <ContactsModal isOpen={true} onClose={() => {}} />
        </div>
      </ViewProvider>
    </AIProvider>
  );
};

export default App;
