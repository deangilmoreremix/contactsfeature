import React, { useState, Suspense, lazy } from 'react';
import { ResearchStatusOverlay, useResearchStatus } from '../ui/ResearchStatusOverlay';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { QuickEmailComposer } from '../contacts/QuickEmailComposer';
import { QuickCallHandler } from '../contacts/QuickCallHandler';
import { QuickSMSComposer } from '../contacts/QuickSMSComposer';
import { AISettingsPanel } from '../ai-sales-intelligence/AISettingsPanel';
import { APIConfigurationPanel } from '../ui/APIConfigurationPanel';
import { ContactSidebar } from '../contacts/ContactSidebar';
import { ContactHeader } from '../contacts/ContactHeader';
import { Contact } from '../../types/contact';
import { ContactEnrichmentData } from '../../services/aiEnrichmentService';
import { useContactTabs } from '../../hooks/useContactTabs';

// Lazy load tab components for better performance
const ContactOverviewTab = lazy(() => import('../contacts/ContactOverviewTab').then(module => ({ default: module.ContactOverviewTab })));
const ContactSalesIntelligenceTab = lazy(() => import('../contacts/ContactSalesIntelligenceTab').then(module => ({ default: module.ContactSalesIntelligenceTab })));
const ContactPlaybooksTab = lazy(() => import('../contacts/ContactPlaybooksTab').then(module => ({ default: module.ContactPlaybooksTab })));
const ContactJourneyTimeline = lazy(() => import('../contacts/ContactJourneyTimeline').then(module => ({ default: module.ContactJourneyTimeline })));
const ContactAnalytics = lazy(() => import('../contacts/ContactAnalytics').then(module => ({ default: module.ContactAnalytics })));
const CommunicationHub = lazy(() => import('../contacts/CommunicationHub').then(module => ({ default: module.CommunicationHub })));
const AutomationPanel = lazy(() => import('../contacts/AutomationPanel').then(module => ({ default: module.AutomationPanel })));
const AIInsightsPanel = lazy(() => import('../contacts/AIInsightsPanel').then(module => ({ default: module.AIInsightsPanel })));
const ContactEmailPanel = lazy(() => import('../contacts/ContactEmailPanel').then(module => ({ default: module.ContactEmailPanel })));
const ContactOutboundAgentPanel = lazy(() => import('../contacts/ContactOutboundAgentPanel').then(module => ({ default: module.ContactOutboundAgentPanel })));
const ContactSDRPanel = lazy(() => import('../contacts/ContactSDRPanel').then(module => ({ default: module.ContactSDRPanel })));

interface ContactDetailViewProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<Contact>) => Promise<Contact>;
}

