import React, { useState } from "react";
import { ContactsModal } from "./components/modals/ContactsModal";
import { MetorialMCPTest } from "./components/MetorialMCPTest";
import { ViewProvider } from "./contexts/ViewContext";
import { AIProvider } from "./contexts/AIContext";
import { ModernButton } from "./components/ui/ModernButton";

const App: React.FC = () => {
  const [showTest, setShowTest] = useState(false);

  if (showTest) {
    return (
      <AIProvider>
        <ViewProvider>
          <div className="min-h-screen bg-gray-100">
            <div className="p-4">
              <ModernButton
                onClick={() => setShowTest(false)}
                variant="outline"
                className="mb-4"
              >
                ← Back to Contacts
              </ModernButton>
            </div>
            <MetorialMCPTest />
          </div>
        </ViewProvider>
      </AIProvider>
    );
  }

  return (
    <AIProvider>
      <ViewProvider>
        <div className="relative">
          <ContactsModal isOpen={true} onClose={() => {}} />
          {/* Test Button - Remove after testing */}
          <div className="fixed top-4 right-4 z-50">
            <ModernButton
              onClick={() => setShowTest(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              🧪 Test Metorial MCP
            </ModernButton>
          </div>
        </div>
      </ViewProvider>
    </AIProvider>
  );
};

export default App;
