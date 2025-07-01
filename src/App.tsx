import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
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
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <>
            <DashboardHeader />
            
            {/* AI Insights Panel */}
            <AIInsightsPanel />
            
            {/* Enhanced KPI Cards */}
            <KPICards />
            
            {/* Quick Actions */}
            <QuickActions />
            
            {/* Charts Section */}
            <ChartsSection />
            
            {/* Original Metrics */}
            <MetricsCards />
            
            {/* New Leads Section */}
            <NewLeadsSection />
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <InteractionHistory />
                <RecentActivity />
                <TasksAndFunnel />
              </div>
              
              <div className="xl:col-span-1">
                <CustomerProfile />
                <div className="mt-6">
                  <ConnectedApps />
                </div>
              </div>
            </div>
          </>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
              <p className="text-gray-600">Comprehensive business intelligence dashboard</p>
            </div>
            <KPICards />
            <ChartsSection />
            <AIInsightsPanel />
          </div>
        );
      case 'contacts':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Contact Management</h1>
              <p className="text-gray-600">Manage and analyze your contact relationships</p>
            </div>
            <NewLeadsSection />
          </div>
        );
      default:
        return renderCurrentView();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex space-x-6">
          {/* Enhanced Sidebar with Navigation */}
          <div className="relative">
            <Sidebar onContactsClick={() => setIsContactsModalOpen(true)} />
            
            {/* Navigation Pills */}
            <div className="mt-6 w-16 space-y-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`w-full p-2 rounded-lg transition-all duration-200 ${
                  currentView === 'dashboard' 
                    ? 'bg-blue-500/20 text-blue-600' 
                    : 'text-gray-600 hover:bg-white/50'
                }`}
                title="Dashboard"
              >
                <div className="w-8 h-1 bg-current rounded mx-auto"></div>
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className={`w-full p-2 rounded-lg transition-all duration-200 ${
                  currentView === 'analytics' 
                    ? 'bg-purple-500/20 text-purple-600' 
                    : 'text-gray-600 hover:bg-white/50'
                }`}
                title="Analytics"
              >
                <div className="w-8 h-1 bg-current rounded mx-auto"></div>
              </button>
              <button
                onClick={() => setCurrentView('contacts')}
                className={`w-full p-2 rounded-lg transition-all duration-200 ${
                  currentView === 'contacts' 
                    ? 'bg-green-500/20 text-green-600' 
                    : 'text-gray-600 hover:bg-white/50'
                }`}
                title="Contacts"
              >
                <div className="w-8 h-1 bg-current rounded mx-auto"></div>
              </button>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            <TopBar />
            
            {/* Dynamic Content Based on Current View */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {currentView === 'dashboard' && 'Customer Information'}
                {currentView === 'analytics' && 'Business Intelligence'}
                {currentView === 'contacts' && 'Contact Management'}
              </h1>
              <p className="text-gray-600">
                {currentView === 'dashboard' && 'Manage your customer relationships and track interactions'}
                {currentView === 'analytics' && 'Advanced analytics and performance insights'}
                {currentView === 'contacts' && 'Comprehensive contact management with AI insights'}
              </p>
            </div>
            
            {renderCurrentView()}
          </div>
        </div>
      </div>

      {/* Enhanced Contacts Modal */}
      <ContactsModal 
        isOpen={isContactsModalOpen} 
        onClose={() => setIsContactsModalOpen(false)} 
      />
    </div>
  );
}

export default App;