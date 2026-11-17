import { useCompanies } from '../../hooks/useCompanies';
import { CompanyDetailPanel } from '../contacts/CompanyDetailPanel';
import { pushUndo } from '../../lib/undo/undoStack';
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
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
import { useContactPresence } from '../../hooks/useContactPresence';
import { useContactStore } from '../../hooks/useContactStore';
import { useContactTabLayout } from '../../hooks/useContactTabLayout';
import { useContactNavigationStore } from '../../store/contactNavigationStore';
import { contactTabs } from '../../constants/contactConstants';
import { ContactCommandMenu } from '../contacts/ContactCommandMenu';
import { ContactShortcutsHelp } from '../contacts/ContactShortcutsHelp';
import { ContactMergePicker } from '../contacts/ContactMergePicker';
import { MergeContactsModal } from '../contacts/MergeContactsModal';
import { DeleteContactDialog, DestroyContactDialog } from '../contacts/ContactDeleteDialogs';
import { useOverlayEscape } from '../../hooks/useOverlayEscape';
import { buildContactCommands, type ContactCommandId } from '../../lib/commands/contactCommands';
import { resolveContactShortcut } from '../../lib/commands/contactShortcuts';
import { adjacentContactId, recordPosition } from '../../lib/contacts/recordNavigation';
import { buildContactLink, withContactParams } from '../../lib/contacts/deepLink';
import { downloadContact } from '../../lib/contacts/exportContact';
import { contactsToVcard, vcardFilename } from '../../lib/export/vcard';
import { eventsToIcs, icsFilename, serviceEventsToIcsEvents, type IcsEvent } from '../../lib/export/ics';
import { downloadTextFile } from '../../lib/export/download';
import { buildContactEvents } from '../../lib/calendar/contactEvents';
import { canUseContactCalendar, contactCalendarService } from '../../services/contactCalendarService';
import { recordRecentContact, type RecentContact } from '../../lib/records/recentContacts';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';

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
const ContactActivityTab = lazy(() => import('../contacts/ContactActivityTab').then(module => ({ default: module.ContactActivityTab })));
// >>> NEW DETAIL TABS (see contactConstants.ts)
const ContactEmailsTab = lazy(() => import('../contacts/ContactEmailsTab').then(module => ({ default: module.ContactEmailsTab })));
const ContactCalendarTab = lazy(() => import('../contacts/ContactCalendarTab').then(module => ({ default: module.ContactCalendarTab })));
const ContactSDRPanel = lazy(() => import('../contacts/ContactSDRPanel').then(module => ({ default: module.ContactSDRPanel })));

interface ContactDetailViewProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  /** Tab to open first (deep link `&tab=`); falls back to Overview when unknown. */
  initialTab?: string | undefined;
  /** Switch the detail view to another contact (previous / next, duplicate). */
  onOpenContact?: (contact: Contact) => void;
}

const KNOWN_TAB_IDS = new Set(contactTabs.map((t) => t.id));

