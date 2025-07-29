import React, { useState, useEffect } from 'react';
import { useEmailAI } from '../../hooks/useEmailAI';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types';
import { 
  Mail, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  Loader2, 
  FileText,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';

interface EmailTemplateSelectorProps {
  contact: Contact;
  onSelectTemplate: (subject: string, body: string) => void;
  className?: string;
}

export const EmailTemplateSelector: React.FC<EmailTemplateSelectorProps> = ({
  contact,
  onSelectTemplate,
  className = ''
}) => {
  const { fetchEmailTemplates, applyTemplate, isFetching, emailTemplates, error } = useEmailAI();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [appliedTemplate, setAppliedTemplate] = useState<{ subject: string; body: string } | null>(null);

  // Company info for template variables
  const companyInfo = {
    name: 'Your Company',
    senderName: 'Your Name',
    senderTitle: 'Your Title',
    senderPhone: '+1 (555) 123-4567',
    productName: 'Your Product',
    solutionType: 'Your Solution',
  };

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async (category?: string) => {
    try {
      await fetchEmailTemplates(category || selectedCategory !== 'all' ? selectedCategory : undefined);
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    loadTemplates(category !== 'all' ? category : undefined);
  };

  const handlePreviewTemplate = (template: any) => {
    const applied = applyTemplate(template, contact, companyInfo);
    setAppliedTemplate(applied);
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleSelectTemplate = () => {
    if (appliedTemplate) {
      onSelectTemplate(appliedTemplate.subject, appliedTemplate.body);
      setIsPreviewOpen(false);
    }
  };

  const handleCopyTemplate = () => {
    if (appliedTemplate) {
      const text = `Subject: ${appliedTemplate.subject}\n\n${appliedTemplate.body}`;
      navigator.clipboard.writeText(text)
        .then(() => {
          // Show copied notification
          console.log('Template copied to clipboard');
        })
        .catch(err => console.error('Failed to copy text:', err));
    }
  };

  const categories = [
    { id: 'all', name: 'All Templates' },
    { id: 'Prospecting', name: 'Prospecting' },
    { id: 'Follow-up', name: 'Follow-up' },
    { id: 'Proposal', name: 'Proposal' },
    { id: 'Meeting', name: 'Meeting' },
    { id: 'Re-engagement', name: 'Re-engagement' },
    { id: 'General', name: 'General' }
  ];

  // Filter templates based on search
  const filteredTemplates = emailTemplates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-green-500" />
          Email Templates
        </h3>
        <ModernButton
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </ModernButton>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Template List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {isFetching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            <span className="ml-3 text-gray-600">Loading templates...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 mb-2">No templates found</p>
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'Try a different search term' : 'Add some templates to get started'}
            </p>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div 
              key={template.id}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 transition-colors cursor-pointer"
              onClick={() => handlePreviewTemplate(template)}
            >
              <div className="flex justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  {template.description && (
                    <p className="text-sm text-gray-500">{template.description}</p>
                  )}
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {template.category}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Template Preview Modal */}
      {isPreviewOpen && previewTemplate && appliedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-500" />
                  {previewTemplate.name}
                </h3>
                <button 
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 text-sm">
                {previewTemplate.description || 'No description available'}
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
              {/* Subject */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Subject:</h4>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {appliedTemplate.subject}
                </div>
              </div>

              {/* Body */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Body:</h4>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-line">
                  {appliedTemplate.body}
                </div>
              </div>

              {/* Variables */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Template Variables:</h4>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.variables.map((variable: string) => (
                    <span 
                      key={variable} 
                      className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md"
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between">
              <ModernButton
                variant="outline"
                size="sm"
                onClick={handleCopyTemplate}
                className="flex items-center space-x-1"
              >
                <Copy className="w-4 h-4" />
                <span>Copy to Clipboard</span>
              </ModernButton>
              
              <div className="flex space-x-2">
                <ModernButton
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Cancel
                </ModernButton>
                <ModernButton
                  variant="primary"
                  size="sm"
                  onClick={handleSelectTemplate}
                  className="flex items-center space-x-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Use Template</span>
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};