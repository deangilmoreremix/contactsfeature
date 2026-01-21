import React from "react";
import { ContactsModal } from "./components/modals/ContactsModal";
import { ViewProvider } from "./contexts/ViewContext";
import { AIProvider } from "./contexts/AIContext";

const App: React.FC = () => {
  return (
    <AIProvider>
      <ViewProvider>
        <ContactsModal isOpen={true} onClose={() => {}} />
      </ViewProvider>
    </AIProvider>
  );
};

export default App;