export const ContactDetailView: React.FC<ContactDetailViewProps> = ({
  contact,
  isOpen,
  onClose,
  onUpdate,
  initialTab,
  onOpenContact
}) => {
  // Provide a default onUpdate function to handle cases where it's not provided
  const handleUpdate: (id: string, updates: Partial<Contact>) => Promise<Contact> = onUpdate || ((_id: string, _updates: Partial<Contact>) => Promise.resolve(contact));
  // State management
  const { activeTab, changeTab } = useContactTabs(initialTab && KNOWN_TAB_IDS.has(initialTab) ? initialTab : 'overview');
  const researchStatus = useResearchStatus();
  const otherViewers = useContactPresence(contact.id, isOpen);

  // Overview-tab inline field editing: edits go into a draft and are committed on blur.
  const [overviewEditingField, setOverviewEditingField] = useState<string | null>(null);
  const [overviewDraft, setOverviewDraft] = useState<Partial<Contact>>({});
  useEffect(() => {
    setOverviewEditingField(null);
    setOverviewDraft({});
  }, [contact.id]);
  const commitOverviewDraft = useCallback(() => {
    if (Object.keys(overviewDraft).length > 0) {
      void handleUpdate(contact.id, overviewDraft).catch((err: unknown) => console.error('Failed to save field', err));
    }
    setOverviewDraft({});
    setOverviewEditingField(null);
  }, [overviewDraft, handleUpdate, contact.id]);

  // Modal states
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showCallHandler, setShowCallHandler] = useState(false);
  const [showSMSComposer, setShowSMSComposer] = useState(false);

  // Sidebar quick actions (Email / SMS / Call) request the matching composer.
  useEffect(() => {
    const onCompose = (e: Event) => {
      const { kind, contactId } = (e as CustomEvent<{ kind: 'email' | 'sms' | 'call'; contactId?: string }>).detail || {};
      if (contactId && contactId !== contact.id) return;
      if (kind === 'email') setShowEmailComposer(true);
      else if (kind === 'sms') setShowSMSComposer(true);
      else if (kind === 'call') setShowCallHandler(true);
    };
    window.addEventListener('smartcrm:contact-compose', onCompose);
    return () => window.removeEventListener('smartcrm:contact-compose', onCompose);
  }, [contact.id]);
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

  // ---- Record actions: command menu, navigation, delete / restore, duplicate, export, merge, copy link ----
  const { visibleTabs } = useContactTabLayout();
  const navIds = useContactNavigationStore((s) => s.ids);
  const allContacts = useContactStore((s) => s.contacts);
  const isDeleted = !!contact.deletedAt;
  const userId = useCurrentUserId();
  const [recents, setRecents] = useState<RecentContact[]>([]);
  // Record every opened record (and each switch to another one) as "recently viewed".
  useEffect(() => {
    if (!isOpen) return;
    setRecents(recordRecentContact(userId, { id: contact.id, name: contact.name }));
  }, [isOpen, contact.id, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showCommands, setShowCommands] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDestroy, setShowDestroy] = useState(false);
  const [showMergePicker, setShowMergePicker] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  const { findByName: findCompanyByName } = useCompanies();
  const [mergePair, setMergePair] = useState<Contact[] | null>(null);
  const [status, setStatus] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout>>();
  const flash = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setStatus({ text, tone });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 2500);
  }, []);
  useEffect(() => () => { if (statusTimer.current) clearTimeout(statusTimer.current); }, []);

  // The merge preview modal has no Esc handling of its own; keep Esc from closing the record underneath
  useOverlayEscape(!!mergePair, () => setMergePair(null));

  const prevId = adjacentContactId(navIds, contact.id, 'prev');
  const nextId = adjacentContactId(navIds, contact.id, 'next');
  const position = recordPosition(navIds, contact.id);
  const goToRecord = useCallback((id: string | null) => {
    if (!id) return;
    const target = useContactStore.getState().contacts.find((c) => c.id === id);
    if (target) onOpenContact?.(target);
  }, [onOpenContact]);

  // Start from a clean enrichment state when moving to another record
  useEffect(() => {
    setLastEnrichment(null);
    setIsEnriching(false);
  }, [contact.id]);

  // Keep the URL in sync (?contact=<id>&tab=<tab>) while the record is open; clear it when closed.
  useEffect(() => {
    if (!isOpen) return;
    try {
      const { pathname, search, hash } = window.location;
      window.history.replaceState(window.history.state, '', `${pathname}${withContactParams(search, contact.id, activeTab)}${hash}`);
    } catch { /* history unavailable (sandboxed iframe, tests) */ }
  }, [isOpen, contact.id, activeTab]);
  useEffect(() => () => {
    try {
      const { pathname, search, hash } = window.location;
      window.history.replaceState(window.history.state, '', `${pathname}${withContactParams(search, null)}${hash}`);
    } catch { /* ignore */ }
  }, []);

  const copyLink = useCallback(async () => {
    const link = buildContactLink(window.location, contact.id, activeTab);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard API blocked (insecure origin / permissions): fall back to a temporary textarea.
      const area = document.createElement('textarea');
      area.value = link;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand?.('copy');
      document.body.removeChild(area);
      if (!ok) { flash('Could not copy the link', 'error'); return; }
    }
    flash('Link copied');
  }, [contact.id, activeTab, flash]);

  const toggleFavorite = useCallback(() => {
    if (isDeleted) return;
    void handleUpdate(contact.id, { isFavorite: !contact.isFavorite }).catch(() => flash('Could not update favorite', 'error'));
  }, [contact.id, contact.isFavorite, isDeleted]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Editing lives in the sidebar: ask it to start editing (event), else press its Edit quick action. */
  const requestEdit = useCallback(() => {
    if (isDeleted) return;
    changeTab('overview');
    const event = new CustomEvent('smartcrm:contact-edit', { cancelable: true, detail: { contactId: contact.id } });
    if (window.dispatchEvent(event)) {
      const editButton = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Edit');
      editButton?.click();
    }
  }, [contact.id, isDeleted, changeTab]);

  /** Meetings from the calendar service when available, else the contact's own dates; downloaded as .ics. */
  const exportCalendar = useCallback(async () => {
    let events: IcsEvent[] = [];
    try {
      if (canUseContactCalendar(contact.id)) {
        events = serviceEventsToIcsEvents((await contactCalendarService.list(contact.id, { suggestions: false })).events);
      }
    } catch { /* service unavailable: fall back to the contact's own dates */ }
    if (events.length === 0) {
      events = buildContactEvents([contact]).map((e) => ({ id: e.id, title: e.title, start: e.date, durationMinutes: 30 }));
    }
    if (events.length === 0) { flash('No calendar events to export', 'error'); return; }
    downloadTextFile(eventsToIcs(events, { calendarName: `${contact.name} - SmartCRM` }), 'text/calendar;charset=utf-8', icsFilename(contact));
    flash('Calendar exported');
  }, [contact, flash]);

  const runCommand = useCallback((id: ContactCommandId) => {
    setShowCommands(false);
    if (id.startsWith('tab:')) { changeTab(id.slice(4)); return; }
    if (id.startsWith('recent:')) { goToRecord(id.slice(7)); return; }
    switch (id) {
      case 'palette': setShowCommands(true); break;
      case 'edit': requestEdit(); break;
      case 'favorite': toggleFavorite(); break;
      case 'prev': goToRecord(prevId); break;
      case 'next': goToRecord(nextId); break;
      case 'copy-link': void copyLink(); break;
      case 'export-csv': downloadContact(contact, 'csv'); flash('Exported as CSV'); break;
      case 'export-json': downloadContact(contact, 'json'); flash('Exported as JSON'); break;
      case 'export-vcard':
        downloadTextFile(contactsToVcard([contact]), 'text/vcard;charset=utf-8', vcardFilename([contact]));
        flash('Exported as vCard');
        break;
      case 'export-ics': void exportCalendar(); break;
      case 'shortcuts': setShowShortcuts(true); break;
      case 'customize-tabs': document.querySelector<HTMLElement>('[data-testid="customize-tabs-button"]')?.click(); break;
      case 'merge': setShowMergePicker(true); break;
      case 'company': setShowCompany(true); break;
      case 'delete': setShowDelete(true); break;
      case 'destroy': setShowDestroy(true); break;
      case 'restore': {
        const restoredId = contact.id;
        const restoredName = contact.name;
        void useContactStore.getState().restoreContact(restoredId).then(
          () => {
            flash('Contact restored');
            pushUndo(`Restored ${restoredName}`, () => useContactStore.getState().deleteContact(restoredId));
          },
          () => flash('Could not restore the contact', 'error'),
        );
        break;
      }
      case 'duplicate':
        void useContactStore.getState().duplicateContact(contact).then(
          (copy) => { flash('Duplicated'); onOpenContact?.(copy); },
          () => flash('Could not duplicate the contact', 'error'),
        );
        break;
    }
  }, [changeTab, requestEdit, toggleFavorite, goToRecord, prevId, nextId, copyLink, exportCalendar, contact, flash, onOpenContact]);

  // Recently viewed records that still exist (not the open one); names come from the live store.
  const recentForPalette = useMemo(() => recents
    .filter((r) => r.id !== contact.id)
    .map((r) => ({ r, c: allContacts.find((x) => x.id === r.id) }))
    .filter((x): x is { r: RecentContact; c: Contact } => !!x.c)
    .map(({ c }) => ({ id: c.id, name: c.name, company: c.company })),
  [recents, allContacts, contact.id]);

  const commands = useMemo(() => buildContactCommands({
    isDeleted,
    isFavorite: !!contact.isFavorite,
    canPrev: !!prevId,
    canNext: !!nextId,
    tabs: visibleTabs,
    activeTab,
    recent: recentForPalette,
    company: contact.company,
  }), [isDeleted, contact.company, contact.isFavorite, prevId, nextId, visibleTabs, activeTab, recentForPalette]);

  const anyOverlayOpen = showCommands || showShortcuts || showDelete || showDestroy || showMergePicker || !!mergePair
    || showEmailComposer || showCallHandler || showSMSComposer || showAISettings || showAPIConfig;

  // Keyboard shortcuts (never while typing; Ctrl/Cmd+K toggles the palette from anywhere)
  const shortcutState = useRef({ anyOverlayOpen, showCommands, runCommand, visibleTabs, changeTab });
  shortcutState.current = { anyOverlayOpen, showCommands, runCommand, visibleTabs, changeTab };
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const action = resolveContactShortcut(e, e.target as HTMLElement | null);
      if (!action) return;
      const st = shortcutState.current;
      if (action.type === 'palette') {
        e.preventDefault();
        if (st.showCommands) setShowCommands(false);
        else if (!st.anyOverlayOpen) setShowCommands(true);
        return;
      }
      if (st.anyOverlayOpen) return;
      e.preventDefault();
      switch (action.type) {
        case 'help': setShowShortcuts(true); break;
        case 'next': st.runCommand('next'); break;
        case 'prev': st.runCommand('prev'); break;
        case 'edit': st.runCommand('edit'); break;
        case 'favorite': st.runCommand('favorite'); break;
        case 'tab': {
          const tab = st.visibleTabs[action.index];
          if (tab) st.changeTab(tab.id);
          break;
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

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

      <div className="fixed inset-0 bg-black/95 dark:bg-gray-900 backdrop-blur-md z-[60] flex items-center justify-center p-2 animate-fade-in">
        <div
          className="bg-white dark:bg-gray-800 rounded-none w-full max-w-[95vw] h-[95vh] overflow-hidden flex animate-scale-in shadow-2xl"
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
            onOpenCompany={() => setShowCompany(true)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full min-w-0">
            {otherViewers.length > 0 && (
              <div role="status" className="px-4 py-1 text-xs bg-amber-50 text-amber-800 border-b border-amber-200">
                Also open in {otherViewers.length} other session{otherViewers.length === 1 ? '' : 's'}
                {otherViewers.some((v) => v.email) ? `: ${[...new Set(otherViewers.map((v) => v.email).filter(Boolean))].join(', ')}` : ''}
              </div>
            )}
            {isDeleted && (
              <div role="status" className="px-4 py-1 text-xs bg-amber-50 text-amber-800 border-b border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">
                This contact is in Trash. Restore it from the menu (Ctrl K) or delete it permanently.
              </div>
            )}
            {/* Header */}
            <ContactHeader
              activeTab={activeTab}
              onTabChange={changeTab}
              contact={contact}
              isEditing={false}
              isSaving={false}
              onEdit={requestEdit}
              onSave={() => {}}
              onCancel={() => {}}
              onToggleFavorite={toggleFavorite}
              onClose={onClose}
              onPrev={() => goToRecord(prevId)}
              onNext={() => goToRecord(nextId)}
              canPrev={!!prevId}
              canNext={!!nextId}
              positionLabel={position ? `${position.index} / ${position.total}` : undefined}
              onRunCommand={runCommand}
              isDeleted={isDeleted}
            />

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 min-h-0">
              <ErrorBoundary>
                <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
                  {activeTab === 'overview' && (
                    <ContactOverviewTab
                      contact={{ ...contact, ...overviewDraft }}
                      isEditing={false}
                      editingField={overviewEditingField}
                      onEditField={(field: string, value: any) => setOverviewDraft((d) => ({ ...d, [field]: value }))}
                      onStartEditingField={(field: string) => setOverviewEditingField(field)}
                      onSaveField={commitOverviewDraft}
                      onUpdate={handleUpdate}
                      lastEnrichment={lastEnrichment}
                      onReviewDuplicate={(other: Contact) => setMergePair([contact, other])}
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

                  {activeTab === 'sdr-agents' && (
                    <div className="p-6">
                      <ContactSDRPanel contact={contact} />
                    </div>
                  )}

                  {activeTab === 'activity' && (
                    <div className="p-6">
                      <ContactActivityTab contact={contact} />
                    </div>
                  )}

                  {/* >>> NEW DETAIL TABS (see contactConstants.ts) */}
                  {activeTab === 'emails' && (
                    <div className="p-6">
                      <ContactEmailsTab contact={contact} />
                    </div>
                  )}

                  {activeTab === 'calendar' && (
                    <div className="p-6">
                      <ContactCalendarTab contact={contact} />
                    </div>
                  )}
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      {/* Record actions */}
      <ContactCommandMenu open={showCommands} commands={commands} onRun={runCommand} onClose={() => setShowCommands(false)} />
      <ContactShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      {showDelete && (
        <DeleteContactDialog
          name={contact.name}
          onClose={() => setShowDelete(false)}
          onConfirm={async () => {
            try {
              const deletedId = contact.id;
              await useContactStore.getState().deleteContact(deletedId);
              pushUndo(`Moved ${contact.name} to Trash`, () => useContactStore.getState().restoreContact(deletedId));
              setShowDelete(false);
              onClose();
            } catch {
              setShowDelete(false);
              flash('Could not delete the contact', 'error');
            }
          }}
        />
      )}
      {showDestroy && (
        <DestroyContactDialog
          name={contact.name}
          onClose={() => setShowDestroy(false)}
          onConfirm={async () => {
            try {
              await useContactStore.getState().destroyContact(contact.id);
              setShowDestroy(false);
              onClose();
            } catch {
              setShowDestroy(false);
              flash('Could not delete the contact', 'error');
            }
          }}
        />
      )}
      {showCompany && findCompanyByName(contact.company) && (
        <CompanyDetailPanel
          company={findCompanyByName(contact.company)!}
          onClose={() => setShowCompany(false)}
          onOpenContact={(c) => { setShowCompany(false); if (c.id !== contact.id) goToRecord(c.id); }}
        />
      )}
      {showMergePicker && (
        <ContactMergePicker
          contact={contact}
          contacts={allContacts}
          onClose={() => setShowMergePicker(false)}
          onPick={(other) => { setShowMergePicker(false); setMergePair([contact, other]); }}
        />
      )}
      {mergePair && (
        <MergeContactsModal
          contacts={mergePair}
          primaryId={contact.id}
          onClose={() => setMergePair(null)}
          onMerged={() => {
            setMergePair(null);
            // The primary stays unless the user chose the other record as the one to keep.
            if (!useContactStore.getState().contacts.some((c) => c.id === contact.id)) onClose();
            else flash('Contacts merged');
          }}
        />
      )}
      {status && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] h-10 px-4 inline-flex items-center rounded-lg text-sm font-medium shadow-lg ${
            status.tone === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
          }`}
        >
          {status.text}
        </div>
      )}

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