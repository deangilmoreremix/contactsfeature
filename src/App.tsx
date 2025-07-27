import React from 'react';
import { useDarkMode } from './hooks/useDarkMode';
import { AIProvider } from './contexts/AIContext';
import { MetricsCards } from './components/dashboard/MetricsCards';
import { NewLeadsSection } from './components/dashboard/NewLeadsSection';
import { InteractionHistory } from './components/dashboard/InteractionHistory';
import { TasksAndFunnel } from './components/dashboard/TasksAndFunnel';
import { CustomerProfile } from './components/dashboard/CustomerProfile';
import { RecentActivity } from './components/dashboard/RecentActivity';
import { ContactsModal } from './components/modals/ContactsModal';
import { AIInsightsPanel } from './components/dashboard/AIInsightsPanel';
import { ChartsSection } from './components/dashboard/ChartsSection';
import { QuickActions } from './components/dashboard/QuickActions';
import { KPICards } from './components/dashboard/KPICards';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { ConnectedApps } from './components/dashboard/ConnectedApps';
import './styles/design-system.css';

function App() {
  // Initialize dark mode (this will apply the theme class to body)
  useDarkMode();

  return (
    <AIProvider>
      <div className="h-screen">
        {/* Always show ContactsModal with isOpen={true} */}
        <ContactsModal 
          isOpen={true} 
          onClose={() => {/* Do nothing to prevent closing */}} 
        />
      </div>
    </AIProvider>
  );
}

export default App;