export const ContactDetailView: React.FC<ContactDetailViewProps> = ({
  contact,
  isOpen,
  onClose,
  onUpdate
}) => {
  // Provide a default onUpdate function to handle cases where it's not provided
  const handleUpdate: (id: string, updates: Partial<Contact>) => Promise<Contact> = onUpdate || ((id: string, updates: Partial<Contact>) => Promise.resolve(contact));
  // State management
  const { activeTab, changeTab } = useContactTabs('overview');
  const researchStatus = useResearchStatus();

  // Modal states
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showCallHandler, setShowCallHandler] = useState(false);
  const [showSMSComposer, setShowSMSComposer] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showAPIConfig, setShowAPIConfig] = useState(false);

  // Enrichment state
  const [lastEnrichment, setLastEnrichment] = useState<ContactEnrichmentData | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  // Communication handlers
  const handleEmailSent = async (emailData: any) => {
    console.log('Email sent:', emailData);
    // Could add activity logging here
  };

  const handleCallComplete = async (callData: any) => {
    console.log('Call completed:', callData);
    // Could add activity logging here
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Research Status Overlay */}
      <ResearchStatusOverlay
        status={researchStatus.status}
        onClose={() => researchStatus.reset()}
        position="top"
        size="md"
      />

      <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-2 animate-fade-in">
        <div
          className="bg-white rounded-xl w-full max-w-[95vw] h-[95vh] overflow-hidden flex animate-scale-in shadow-2xl"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          {/* Sidebar */}
          <ContactSidebar
            contact={contact}
            onClose={onClose}
            onUpdate={handleUpdate}
            lastEnrichment={lastEnrichment}
            setLastEnrichment={setLastEnrichment}
            isEnriching={isEnriching}
            setIsEnriching={setIsEnriching}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full min-w-0">
            {/* Header */}
            <ContactHeader
              activeTab={activeTab}
              onTabChange={changeTab}
              contact={contact}
              isEditing={false}
              isSaving={false}
              onEdit={() => {}}
              onSave={() => {}}
              onCancel={() => {}}
              onToggleFavorite={() => {}}
              onClose={onClose}
            />

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
              <ErrorBoundary>
                <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
                  {activeTab === 'overview' && (
                    <ContactOverviewTab
                      contact={contact}
                      isEditing={false}
                      editingField={null}
                      onEditField={() => {}}
                      onStartEditingField={() => {}}
                      onSaveField={() => {}}
                      onUpdate={handleUpdate}
                      lastEnrichment={lastEnrichment}
                    />
                  )}

                  {activeTab === 'journey' && (
                    <div className="p-6">
                      <ContactJourneyTimeline contact={contact} />
                    </div>
                  )}

                  {activeTab === 'analytics' && (
                    <div className="p-6">
                      <ContactAnalytics contact={contact} />
                    </div>
                  )}

                  {activeTab === 'communication' && (
                    <div className="p-6">
                      <CommunicationHub contact={contact} />
                    </div>
                  )}

                  {activeTab === 'automation' && (
                    <div className="p-6">
                      <AutomationPanel contact={contact} />
                    </div>
                  )}

                  {activeTab === 'sales-intelligence' && (
                    <ContactSalesIntelligenceTab
                      contact={contact}
                      showAPIConfig={showAPIConfig}
                      setShowAPIConfig={setShowAPIConfig}
                      showAISettings={showAISettings}
                      setShowAISettings={setShowAISettings}
                    />
                  )}

                  {activeTab === 'playbooks' && (
                    <ContactPlaybooksTab
                      contact={contact}
                      showAPIConfig={showAPIConfig}
                      setShowAPIConfig={setShowAPIConfig}
                      showAISettings={showAISettings}
                      setShowAISettings={setShowAISettings}
                    />
                  )}

                  {activeTab === 'ai-insights' && (
                    <div className="p-6">
                      <AIInsightsPanel contact={contact} />
                    </div>
                  )}

                  {activeTab === 'email' && (
                    <div className="p-6">
                      <ContactEmailPanel contact={contact} />
                    </div>
                  )}

                  {activeTab === 'agents' && (
                    <div className="p-6">
                      <ContactOutboundAgentPanel contact={contact} />
                    </div>
                  )}

                  {activeTab === 'sdr' && (
                    <div className="p-6">
                      <ContactSDRPanel contact={contact} />
                    </div>
                  )}
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <QuickEmailComposer
        contact={contact}
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        onSend={handleEmailSent}
      />

      <QuickCallHandler
        contact={contact}
        isOpen={showCallHandler}
        onClose={() => setShowCallHandler(false)}
        onCallComplete={handleCallComplete}
      />

      <QuickSMSComposer
        contact={contact}
        isOpen={showSMSComposer}
        onClose={() => setShowSMSComposer(false)}
      />

      <AISettingsPanel
        isOpen={showAISettings}
        onClose={() => setShowAISettings(false)}
        onSettingsChange={(settings) => {
          console.log('AI Settings updated:', settings);
        }}
      />

      <APIConfigurationPanel
        isOpen={showAPIConfig}
        onClose={() => setShowAPIConfig(false)}
      />
    </>
  );
};