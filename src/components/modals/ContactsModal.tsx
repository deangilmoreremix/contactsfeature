import React, { useState, useEffect, useMemo } from 'react';
import { useAI } from '../../contexts/AIContext';
import { AIProvider } from '../../contexts/AIContext';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { ModernButton } from '../ui/ModernButton';
import { SmartTooltip } from '../ui/SmartTooltip';
import { ContactDetailView } from './ContactDetailView';
import { ImportContactsModal } from './ImportContactsModal';
import { NewContactModal } from './NewContactModal';
import { SettingsModal } from './SettingsModal';
import { useContactStore } from '../../hooks/useContactStore';
import { Contact } from '../../types';
import { AIEnhancedContactCard } from '../contacts/AIEnhancedContactCard';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import Fuse from 'fuse.js';
import {
  X,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Plus,
  Users,
  ChevronDown,
  Brain,
  Download,
  Upload,
  Zap,
  CheckCheck,
  Grid3X3,
  List,
  ArrowUp,
  ArrowDown,
  Settings,
  Target,
  BarChart3,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  TestTube
} from 'lucide-react';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const interestColors = {
  hot: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  cold: 'bg-gray-400'
};

const interestLabels = {
  hot: 'Hot Client',
  medium: 'Medium Interest',
  low: 'Low Interest',
  cold: 'Non Interest'
};

const sourceColors: { [key: string]: string } = {
  'LinkedIn': 'bg-blue-600',
  'Facebook': 'bg-blue-500',
  'Email': 'bg-green-500',
  'Website': 'bg-purple-500',
  'Referral': 'bg-orange-500',
  'Typeform': 'bg-pink-500',
  'Cold Call': 'bg-gray-600'
};

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

