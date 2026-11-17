import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAI } from '../../contexts/AIContext';
import { AIProvider } from '../../contexts/AIContext';
import { ModernButton } from '../ui/ModernButton';
import { SmartTooltip } from '../ui/SmartTooltip';
import { ToastProvider } from '../ui/Toast';
import { aiBatchService } from '../../services/aiBatchService';
import { AIErrorToaster } from '../ui/AIErrorToaster';
import { UndoToast } from '../ui/UndoToast';
import { ContactDetailView } from './ContactDetailView';
import { ImportContactsModal } from './ImportContactsModal';
import { NewContactModal } from './NewContactModal';
import { SettingsModal } from './SettingsModal';
import { ProductIntelligenceModal } from '../product-intelligence/ProductIntelligenceModal';
import { SDRModal } from './SDRModal';
import { PlaybookModal } from '../playbooks/PlaybookModal';
import { useContactStore } from '../../hooks/useContactStore';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { useView } from '../../contexts/ViewContext';
import { Contact } from '../../types';
import { SmartContactCard } from '../contacts/SmartContactCard';
import { ContactErrorBoundary } from '../error/ContactErrorBoundary';
import { ContactDetailSkeleton } from '../loading/ContactDetailSkeleton';
import { ViewSwitcher } from '../contacts/ViewSwitcher';
import { AdvancedFilterPanel } from '../contacts/AdvancedFilterPanel';
import { SavedViewsMenu } from '../contacts/SavedViewsMenu';
import { MergeContactsModal } from '../contacts/MergeContactsModal';
import { TOOLBAR_BTN, TOOLBAR_ICON_BTN, TOOLBAR_SELECT } from '../contacts/toolbarStyles';
import { DuplicateReviewModal, duplicateGroupKey, readDismissedDuplicateGroups } from '../contacts/DuplicateReviewModal';
import { findDuplicateGroups, type DuplicateGroup } from '../../lib/merge/findDuplicates';
import { MAX_MERGE_RECORDS } from '../../lib/merge/mergeContacts';
import { useContactFilterStore } from '../../store/contactFilterStore';
import { useContactSelectionStore } from '../../store/contactSelectionStore';
import { useContactNavigationStore } from '../../store/contactNavigationStore';
import { ContactTrashModal } from '../contacts/ContactTrashModal';
import { parseContactLink } from '../../lib/contacts/deepLink';
import { bulkAddTagsWithUndo, bulkTrashWithUndo, bulkUpdateWithUndo, useBulkActions } from '../../hooks/useBulkActions';
import { contactsToVcard, vcardFilename } from '../../lib/export/vcard';
import { downloadTextFile } from '../../lib/export/download';
import { ContactPeekDrawer } from '../contacts/ContactPeekDrawer';
import { useTableViewSettings } from '../../store/tableViewSettingsStore';
import { bannerMessage } from '../../lib/records/selection';
import { CONTACT_SORT_FIELDS, CONTACT_SORT_LABELS, sortContacts, toSortList } from '../../lib/views/sortContacts';
import type { ViewSortConfig } from '../../types/view';
import { useContactViewStore } from '../../store/contactViewStore';
import type { ContactViewSnapshot } from '../../lib/views/contactViewSnapshot';
import { useAdvancedContactFilter } from '../../hooks/useAdvancedContactFilter';
import { ListView } from '../contacts/views/ListView';
import { TableView } from '../contacts/views/TableView';
import { KanbanView } from '../contacts/views/KanbanView';
import { CalendarView } from '../contacts/views/CalendarView';
import { DashboardView } from '../contacts/views/DashboardView';
import { TimelineView } from '../contacts/views/TimelineView';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import Fuse from 'fuse.js';
import { liveDisplay } from '../../lib/streaming/previewText';
import type { BulkProgress } from '../../services/contact-ai.service';
import {
  X,
  Search,
  Filter,
  Plus,
  Users,
  ChevronDown,
  Brain,
  Download,
  Upload,
  Zap,
  CheckCheck,
  Settings,
  Target,
  Sparkles,
  CheckCircle,
  Loader2,
  Info,
  Mail,
  Bot,
  Trash2,
  Package,
  ArchiveRestore
} from 'lucide-react';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
}


const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Hot Client', value: 'hot' },
  { label: 'Medium Interest', value: 'medium' },
  { label: 'Low Interest', value: 'low' },
  { label: 'Non Interest', value: 'cold' }
];

const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Lead', value: 'lead' },
  { label: 'Prospect', value: 'prospect' },
  { label: 'Customer', value: 'customer' },
  { label: 'Churned', value: 'churned' }
];

