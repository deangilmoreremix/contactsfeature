import React, { useState, useEffect } from 'react';
import { useContactStore } from '../hooks/useContactStore';
import { useView } from '../contexts/ViewContext';
import { Contact } from '../types/contact';
import { ViewSwitcher } from '../components/contacts/ViewSwitcher';
import { ListView } from '../components/contacts/views/ListView';
import { TableView } from '../components/contacts/views/TableView';
import { KanbanView } from '../components/contacts/views/KanbanView';
import { CalendarView } from '../components/contacts/views/CalendarView';
import { DashboardView } from '../components/contacts/views/DashboardView';
import { TimelineView } from '../components/contacts/views/TimelineView';
import { ContactDetailView } from '../components/modals/ContactDetailView';
import { NewContactModal } from '../components/modals/NewContactModal';
import { ImportContactsModal } from '../components/modals/ImportContactsModal';
import { ModernButton } from '../components/ui/ModernButton';
import { GlassCard } from '../components/ui/GlassCard';
import {
  Plus,
  Search,
  Download,
  Upload,
  Filter,
  X,
  Loader
} from 'lucide-react';

export default function Contacts() {
  const { contacts, isLoading, searchContacts, exportContacts } = useContactStore();
  const { currentView, filters, setFilters, isLoading: viewLoading } = useView();

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localFilters, setLocalFilters] = useState(filters[currentView]);

  useEffect(() => {
    setLocalFilters(filters[currentView]);
  }, [currentView, filters]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      await searchContacts(query);
    }
  };

  const handleApplyFilters = async () => {
    await setFilters(currentView, localFilters);
    setShowFilters(false);
  };

  const handleResetFilters = async () => {
    setLocalFilters({});
    await setFilters(currentView, {});
    setShowFilters(false);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      await exportContacts(format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    if (localFilters.status && localFilters.status.length > 0) {
      if (!localFilters.status.includes(contact.status)) return false;
    }
    if (localFilters.interestLevel && localFilters.interestLevel.length > 0) {
      if (!localFilters.interestLevel.includes(contact.interestLevel)) return false;
    }
    if (localFilters.isFavorite !== undefined) {
      if (contact.isFavorite !== localFilters.isFavorite) return false;
    }
    if (localFilters.aiScoreMin !== undefined) {
      if ((contact.aiScore || 0) < localFilters.aiScoreMin) return false;
    }
    if (localFilters.aiScoreMax !== undefined) {
      if ((contact.aiScore || 0) > localFilters.aiScoreMax) return false;
    }
    if (localFilters.tags && localFilters.tags.length > 0) {
      if (!contact.tags?.some(tag => localFilters.tags?.includes(tag))) return false;
    }
    if (localFilters.industry && localFilters.industry.length > 0) {
      if (!contact.industry || !localFilters.industry.includes(contact.industry)) return false;
    }
    return true;
  });

  const renderView = () => {
    const viewProps = {
      contacts: filteredContacts,
      onContactClick: setSelectedContact
    };

    switch (currentView) {
      case 'list':
        return <ListView {...viewProps} />;
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
        return <ListView {...viewProps} />;
    }
  };

  const activeFiltersCount = Object.keys(localFilters).filter(key => {
    const value = localFilters[key as keyof typeof localFilters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
  }).length;

  // Temporarily disable view loading check to ensure ViewSwitcher renders
  // if (viewLoading) {
  //   return (
  //     <div className="flex items-center justify-center h-screen">
  //       <Loader className="w-8 h-8 animate-spin text-blue-600" />
  //     </div>
  //   );
  // }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex-none px-6 py-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Contacts
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage and organize your contact relationships
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ModernButton
              variant="secondary"
              icon={Upload}
              onClick={() => setShowImportModal(true)}
            >
              Import
            </ModernButton>
            <div className="relative group">
              <ModernButton variant="secondary" icon={Download}>
                Export
              </ModernButton>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    Export as JSON
                  </button>
                </div>
              </div>
            </div>
            <ModernButton
              variant="primary"
              icon={Plus}
              onClick={() => setShowNewContactModal(true)}
            >
              New Contact
            </ModernButton>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name, email, company..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div className="relative">
            <ModernButton
              variant={activeFiltersCount > 0 ? 'primary' : 'secondary'}
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {activeFiltersCount}
                </span>
              )}
            </ModernButton>
          </div>

          <ViewSwitcher />
        </div>

        {showFilters && (
          <GlassCard className="mt-4 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Filter Contacts</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  multiple
                  value={localFilters.status || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setLocalFilters({ ...localFilters, status: values });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="churned">Churned</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interest Level
                </label>
                <select
                  multiple
                  value={localFilters.interestLevel || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setLocalFilters({ ...localFilters, interestLevel: values });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                  <option value="hot">Hot</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="cold">Cold</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Score Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    min="0"
                    max="100"
                    value={localFilters.aiScoreMin || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, aiScoreMin: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    min="0"
                    max="100"
                    value={localFilters.aiScoreMax || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, aiScoreMax: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.isFavorite === true}
                  onChange={(e) => setLocalFilters({ ...localFilters, isFavorite: e.target.checked ? true : undefined })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show favorites only</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <ModernButton variant="secondary" onClick={handleResetFilters}>
                Reset
              </ModernButton>
              <ModernButton variant="primary" onClick={handleApplyFilters}>
                Apply Filters
              </ModernButton>
            </div>
          </GlassCard>
        )}
      </div>

      <div className="flex-1 overflow-hidden px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          renderView()
        )}
      </div>

      {selectedContact && (
        <ContactDetailView
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}

      {showNewContactModal && (
        <NewContactModal
          isOpen={showNewContactModal}
          onClose={() => setShowNewContactModal(false)}
        />
      )}

      {showImportModal && (
        <ImportContactsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
