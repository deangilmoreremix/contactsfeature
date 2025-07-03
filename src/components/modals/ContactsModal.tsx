import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Users, Mail, Phone, Building, Target, UserPlus, Upload, Download, MoreHorizontal, Zap, BarChart3, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useContactStore } from '../../store/contactStore';
import { Contact } from '../../types/contact';
import OpenAIService from '../../services/openaiService';
import GeminiService from '../../services/geminiService';
import { LoggerService } from '../../services/logger.service';
import NewContactModal from './NewContactModal';
import ContactDetailView from './ContactDetailView';
import ImportContactsModal from './ImportContactsModal';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactsModal: React.FC<ContactsModalProps> = ({ isOpen, onClose }) => {
  const {
    filteredContacts,
    searchTerm,
    isLoading,
    error,
    selectedContacts,
    filters,
    setSearchTerm,
    setFilters,
    toggleContactSelection,
    clearSelection,
    selectAll,
    loadContacts,
    clearError
  } = useContactStore();

  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<{
    success: number;
    failed: number;
    total: number;
    errors: string[];
  }>({ success: 0, failed: 0, total: 0, errors: [] });

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  // Clear error when modal opens
  useEffect(() => {
    if (isOpen) {
      clearError();
    }
  }, [isOpen, clearError]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'customer': return 'bg-green-100 text-green-800';
      case 'prospect': return 'bg-blue-100 text-blue-800';
      case 'lead': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleAnalyzeContact = async (contact: Contact) => {
    try {
      setIsAnalyzing(true);
      LoggerService.info('Starting contact analysis', { contactId: contact.id });

      // Try OpenAI first, fallback to Gemini
      let analysisResult;
      try {
        analysisResult = await OpenAIService.analyzeContact(contact);
        LoggerService.info('OpenAI analysis successful', { contactId: contact.id });
      } catch (openaiError: any) {
        LoggerService.warn('OpenAI analysis failed, trying Gemini', { 
          contactId: contact.id, 
          error: openaiError.message 
        });
        
        try {
          analysisResult = await GeminiService.analyzeContact(contact);
          LoggerService.info('Gemini analysis successful', { contactId: contact.id });
        } catch (geminiError: any) {
          LoggerService.error('Both AI services failed', { 
            contactId: contact.id, 
            openaiError: openaiError.message,
            geminiError: geminiError.message 
          });
          throw new Error('AI analysis unavailable. Please check your API configuration.');
        }
      }

      // Update contact with analysis results
      try {
        const { updateContact } = useContactStore.getState();
        await updateContact(contact.id, {
          lead_score: analysisResult.leadScore,
          engagement_score: Math.min(100, (analysisResult.leadScore + (contact.engagement_score || 50)) / 2),
          notes: `${contact.notes || ''}\n\nAI Analysis (${new Date().toLocaleDateString()}):\n${analysisResult.insights.join('\n')}`.trim(),
          last_activity: new Date().toISOString()
        });

        setAnalysisStatus(prev => ({ 
          ...prev, 
          success: prev.success + 1 
        }));

        LoggerService.info('Contact analysis completed successfully', { 
          contactId: contact.id,
          leadScore: analysisResult.leadScore 
        });

      } catch (updateError: any) {
        LoggerService.error('Failed to update contact with analysis results', { 
          contactId: contact.id, 
          error: updateError.message 
        });
        
        setAnalysisStatus(prev => ({ 
          ...prev, 
          failed: prev.failed + 1,
          errors: [...prev.errors, `Contact ${contact.first_name} ${contact.last_name}: ${updateError.message}`]
        }));
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Analysis failed for unknown reasons';
      LoggerService.error('Contact analysis failed', { 
        contactId: contact.id, 
        error: errorMessage 
      });
      
      setAnalysisStatus(prev => ({ 
        ...prev, 
        failed: prev.failed + 1,
        errors: [...prev.errors, `Contact ${contact.first_name} ${contact.last_name}: ${errorMessage}`]
      }));
    }
  };

  const handleAnalyzeSelected = async () => {
    if (selectedContacts.size === 0) {
      LoggerService.warn('No contacts selected for analysis');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatus({ success: 0, failed: 0, total: selectedContacts.size, errors: [] });

    const contactsToAnalyze = filteredContacts.filter(contact => 
      selectedContacts.has(contact.id)
    );

    LoggerService.info('Starting batch analysis', { 
      contactCount: contactsToAnalyze.length 
    });

    // Process contacts in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < contactsToAnalyze.length; i += batchSize) {
      const batch = contactsToAnalyze.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(contact => handleAnalyzeContact(contact))
      );

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < contactsToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsAnalyzing(false);
    clearSelection();

    // Show results summary
    const { success, failed, errors } = analysisStatus;
    if (success > 0) {
      LoggerService.info('Batch analysis completed', { 
        successful: success, 
        failed: failed,
        total: contactsToAnalyze.length 
      });
    }
  };

  const handleExportSelected = () => {
    const contactsToExport = filteredContacts.filter(contact => 
      selectedContacts.has(contact.id)
    );

    const csvContent = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Position', 'Status', 'Lead Score', 'Source'],
      ...contactsToExport.map(contact => [
        contact.first_name,
        contact.last_name,
        contact.email,
        contact.phone || '',
        contact.company || '',
        contact.position || '',
        contact.status,
        contact.lead_score?.toString() || '0',
        contact.source || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    LoggerService.info('Contacts exported', { count: contactsToExport.length });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Contact Management</h2>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
              {filteredContacts.length} contacts
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Analysis Status */}
        {isAnalyzing && (
          <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-blue-600 animate-pulse" />
              <span className="text-blue-800 font-medium">Analyzing contacts...</span>
            </div>
            <div className="text-sm text-blue-600">
              Progress: {analysisStatus.success + analysisStatus.failed} / {analysisStatus.total}
              {analysisStatus.success > 0 && <span className="text-green-600 ml-2">✓ {analysisStatus.success} successful</span>}
              {analysisStatus.failed > 0 && <span className="text-red-600 ml-2">✗ {analysisStatus.failed} failed</span>}
            </div>
            {analysisStatus.errors.length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                <details>
                  <summary className="cursor-pointer">View errors ({analysisStatus.errors.length})</summary>
                  <ul className="mt-1 ml-4 list-disc">
                    {analysisStatus.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 p-6 border-b border-gray-200">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowNewContactModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Contact</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>

            {selectedContacts.size > 0 && (
              <>
                <button
                  onClick={handleAnalyzeSelected}
                  disabled={isAnalyzing}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className={`h-4 w-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                  <span>{isAnalyzing ? 'Analyzing...' : 'AI Analyze'}</span>
                </button>

                <button
                  onClick={handleExportSelected}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Selection Controls */}
        {filteredContacts.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAll();
                    } else {
                      clearSelection();
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </label>
              
              {selectedContacts.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>

            {selectedContacts.size > 0 && (
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Selection
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading contacts...</p>
              </div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No contacts found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first contact.'}
                </p>
                <button
                  onClick={() => setShowNewContactModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Your First Contact
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-auto h-full">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedContacts.size === filteredContacts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll();
                          } else {
                            clearSelection();
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.map((contact) => (
                    <tr 
                      key={contact.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedContact(contact)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(contact.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleContactSelection(contact.id);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {contact.first_name} {contact.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{contact.email}</div>
                          {contact.phone && (
                            <div className="text-sm text-gray-500">{contact.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contact.company || '-'}</div>
                        <div className="text-sm text-gray-500">{contact.position || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                          {contact.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getLeadScoreColor(contact.lead_score || 0)}`}>
                          {contact.lead_score || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.source || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.last_activity ? new Date(contact.last_activity).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Mail className="h-4 w-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <Phone className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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

      {selectedContact && (
        <ContactDetailView
          contact={selectedContact}
          isOpen={!!selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
};

export default ContactsModal;