export const ContactsModal: React.FC<ContactsModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { contacts, trashedContacts, updateContact, clearContacts, loadTrash } = useContactStore();
  const { currentView } = useView();
  const { scoreBulkContacts } = useAI();
  
  // UI State
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  // Tab requested by a deep link; only applies to the contact the link named
  const [deepLinkTab, setDeepLinkTab] = useState<{ contactId: string; tab: string } | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const selectedSet = useContactSelectionStore((s) => s.selected);
  const selectedContacts = useMemo(() => Array.from(selectedSet), [selectedSet]);
  const setSelectedContacts = useContactSelectionStore((s) => s.setMany);
  const toggleContactSelection = useContactSelectionStore((s) => s.toggle);
  const clearContactSelection = useContactSelectionStore((s) => s.clear);
  const [bulkMode, setBulkMode] = useState<null | 'status' | 'interest' | 'tags'>(null);
  const [mergeCandidates, setMergeCandidates] = useState<Contact[] | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [dismissedDuplicates, setDismissedDuplicates] = useState<Set<string>>(() => readDismissedDuplicateGroups());
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Contacts being scored right now, with the score fields streaming in (shown in the progress banner)
  const [liveScores, setLiveScores] = useState<Record<string, { name: string; text: string }>>({});
  const [bulkActionDropdown, setBulkActionDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'score' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  // Secondary sorts ("Then by...") applied after the primary sort above
  const [thenBy, setThenBy] = useState<ViewSortConfig[]>([]);
  const [showThenBy, setShowThenBy] = useState(false);
  const thenByRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showThenBy) return;
    const close = (e: MouseEvent) => {
      if (thenByRef.current && !thenByRef.current.contains(e.target as Node)) setShowThenBy(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showThenBy]);
  const [analysisProgress, setAnalysisProgress] = useState<{current: number, total: number} | null>(null);
  const [aiResults, setAiResults] = useState<{success: number, failed: number} | null>(null);
  const [analyzingContactIds, setAnalyzingContactIds] = useState<string[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  
  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProductIntelligenceOpen, setIsProductIntelligenceOpen] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [clearDataConfirmation, setClearDataConfirmation] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);
  const [sdrModalContact, setSdrModalContact] = useState<Contact | null>(null);
  const [playbookModalContact, setPlaybookModalContact] = useState<Contact | null>(null);

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(contacts, {
      keys: ['name', 'company', 'title', 'email', 'industry'],
      threshold: 0.3,
    });
  }, [contacts]);

  // Load saved contacts / row order once when the screen opens
  const hydrateContacts = useContactStore((s) => s.hydrateContacts);
  useRealtimeSync(isOpen);

  // Keep the open contact in sync with live changes from other sessions
  useEffect(() => {
    if (!selectedContact) return;
    const fresh = contacts.find((c) => c.id === selectedContact.id);
    if (fresh && fresh !== selectedContact) setSelectedContact(fresh);
  }, [contacts, selectedContact]);
  useEffect(() => {
    if (isOpen) void hydrateContacts().then(() => loadTrash());
  }, [isOpen, hydrateContacts, loadTrash]);

  // Deep link: ?contact=<id>[&tab=<tab>] opens that contact once it is available (also from the Trash).
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (!isOpen || deepLinkHandled.current) return;
    const { contactId, tab } = parseContactLink(window.location.search);
    if (!contactId) {
      deepLinkHandled.current = true;
      return;
    }
    const found = contacts.find((c) => c.id === contactId) ?? trashedContacts.find((c) => c.id === contactId);
    if (found) {
      deepLinkHandled.current = true;
      setDeepLinkTab(tab ? { contactId, tab } : null);
      setSelectedContact(found);
    }
  }, [isOpen, contacts, trashedContacts]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.keyCode === 27) {
        if (selectedContact) {
          setSelectedContact(null);
        } else if (isImportModalOpen) {
          setIsImportModalOpen(false);
        } else if (isNewContactModalOpen) {
          setIsNewContactModalOpen(false);
        } else if (isSettingsModalOpen) {
          setIsSettingsModalOpen(false);
        } else if (useContactSelectionStore.getState().selected.size > 0) {
          // First Esc clears the selection (like Twenty); a second one closes the modal.
          useContactSelectionStore.getState().clear();
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc, false);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc, false);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, selectedContact, isImportModalOpen, isNewContactModalOpen, isSettingsModalOpen]);

  // Filter and search contacts
  const searchedAndSortedContacts = useMemo(() => {
    let result = contacts;

    // Apply search
    if (searchTerm.trim()) {
      const searchResults = fuse.search(searchTerm);
      result = searchResults.map(result => result.item);
    }

    // Apply interest level filter
    if (activeFilter !== 'all') {
      result = result.filter(contact => contact.interestLevel === activeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(contact => contact.status === statusFilter);
    }

    // Apply sorting (primary + "Then by..." sorts; stable, empty values last)
    result = sortContacts(result, toSortList({ by: sortBy, order: sortOrder }, thenBy));

    return result;
  }, [contacts, searchTerm, activeFilter, statusFilter, sortBy, sortOrder, thenBy, fuse]);

  // Advanced nested AND/OR filters (applied on top of the quick filters above)
  const {
    filtered: advancedFilteredContacts,
    fields: advancedFilterFields,
    activeCount: advancedFilterCount
  } = useAdvancedContactFilter(searchedAndSortedContacts);
  const filteredContacts = advancedFilteredContacts;
  const bulk = useBulkActions(filteredContacts);

  // Previous / next record in the detail view follows the list as currently filtered and sorted
  const setNavigationIds = useContactNavigationStore((s) => s.setIds);
  useEffect(() => {
    setNavigationIds(filteredContacts.map((c) => c.id));
  }, [filteredContacts, setNavigationIds]);
  useEffect(() => () => setNavigationIds([]), [setNavigationIds]);
  const duplicateGroups = useMemo(
    () => findDuplicateGroups(contacts).filter((g) => !dismissedDuplicates.has(duplicateGroupKey(g))),
    [contacts, dismissedDuplicates]
  );
  const dismissDuplicateGroup = (group: DuplicateGroup) => {
    const next = new Set(dismissedDuplicates).add(duplicateGroupKey(group));
    setDismissedDuplicates(next);
    try { localStorage.setItem('smartcrm.dismissedDuplicateGroups', JSON.stringify([...next])); } catch { /* storage unavailable */ }
  };

  // ---- Saved views: capture / restore the whole screen configuration ----
  const { setCurrentView } = useView();
  const recordFilters = useContactFilterStore((s) => s.recordFilters);
  const recordFilterGroups = useContactFilterStore((s) => s.recordFilterGroups);
  const replaceAdvancedFilters = useContactFilterStore((s) => s.replace);
  const groupBy = useContactViewStore((s) => s.groupBy);
  const setGroupBy = useContactViewStore((s) => s.setGroupBy);
  const tableDensity = useTableViewSettings((s) => s.density);
  const tableFreeze = useTableViewSettings((s) => s.freezeFirstColumn);
  const tableTotals = useTableViewSettings((s) => s.showTotals);
  const tableAggregates = useTableViewSettings((s) => s.aggregates);
  const tableSorts = useTableViewSettings((s) => s.sorts);
  const tableConfig = useMemo(
    () => useTableViewSettings.getState().toConfig(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableDensity, tableFreeze, tableTotals, tableAggregates, tableSorts]
  );
  const viewSnapshot: ContactViewSnapshot = useMemo(
    () => ({
      viewType: currentView,
      quickFilters: { interest: activeFilter, status: statusFilter },
      sort: { by: sortBy, order: sortOrder },
      ...(thenBy.length ? { thenBy } : {}),
      ...(Object.keys(tableConfig).length ? { table: tableConfig } : {}),
      recordFilters,
      recordFilterGroups,
      groupBy,
    }),
    [currentView, activeFilter, statusFilter, sortBy, sortOrder, thenBy, tableConfig, recordFilters, recordFilterGroups, groupBy]
  );
  const applyViewSnapshot = (snap: ContactViewSnapshot) => {
    void setCurrentView(snap.viewType);
    setActiveFilter(snap.quickFilters.interest);
    setStatusFilter(snap.quickFilters.status);
    setSortBy(snap.sort.by as typeof sortBy);
    setSortOrder(snap.sort.order);
    setThenBy(snap.thenBy ?? []);
    useTableViewSettings.getState().applyConfig(snap.table);
    replaceAdvancedFilters({ recordFilters: snap.recordFilters, recordFilterGroups: snap.recordFilterGroups });
    setGroupBy(snap.groupBy);
    if (snap.recordFilters.length > 0) setShowAdvancedFilters(true);
  };

  // Ctrl/Cmd+A selects every visible contact (ignored while typing in a field or inside sub-modals)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.key === 'a' || event.key === 'A') || !(event.ctrlKey || event.metaKey)) return;
      const el = event.target as HTMLElement | null;
      const tag = el?.tagName;
      const nonText = ['checkbox', 'radio', 'button', 'submit'];
      const isTextInput = tag === 'INPUT' && !nonText.includes((el as HTMLInputElement).type);
      if (isTextInput || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (selectedContact || isImportModalOpen || isNewContactModalOpen || isSettingsModalOpen) return;
      event.preventDefault();
      useContactSelectionStore.getState().selectAll(filteredContacts.map((c) => c.id));
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, filteredContacts, selectedContact, isImportModalOpen, isNewContactModalOpen, isSettingsModalOpen]);

  const runBulk = async (fn: () => Promise<{ ok: number; failed: number }>) => {
    const result = await fn();
    if (result.failed > 0) alert(`${result.failed} of ${result.ok + result.failed} contacts could not be updated.`);
    clearContactSelection();
    setBulkMode(null);
    setBulkTagInput('');
    setBulkActionDropdown(false);
  };

  const renderView = () => {
    const viewProps = {
      contacts: filteredContacts,
      onContactClick: handleContactClick
    };

    switch (currentView) {
      case 'list':
        return <ListView {...viewProps} onOpenSDRModal={handleOpenSDRModal} />;
      case 'table':
        return <TableView {...viewProps} />;
      case 'kanban':
        return <KanbanView {...viewProps} />;
      case 'calendar':
        return <CalendarView {...viewProps} />;
      case 'dashboard':
        return <DashboardView {...viewProps} />;
      case 'timeline':
        return <TimelineView {...viewProps} />;
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContacts.map((contact) => (
              <SmartTooltip key={contact.id} featureId="contact_card" position="top">
                <div>
                  <SmartContactCard
                    contact={contact}
                    isSelected={selectedContacts.includes(contact.id)}
                    onSelect={(opts) => handleContactSelect(contact.id, opts?.shift === true)}
                    onClick={() => handleContactClick(contact)}
                    onEdit={handleEditContact}
                    onAnalyze={handleAnalyzeContact}
                    isAnalyzing={analyzingContactIds.includes(contact.id)}
                    variant="standard"
                    showMetrics={true}
                    enableQuickActions={true}
                    onOpenSDRModal={handleOpenSDRModal}
                    onOpenPlaybookModal={handleOpenPlaybookModal}
                  />
                </div>
              </SmartTooltip>
            ))}
          </div>
        );
    }
  };

  // AI Analysis Functions
  const handleAnalyzeContact = async (contact: Contact) => {
    setAnalyzingContactIds(prev => [...prev, contact.id]);
    try {
      // This will be handled by the contact card's internal AI logic now
      // We'll keep this for compatibility but the real work happens in AIEnhancedContactCard
      await updateContact(contact.id, { 
        aiScore: contact.aiScore || Math.floor(Math.random() * 40) + 60 // Placeholder - real scoring happens in card
      });
      return true;
    } catch (error) {
      console.error('Analysis failed:', error);
      return false;
    } finally {
      setAnalyzingContactIds(prev => prev.filter(id => id !== contact.id));
    }
  };

  /** Live per-contact progress for bulk scoring: updates the banner's counter and the streaming score preview. */
  const bulkScoreProgress = (total: number): BulkProgress => {
    let done = 0;
    const nameOf = (c: Contact) => c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Contact';
    const put = (c: Contact, text: string) => setLiveScores(prev => ({ ...prev, [c.id]: { name: nameOf(c), text } }));
    return {
      onItemStart: (c) => put(c, ''),
      onItemPartial: (c, partial) => put(c, liveDisplay(partial, '')),
      onItemText: (c, full) => put(c, liveDisplay(undefined, full)),
      onItemDone: (c) => {
        done += 1;
        setAnalysisProgress({ current: done, total });
        setLiveScores(prev => { const { [c.id]: _gone, ...rest } = prev; return rest; });
      },
    };
  };

  const handleAnalyzeAll = async () => {
    const contactsToAnalyze = filteredContacts.filter(c => !c.aiScore || c.aiScore === 0);
    
    if (contactsToAnalyze.length === 0) {
      alert('All visible contacts already have AI scores. Use "Re-analyze Selected" to update existing scores.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: contactsToAnalyze.length });
    setAiResults(null);

    try {
      // Use the new bulk analysis service
      await scoreBulkContacts(contactsToAnalyze, bulkScoreProgress(contactsToAnalyze.length));
      setAiResults({ success: contactsToAnalyze.length, failed: 0 });
    } catch (error) {
      console.error('Bulk analysis failed:', error);
      setAiResults({ success: 0, failed: contactsToAnalyze.length });
    }

    setAnalysisProgress(null);
    setLiveScores({});
    setIsAnalyzing(false);
  };

  const handleAnalyzeSelected = async () => {
    if (selectedContacts.length === 0) {
      alert('Please select contacts to analyze first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: selectedContacts.length });
    setAiResults(null);

    try {
      const selectedContactObjects = contacts.filter(c => selectedContacts.includes(c.id));
      await scoreBulkContacts(selectedContactObjects, bulkScoreProgress(selectedContactObjects.length));
      setAiResults({ success: selectedContactObjects.length, failed: 0 });
    } catch (error) {
      console.error('Selected analysis failed:', error);
      setAiResults({ success: 0, failed: selectedContacts.length });
    }

    setAnalysisProgress(null);
    setLiveScores({});
    setSelectedContacts([]);
    setIsAnalyzing(false);
  };

  // Contact Selection Functions
  const handleContactSelect = (contactId: string, shift = false) => {
    toggleContactSelection(contactId, filteredContacts.map(c => c.id), { shift });
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const handleFilterClick = (filterValue: string) => {
    setActiveFilter(filterValue);
    setIsFilterDropdownOpen(false);
  };

  const handleStatusFilterClick = (statusValue: string) => {
    setStatusFilter(statusValue);
    setIsStatusDropdownOpen(false);
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleContactDetailClose = () => {
    setSelectedContact(null);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    // The ContactDetailView will handle the editing
  };


  // Modal Handlers
  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleNewContactClick = () => {
    setIsNewContactModalOpen(true);
  };

  const handleImportModalClose = () => {
    setIsImportModalOpen(false);
  };

  const handleNewContactModalClose = () => {
    setIsNewContactModalOpen(false);
  };

  const handleSettingsClick = () => {
    setIsSettingsModalOpen(true);
  };

  const handleSettingsModalClose = () => {
    setIsSettingsModalOpen(false);
  };

  const handleProductIntelligenceClick = () => {
    setIsProductIntelligenceOpen(true);
  };

  const handleProductIntelligenceClose = () => {
    setIsProductIntelligenceOpen(false);
  };

  const handleOpenSDRModal = (contact: Contact) => {
    setSdrModalContact(contact);
  };

  const handleCloseSDRModal = () => {
    setSdrModalContact(null);
  };

  const handleOpenPlaybookModal = (contact: Contact) => {
    setPlaybookModalContact(contact);
  };

  const handleClosePlaybookModal = () => {
    setPlaybookModalContact(null);
  };

  const handleClearData = async () => {
    if (clearDataConfirmation !== 'DELETE') return;

    setIsClearingData(true);
    try {
      // Clear contacts from store
      await clearContacts();

      // Clear any cached data if needed
      localStorage.removeItem('contacts_cache');
      localStorage.removeItem('contact_filters');

      // Show success message (you might want to add a toast notification here)
      alert('All contacts have been cleared successfully.');

      setIsClearDataModalOpen(false);
      setClearDataConfirmation('');
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear contacts. Please try again.');
    } finally {
      setIsClearingData(false);
    }
  };

  const handleAnalysisComplete = (results: any, content: any) => {
    console.log('Analysis complete:', results, content);
    // Here you could integrate with the CRM or show success message
    setIsProductIntelligenceOpen(false);
  };

  // Export functionality
  const handleExportContacts = () => {
    // Determine which contacts to export
    const contactsToExport = selectedContacts.length > 0
      ? filteredContacts.filter(contact => selectedContacts.includes(contact.id))
      : filteredContacts;
    
    if (contactsToExport.length === 0) {
      alert('No contacts to export');
      return;
    }

    // Prepare data for CSV export
    const headers = [
      'firstName',
      'lastName', 
      'name',
      'email',
      'phone',
      'title',
      'company',
      'industry',
      'sources',
      'interestLevel',
      'status',
      'notes',
      'tags',
      'aiScore'
    ];

    // Convert contacts to CSV rows
    const rows = contactsToExport.map(contact => {
      return [
        contact.firstName,
        contact.lastName,
        contact.name,
        contact.email,
        contact.phone || '',
        contact.title,
        contact.company,
        contact.industry || '',
        (contact.sources || []).join(';'),
        contact.interestLevel,
        contact.status,
        (contact.notes || '').replace(/\n/g, ' '), // Remove newlines in notes
        (contact.tags || []).join(';'),
        contact.aiScore || ''
      ];
    });
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        // Handle cells with commas by wrapping in quotes
        typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n')) 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const activeFilterLabel = filterOptions.find(f => f.value === activeFilter)?.label || 'All';
  const activeStatusLabel = statusOptions.find(f => f.value === statusFilter)?.label || 'All Status';
  const contactsWithoutScores = filteredContacts.filter(c => !c.aiScore || c.aiScore === 0).length;

  return (
    <>
      <div 
        className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-none w-full h-screen overflow-hidden flex flex-col text-gray-900 dark:text-gray-100">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center space-x-4 shrink-0">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  Contacts
                  <Sparkles className="w-5 h-5 ml-2 text-yellow-500" />
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  {filteredContacts.length} contacts found
                  {selectedContacts.length > 0 && ` • ${selectedContacts.length} selected`}
                  {contactsWithoutScores > 0 && ` • ${contactsWithoutScores} need AI scoring`}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* AI Analysis Buttons */}
              <div className="flex items-center gap-2">
                {/* Analyze All Button */}
                <SmartTooltip featureId="ai_score_all_button">
                  <ModernButton
                    variant="primary"
                    size="toolbar"
                    onClick={handleAnalyzeAll}
                    disabled={isAnalyzing || contactsWithoutScores === 0}
                    className={`${TOOLBAR_BTN} bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 dark:from-purple-500 dark:to-blue-500 dark:hover:from-purple-600 dark:hover:to-blue-600`}
                  >
                    <Brain className="w-4 h-4" />
                    <span>
                      {isAnalyzing ? 'Analyzing...' : `AI Score All (${contactsWithoutScores})`}
                    </span>
                    <Sparkles className="w-3 h-3 text-yellow-300" />
                  </ModernButton>
                </SmartTooltip>

                {/* Analyze Selected Button */}
                {selectedContacts.length > 0 && (
                  <SmartTooltip featureId="ai_analyze_selected_button">
                    <ModernButton
                      variant="outline"
                      size="toolbar"
                      onClick={handleAnalyzeSelected}
                      disabled={isAnalyzing}
                      className={`${TOOLBAR_BTN} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-800/40`}
                    >
                      <Target className="w-4 h-4" />
                      <span>{isAnalyzing ? 'Processing...' : `Analyze Selected (${selectedContacts.length})`}</span>
                    </ModernButton>
                  </SmartTooltip>
                )}
              </div>

              {/* Bulk Actions */}
              {selectedContacts.length > 0 && (
                <div className="relative">
                  <ModernButton
                    variant="outline"
                    size="toolbar"
                    onClick={() => setBulkActionDropdown(!bulkActionDropdown)}
                    className={TOOLBAR_BTN}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Actions</span>
                    <ChevronDown className="w-4 h-4" />
                  </ModernButton>
                  
                  {bulkActionDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10">
                      <button
                        onClick={handleAnalyzeSelected}
                        disabled={isAnalyzing}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg disabled:opacity-50"
                      >
                        Re-analyze Selected
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={handleExportContacts}
                      >
                        Export Selected
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => {
                          const picked = filteredContacts.filter(c => selectedContacts.includes(c.id));
                          if (picked.length) downloadTextFile(contactsToVcard(picked), 'text/vcard;charset=utf-8', vcardFilename(picked));
                          setBulkActionDropdown(false);
                        }}
                      >
                        Export as vCard
                      </button>
                      <button
                        onClick={() => setBulkMode(bulkMode === 'tags' ? null : 'tags')}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Add Tags
                      </button>
                      {bulkMode === 'tags' && (
                        <form
                          className="flex items-center gap-2 px-3 pb-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const tags = bulkTagInput.split(',');
                            void runBulk(() => bulkAddTagsWithUndo(contacts.filter(c => selectedContacts.includes(c.id)), tags));
                          }}
                        >
                          <input
                            autoFocus
                            value={bulkTagInput}
                            onChange={(e) => setBulkTagInput(e.target.value)}
                            placeholder="tag1, tag2"
                            className="flex-1 min-w-0 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button type="submit" className="px-2 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
                        </form>
                      )}
                      <button
                        onClick={() => setBulkMode(bulkMode === 'status' ? null : 'status')}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Change Status
                      </button>
                      {bulkMode === 'status' && ['lead', 'prospect', 'customer', 'churned', 'active', 'pending', 'inactive'].map((st) => (
                        <button
                          key={st}
                          onClick={() => void runBulk(() => bulkUpdateWithUndo(selectedContacts, { status: st as any }))}
                          className="w-full text-left pl-8 pr-4 py-1.5 text-sm capitalize text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {st}
                        </button>
                      ))}
                      <button
                        onClick={() => setBulkMode(bulkMode === 'interest' ? null : 'interest')}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Change Interest
                      </button>
                      {bulkMode === 'interest' && ['hot', 'medium', 'low', 'cold'].map((lv) => (
                        <button
                          key={lv}
                          onClick={() => void runBulk(() => bulkUpdateWithUndo(selectedContacts, { interestLevel: lv as any }))}
                          className="w-full text-left pl-8 pr-4 py-1.5 text-sm capitalize text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {lv}
                        </button>
                      ))}
                      {selectedContacts.length >= 2 && selectedContacts.length <= MAX_MERGE_RECORDS && (
                        <button
                          onClick={() => {
                            setMergeCandidates(contacts.filter(c => selectedContacts.includes(c.id)));
                            setBulkActionDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Merge Selected ({selectedContacts.length})
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          setBulkActionDropdown(false);
                          try {
                            const r = await aiBatchService.submit('enrich', selectedContacts);
                            alert(`Batch enrichment started for ${r.batch.total} contact(s)${r.skipped.length ? ` (${r.skipped.length} skipped: not enough data)` : ''}. Results are applied automatically within 24 hours; only empty fields are filled.`);
                          } catch (e) {
                            alert(e instanceof Error ? e.message : 'Could not start batch enrichment');
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Enrich Selected (batch, 50% cost)
                      </button>
                      <button
                        onClick={async () => {
                          setBulkActionDropdown(false);
                          try {
                            const r = await aiBatchService.submit('embed', selectedContacts);
                            alert(`Indexing ${r.batch.total} contact(s) for semantic search. This finishes within 24 hours.`);
                          } catch (e) {
                            alert(e instanceof Error ? e.message : 'Could not start indexing');
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Index for Search (batch)
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Move ${selectedContacts.length} selected contacts to Trash? You can restore them from Deleted.`)) {
                            void runBulk(() => bulkTrashWithUndo(selectedContacts));
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Delete Selected
                      </button>
                      <button
                        onClick={() => clearContactSelection()}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors last:rounded-b-lg"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Import/Export */}
              <SmartTooltip featureId="contacts_import_button">
                <ModernButton
                  variant="outline"
                  size="toolbar"
                  onClick={handleImportClick}
                  className={`${TOOLBAR_BTN} bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-800/40`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Import</span>
                </ModernButton>
              </SmartTooltip>

              <SmartTooltip featureId="contacts_export_button">
                <ModernButton
                  variant="outline"
                  size="toolbar"
                  className={`${TOOLBAR_BTN} bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700 dark:hover:bg-indigo-800/40`}
                  onClick={handleExportContacts}
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </ModernButton>
              </SmartTooltip>

              <SmartTooltip featureId="contacts_new_button">
                <ModernButton
                  variant="primary"
                  size="toolbar"
                  onClick={handleNewContactClick}
                  className={TOOLBAR_BTN}
                >
                  <Plus className="w-4 h-4" />
                  <span>New Contact</span>
                </ModernButton>
              </SmartTooltip>

              <SmartTooltip featureId="contacts_settings_button">
                <ModernButton
                  variant="outline"
                  size="toolbar"
                  onClick={handleSettingsClick}
                  className={`${TOOLBAR_BTN} bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-800/40`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </ModernButton>
              </SmartTooltip>

              {/* AI Product Intelligence Button */}
              <SmartTooltip featureId="ai_product_intelligence_button">
                <ModernButton
                  variant="primary"
                  size="toolbar"
                  onClick={handleProductIntelligenceClick}
                  className={`${TOOLBAR_BTN} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700`}
                >
                  <Brain className="w-4 h-4" />
                  <span>AI Product Intelligence</span>
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                </ModernButton>
              </SmartTooltip>

              {/* My Products Button */}
              {onNavigate && (
                <ModernButton
                  variant="primary"
                  size="toolbar"
                  onClick={() => onNavigate('products')}
                  className={`${TOOLBAR_BTN} bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700`}
                >
                  <Package className="w-4 h-4" />
                  <span>My Products</span>
                </ModernButton>
              )}

              <SmartTooltip featureId="learn_more_button">
                <ModernButton
                  variant="outline"
                  size="toolbar"
                  onClick={onClose}
                  className={`${TOOLBAR_BTN} bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600`}
                >
                  <Info className="w-4 h-4" />
                  <span>Learn More</span>
                </ModernButton>
              </SmartTooltip>

              {/* Dark Mode Toggle */}
              <SmartTooltip featureId="dark_mode_toggle">
                <DarkModeToggle size="md" />
              </SmartTooltip>
              
              <button
                onClick={onClose}
                className={`${TOOLBAR_ICON_BTN} text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* AI Analysis Progress */}
          {(isAnalyzing || analysisProgress || aiResults) && (
            <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-800 dark:to-blue-800 border-b border-purple-300 dark:border-purple-600">
              {analysisProgress && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    <span className="font-medium text-purple-900 dark:text-purple-200">
                      Analyzing contacts... ({analysisProgress.current}/{analysisProgress.total})
                    </span>
                  </div>
                  <div className="flex-1 max-w-xs">
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    {Math.round((analysisProgress.current / analysisProgress.total) * 100)}%
                  </span>
                </div>
              )}

              {analysisProgress && Object.keys(liveScores).length > 0 && (
                <div className="mt-3 space-y-2" aria-live="polite">
                  {Object.entries(liveScores).map(([id, item]) => (
                    <div key={id} className="text-sm text-purple-900 dark:text-purple-200">
                      <span className="font-medium">{item.name}</span>
                      {item.text ? <pre className="whitespace-pre-wrap break-words font-sans text-xs text-purple-800 dark:text-purple-300 m-0 mt-1">{item.text}</pre> : null}
                    </div>
                  ))}
                </div>
              )}

              {aiResults && !analysisProgress && (
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900 dark:text-green-200">
                    AI Analysis Complete: {aiResults.success} contacts scored successfully
                    {aiResults.failed > 0 && `, ${aiResults.failed} failed`}
                  </span>
                  <button
                    onClick={() => setAiResults(null)}
                    className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 text-sm underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[min(100%,48rem)]">
              {/* Search Input */}
              <SmartTooltip featureId="contacts_search_input">
                <div className="relative flex-1 min-w-[14rem] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 pl-10 pr-4 text-sm w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </SmartTooltip>

              {/* Interest Level Filter */}
              <div className="relative">
                <SmartTooltip featureId="contacts_interest_filter">
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className={`${TOOLBAR_BTN} bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>{activeFilterLabel}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </SmartTooltip>
                
                {isFilterDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10">
                    {filterOptions.map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => handleFilterClick(filter.value)}
                        className={`
                          w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg
                          ${activeFilter === filter.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}
                        `}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <SmartTooltip featureId="contacts_status_filter">
                  <button
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className={`${TOOLBAR_BTN} bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <span>{activeStatusLabel}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </SmartTooltip>
                
                {isStatusDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleStatusFilterClick(option.value)}
                        className={`
                          w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg
                          ${statusFilter === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced (AND/OR) Filters */}
              <button
                onClick={() => setShowAdvancedFilters(v => !v)}
                className={`${TOOLBAR_BTN} border transition-colors ${
                  showAdvancedFilters || advancedFilterCount > 0
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                title="Advanced filters with And / Or groups"
              >
                <Filter className="w-4 h-4" />
                <span>Advanced{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ''}</span>
              </button>

              {/* Select All */}
              <SmartTooltip featureId="contacts_select_all">
                <button
                  onClick={handleSelectAll}
                  className={`${TOOLBAR_BTN} text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors`}
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{selectedContacts.length === filteredContacts.length ? 'Deselect All' : 'Select All'}</span>
                </button>
              </SmartTooltip>
            </div>

            {/* View Mode Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Deleted (Trash) */}
              <button
                onClick={() => setShowTrash(true)}
                className={`${TOOLBAR_BTN} bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                title="Deleted contacts (Trash)"
              >
                <ArchiveRestore className="w-4 h-4" />
                <span>Deleted{trashedContacts.length > 0 ? ` (${trashedContacts.length})` : ''}</span>
              </button>

              {/* Clear Data Button */}
              <SmartTooltip featureId="clear_data_button">
                <ModernButton
                  variant="outline"
                  size="toolbar"
                  onClick={() => setIsClearDataModalOpen(true)}
                  className={`${TOOLBAR_BTN} bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-800/40`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Data</span>
                </ModernButton>
              </SmartTooltip>

              {/* Sort Dropdown */}
              <SmartTooltip featureId="contacts_sort_control">
                <div className="relative flex shrink-0" ref={thenByRef}>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    if (e.target.value === '__then-by') { setShowThenBy(true); return; }
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as typeof sortBy);
                    setSortOrder(order as typeof sortOrder);
                  }}
                  className={`${TOOLBAR_SELECT} bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="company-asc">Company A-Z</option>
                  <option value="company-desc">Company Z-A</option>
                  <option value="score-desc">Highest Score</option>
                  <option value="score-asc">Lowest Score</option>
                  <option value="updated-desc">Recently Updated</option>
                  <option value="updated-asc">Oldest Updated</option>
                  <option value="__then-by">{thenBy.length ? `Then by... (${thenBy.length})` : 'Then by...'}</option>
                </select>
                {showThenBy && (
                  <div
                    role="dialog"
                    aria-label="Then by"
                    data-testid="then-by-popover"
                    className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 p-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                      Then sort by
                    </p>
                    {thenBy.length === 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Ties in the sort above are kept in list order.</p>
                    )}
                    {thenBy.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <select
                          aria-label={`Then by field ${i + 1}`}
                          value={t.field}
                          onChange={(e) => setThenBy(thenBy.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)))}
                          className="flex-1 min-w-0 h-10 px-3 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.keys(CONTACT_SORT_FIELDS).map((f) => (
                            <option key={f} value={f}>{CONTACT_SORT_LABELS[f] ?? f}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          aria-label={`Then by direction ${i + 1}: ${t.direction === 'asc' ? 'ascending' : 'descending'}`}
                          onClick={() => setThenBy(thenBy.map((x, j) => (j === i ? { ...x, direction: x.direction === 'asc' ? 'desc' : 'asc' } : x)))}
                          className="h-10 px-3 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {t.direction === 'asc' ? 'A-Z' : 'Z-A'}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove then by ${i + 1}`}
                          onClick={() => setThenBy(thenBy.filter((_, j) => j !== i))}
                          className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {thenBy.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          const used = new Set([sortBy, ...thenBy.map((t) => t.field)]);
                          const next = Object.keys(CONTACT_SORT_FIELDS).find((f) => !used.has(f));
                          if (next) setThenBy([...thenBy, { field: next, direction: 'asc' }]);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add sort
                      </button>
                    )}
                  </div>
                )}
                </div>
              </SmartTooltip>

              <ViewSwitcher />
            </div>
          </div>

          {bulk.banner.kind !== 'none' && (
            <div
              role="status"
              data-testid="select-all-banner"
              className="flex flex-wrap items-center justify-center gap-3 px-6 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800"
            >
              <span>{bannerMessage(bulk.banner)}</span>
              {bulk.banner.kind === 'offer' ? (
                <button type="button" onClick={bulk.selectAllMatching} className="font-semibold underline underline-offset-2 hover:no-underline">
                  Select all {bulk.banner.matchingCount} matching
                </button>
              ) : (
                <button type="button" onClick={bulk.clearSelection} className="font-semibold underline underline-offset-2 hover:no-underline">
                  Clear selection
                </button>
              )}
            </div>
          )}

          {showAdvancedFilters && (
            <AdvancedFilterPanel
              fields={advancedFilterFields}
              matchCount={filteredContacts.length}
              totalCount={contacts.length}
              savedViews={<SavedViewsMenu snapshot={viewSnapshot} onApply={applyViewSnapshot} />}
              duplicates={{ count: duplicateGroups.length, onOpen: () => setShowDuplicates(true) }}
              onClose={() => setShowAdvancedFilters(false)}
            />
          )}

          {showDuplicates && (
            <DuplicateReviewModal
              groups={duplicateGroups}
              onClose={() => setShowDuplicates(false)}
              onDismiss={dismissDuplicateGroup}
              onMerge={(group) => { setShowDuplicates(false); setMergeCandidates(group); }}
            />
          )}
          {mergeCandidates && (
            <MergeContactsModal
              contacts={mergeCandidates}
              onClose={() => setMergeCandidates(null)}
              onMerged={() => { setMergeCandidates(null); clearContactSelection(); }}
            />
          )}

          {/* Contacts Content */}
          <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
            {isLoadingContacts ? (
              <div className="p-6">
                <ContactDetailSkeleton variant="content" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Users className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No contacts found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Try adjusting your search or filter criteria</p>
                <ModernButton size="toolbar"
                  variant="primary"
                  onClick={handleNewContactClick}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Your First Contact</span>
                </ModernButton>
              </div>
            ) : (
              renderView()
            )}
          </div>
        </div>
        <ContactPeekDrawer onOpenRecord={handleContactClick} />
      </div>
      {!selectedContact && <UndoToast />}

      {showTrash && (
        <ContactTrashModal
          onClose={() => setShowTrash(false)}
          onOpen={(c) => { setShowTrash(false); setSelectedContact(c); }}
        />
      )}

      {/* Import Contacts Modal */}
      <ImportContactsModal
        isOpen={isImportModalOpen}
        onClose={handleImportModalClose}
      />

      {/* New Contact Modal */}
      <NewContactModal
        isOpen={isNewContactModalOpen}
        onClose={handleNewContactModalClose}
      />

      {/* Contact Detail Modal */}
      {selectedContact && (
        <>
          <AIProvider>
            <ToastProvider>
              <AIErrorToaster />
              <UndoToast />
              <ContactErrorBoundary
                onError={(error, errorInfo) => {
                  console.error('Contact detail error:', error, errorInfo);
                  // Could send to error reporting service
                }}
              >
                <SmartTooltip featureId="contact_detail_view" position="top">
                  <div>
                    <ContactDetailView
                      contact={selectedContact}
                      isOpen={!!selectedContact}
                      onClose={handleContactDetailClose}
                      onUpdate={updateContact}
                      initialTab={deepLinkTab && deepLinkTab.contactId === selectedContact.id ? deepLinkTab.tab : undefined}
                      onOpenContact={setSelectedContact}
                    />
                  </div>
                </SmartTooltip>
              </ContactErrorBoundary>
            </ToastProvider>
          </AIProvider>
        </>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleSettingsModalClose}
      />

      {/* AI Product Intelligence Modal */}
      <ProductIntelligenceModal
        isOpen={isProductIntelligenceOpen}
        onClose={handleProductIntelligenceClose}
      />

      {/* SDR Modal */}
      {sdrModalContact && (
        <SDRModal
          isOpen={!!sdrModalContact}
          onClose={handleCloseSDRModal}
          contact={sdrModalContact}
        />
      )}

      {/* Playbook Modal */}
      {playbookModalContact && (
        <PlaybookModal
          isOpen={!!playbookModalContact}
          onClose={handleClosePlaybookModal}
          contact={playbookModalContact}
        />
      )}

      {/* Clear Data Confirmation Modal */}
      {isClearDataModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Clear All Contacts
              </h3>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This action will permanently delete all contacts from your database. This cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-red-700 dark:text-red-300">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={clearDataConfirmation}
                onChange={(e) => setClearDataConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Type DELETE to confirm"
                disabled={isClearingData}
              />
            </div>

            <div className="flex space-x-3">
              <ModernButton size="toolbar"
                variant="outline"
                onClick={() => {
                  setIsClearDataModalOpen(false);
                  setClearDataConfirmation('');
                }}
                disabled={isClearingData}
                className="flex-1"
              >
                Cancel
              </ModernButton>
              <ModernButton size="toolbar"
                variant="primary"
                onClick={handleClearData}
                disabled={clearDataConfirmation !== 'DELETE' || isClearingData}
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {isClearingData ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  'Clear All Data'
                )}
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};