export const ContactsModal: React.FC<ContactsModalProps> = ({ isOpen, onClose }) => {
  const { contacts, isLoading, updateContact, createContact } = useContactStore();
  const { scoreBulkContacts, generateBulkInsights, isProcessing } = useAI();
  
  // UI State
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bulkActionDropdown, setBulkActionDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'score' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [analysisProgress, setAnalysisProgress] = useState<{current: number, total: number} | null>(null);
  const [aiResults, setAiResults] = useState<{success: number, failed: number} | null>(null);
  const [analyzingContactIds, setAnalyzingContactIds] = useState<string[]>([]);
  
  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(contacts, {
      keys: ['name', 'company', 'title', 'email', 'industry'],
      threshold: 0.3,
    });
  }, [contacts]);

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
  const filteredContacts = useMemo(() => {
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

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'company':
          aValue = a.company.toLowerCase();
          bValue = b.company.toLowerCase();
          break;
        case 'score':
          aValue = a.aiScore || 0;
          bValue = b.aiScore || 0;
          break;
        case 'updated':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [contacts, searchTerm, activeFilter, statusFilter, sortBy, sortOrder, fuse]);

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
      await scoreBulkContacts(contactsToAnalyze);
      setAiResults({ success: contactsToAnalyze.length, failed: 0 });
    } catch (error) {
      console.error('Bulk analysis failed:', error);
      setAiResults({ success: 0, failed: contactsToAnalyze.length });
    }

    setAnalysisProgress(null);
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
      await scoreBulkContacts(selectedContactObjects);
      setAiResults({ success: selectedContactObjects.length, failed: 0 });
    } catch (error) {
      console.error('Selected analysis failed:', error);
      setAiResults({ success: 0, failed: selectedContacts.length });
    }

    setAnalysisProgress(null);
    setSelectedContacts([]);
    setIsAnalyzing(false);
  };

  // Contact Selection Functions
  const handleContactSelect = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
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

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
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
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col animate-slide-in shadow-2xl text-gray-900 dark:text-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  Contacts
                  <Sparkles className="w-5 h-5 ml-2 text-yellow-500" />
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {filteredContacts.length} contacts found
                  {selectedContacts.length > 0 && ` • ${selectedContacts.length} selected`}
                  {contactsWithoutScores > 0 && ` • ${contactsWithoutScores} need AI scoring`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* AI Analysis Buttons */}
              <div className="flex items-center space-x-2">
                {/* Analyze All Button */}
                <SmartTooltip featureId="ai_score_all_button">
                  <ModernButton
                    variant="primary"
                    size="sm"
                    onClick={handleAnalyzeAll}
                    disabled={isAnalyzing || contactsWithoutScores === 0}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 dark:from-purple-500 dark:to-blue-500 dark:hover:from-purple-600 dark:hover:to-blue-600"
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
                      size="sm"
                      onClick={handleAnalyzeSelected}
                      disabled={isAnalyzing}
                      className="flex items-center space-x-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-800/40"
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
                    size="sm"
                    onClick={() => setBulkActionDropdown(!bulkActionDropdown)}
                    className="flex items-center space-x-2"
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
                      <button className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Add Tags
                      </button>
                      <button
                        onClick={() => setSelectedContacts([])}
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
                  size="sm"
                  onClick={handleImportClick}
                  className="flex items-center space-x-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-800/40"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import</span>
                </ModernButton>
              </SmartTooltip>

              <SmartTooltip featureId="contacts_export_button">
                <ModernButton
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700 dark:hover:bg-indigo-800/40"
                  onClick={handleExportContacts}
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </ModernButton>
              </SmartTooltip>

              <SmartTooltip featureId="contacts_new_button">
                <ModernButton
                  variant="primary"
                  size="sm"
                  onClick={handleNewContactClick}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Contact</span>
                </ModernButton>
              </SmartTooltip>

              <SmartTooltip featureId="contacts_settings_button">
                <ModernButton
                  variant="outline"
                  size="sm"
                  onClick={handleSettingsClick}
                  className="flex items-center space-x-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-800/40"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </ModernButton>
              </SmartTooltip>


              <SmartTooltip featureId="learn_more_button">
                <ModernButton
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  <Info className="w-4 h-4" />
                  <span>Learn More</span>
                </ModernButton>
              </SmartTooltip>

              {/* Dark Mode Toggle */}
              <SmartTooltip featureId="dark_mode_toggle">
                <DarkModeToggle size="sm" />
              </SmartTooltip>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* AI Analysis Progress */}
          {(isAnalyzing || analysisProgress || aiResults) && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-purple-200 dark:border-purple-800">
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
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search Input */}
              <SmartTooltip featureId="contacts_search_input">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </SmartTooltip>

              {/* Interest Level Filter */}
              <div className="relative">
                <SmartTooltip featureId="contacts_interest_filter">
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                    className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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

              {/* Select All */}
              <SmartTooltip featureId="contacts_select_all">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{selectedContacts.length === filteredContacts.length ? 'Deselect All' : 'Select All'}</span>
                </button>
              </SmartTooltip>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              {/* Sort Dropdown */}
              <SmartTooltip featureId="contacts_sort_control">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as typeof sortBy);
                    setSortOrder(order as typeof sortOrder);
                  }}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="company-asc">Company A-Z</option>
                  <option value="company-desc">Company Z-A</option>
                  <option value="score-desc">Highest Score</option>
                  <option value="score-asc">Lowest Score</option>
                  <option value="updated-desc">Recently Updated</option>
                  <option value="updated-asc">Oldest Updated</option>
                </select>
              </SmartTooltip>

              <SmartTooltip featureId="contacts_view_mode">
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 text-sm font-medium transition-colors ${
                      viewMode === 'card'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                      viewMode === 'table'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </SmartTooltip>
            </div>
          </div>

          {/* Contacts Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Users className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No contacts found</h3>
                <p className="text-gray-500 dark:text-gray-500 mb-4">Try adjusting your search or filter criteria</p>
                <ModernButton 
                  variant="primary" 
                  onClick={handleNewContactClick}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Your First Contact</span>
                </ModernButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredContacts.map((contact) => (
                  <SmartTooltip key={contact.id} featureId="contact_card" position="top">
                    <div>
                      <AIEnhancedContactCard
                        contact={contact}
                        isSelected={selectedContacts.includes(contact.id)}
                        onSelect={() => handleContactSelect(contact.id)}
                        onClick={() => handleContactClick(contact)}
                        onEdit={handleEditContact}
                        onAnalyze={handleAnalyzeContact}
                        isAnalyzing={analyzingContactIds.includes(contact.id)}
                      />
                    </div>
                  </SmartTooltip>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
        <AIProvider>
          <SmartTooltip featureId="contact_detail_view" position="top">
            <div>
              <ContactDetailView
                contact={selectedContact}
                isOpen={!!selectedContact}
                onClose={handleContactDetailClose}
                onUpdate={updateContact}
              />
            </div>
          </SmartTooltip>
        </AIProvider>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleSettingsModalClose}
      />
    </>
  );
};