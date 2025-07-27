import React, { useState } from 'react';
import { useDarkMode } from './hooks/useDarkMode';
import { EnhancedNavbar } from './components/layout/EnhancedNavbar';
import { ContactsModal } from './components/modals/ContactsModal';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { MetricsCards } from './components/dashboard/MetricsCards';
import { NewLeadsSection } from './components/dashboard/NewLeadsSection';
import { EnhancedAIInsightsPanel } from './components/dashboard/EnhancedAIInsightsPanel';
import { RecentActivity } from './components/dashboard/RecentActivity';
import { TasksAndFunnel } from './components/dashboard/TasksAndFunnel';
import { ModernButton } from './components/ui/ModernButton';
import { Users, Brain, BarChart3 } from 'lucide-react';
import './styles/design-system.css';

function App() {
  // Initialize dark mode (this will apply the theme class to body)
  useDarkMode();
  
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

  const handleContactsClick = () => {
    setIsContactsModalOpen(true);
  };

  const handleContactsModalClose = () => {
    setIsContactsModalOpen(false);
  };

  return (
    <div className="min-h-screen">
      {/* Enhanced Navbar with Dark Mode Toggle */}
      <EnhancedNavbar />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Dashboard Header */}
        <DashboardHeader />
        
        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            onClick={handleContactsClick}
            className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Contact Management</h3>
                <p className="text-gray-600">Manage and analyze your contacts with AI</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">AI Tools</h3>
                <p className="text-gray-600">Smart automation and insights</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Analytics</h3>
                <p className="text-gray-600">Performance insights and reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Panel */}
        <EnhancedAIInsightsPanel />
        
        {/* Metrics */}
        <MetricsCards />
        
        {/* Recent Activity and Tasks */}
        <RecentActivity />
        <TasksAndFunnel />
        
        {/* New Leads Section */}
        <NewLeadsSection />

        {/* Call-to-Action for Contacts */}
        <div className="text-center py-8">
          <ModernButton
            variant="primary"
            onClick={handleContactsClick}
            className="flex items-center space-x-2 mx-auto"
          >
            <Users className="w-5 h-5" />
            <span>Open Contact Management</span>
          </ModernButton>
        </div>
      </div>

      {/* Contacts Modal */}
      <ContactsModal 
        isOpen={isContactsModalOpen} 
        onClose={handleContactsModalClose} 
      />
    </div>
  );
}

export default App;