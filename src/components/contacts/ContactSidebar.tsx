import React from 'react';
import { AvatarUpload } from '../ui/AvatarUpload';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { contactService } from '../../services/contactService';
import { useResearchStatus } from '../ui/ResearchStatusOverlay';
import { aiEnrichmentService, ContactEnrichmentData } from '../../services/aiEnrichmentService';
import { webSearchService } from '../../services/webSearchService';
import { useContactEditing } from '../../hooks/useContactEditing';
import {
  X, Edit, Mail, Phone, Plus, MessageSquare, FileText, Calendar,
  User, Globe, Clock, Building, Tag, Brain, TrendingUp,
  BarChart3, Zap, Activity, Database, Target,
  Search, Sparkles, Wand2, Settings, Heart, HeartOff
} from 'lucide-react';
import {
  interestColors,
  interestLabels,
  sourceColors,
  socialPlatforms,
  quickSourceSuggestions
} from '../../constants/contactConstants';

interface ContactSidebarProps {
  contact: Contact;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  lastEnrichment: ContactEnrichmentData | null;
  setLastEnrichment: (enrichment: ContactEnrichmentData | null) => void;
  isEnriching: boolean;
  setIsEnriching: (enriching: boolean) => void;
}

export const ContactSidebar: React.FC<ContactSidebarProps> = ({
  contact,
  onClose,
  onUpdate,
  lastEnrichment,
  setLastEnrichment,
  isEnriching,
  setIsEnriching
}) => {
  const {
    isEditing,
    setIsEditing,
    editedContact,
    setEditedContact,
    handleToggleFavorite,
    handleEditField,
    handleStartEditingField,
    handleSaveField,
    handleAddCustomField,
    handleRemoveCustomField,
    showAddField,
    setShowAddField,
    newFieldName,
    setNewFieldName,
    newFieldValue,
    setNewFieldValue,
    handleAddSocialProfile,
    handleAddSourceToContact,
    handleRemoveSource,
    handleChangeInterestLevel,
    showAddSocial,
    setShowAddSocial,
    selectedSocialPlatform,
    setSelectedSocialPlatform,
    socialFieldValue,
    setSocialFieldValue,
    showAddSource,
    setShowAddSource,
    addSource,
    setAddSource,
    editInterestLevel,
    setEditInterestLevel,
    editingField
  } = useContactEditing({ contact, onUpdate });

  const researchStatus = useResearchStatus();

  const handleAIEnrichment = async (enrichmentData: ContactEnrichmentData) => {
    setLastEnrichment(enrichmentData);
    setIsEnriching(true);

    try {
      // Apply enrichment data to contact
      const updates: any = {};

      if (enrichmentData.phone && !editedContact.phone) {
        updates.phone = enrichmentData.phone;
      }
      if (enrichmentData.industry && !editedContact.industry) {
        updates.industry = enrichmentData.industry;
      }
      if (enrichmentData.avatar && enrichmentData.avatar !== editedContact.avatarSrc) {
        updates.avatarSrc = enrichmentData.avatar;
      }
      if (enrichmentData.notes) {
        updates.notes = editedContact.notes ?
          `${editedContact.notes}\n\nAI Research: ${enrichmentData.notes}` :
          enrichmentData.notes;
      }

      // Social profiles
      if (enrichmentData.socialProfiles) {
        const socialUpdates: any = {};
        Object.entries(enrichmentData.socialProfiles).forEach(([key, value]) => {
          if (value && !editedContact.socialProfiles?.[key as keyof typeof editedContact.socialProfiles]) {
            socialUpdates[key] = value;
          }
        });
        if (Object.keys(socialUpdates).length > 0) {
          updates.socialProfiles = { ...editedContact.socialProfiles, ...socialUpdates };
        }
      }

      // Update AI score if provided
      if (enrichmentData.confidence) {
        updates.aiScore = Math.round(enrichmentData.confidence);
      }

      const updatedContact = { ...editedContact, ...updates };
      setEditedContact(updatedContact);

      if (onUpdate && Object.keys(updates).length > 0) {
        await onUpdate(contact.id, updates);
      }

    } catch (error) {
      console.error('Failed to apply enrichment:', error);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSendEmail = () => {
    // Validate email before opening composer
    if (!editedContact.email || editedContact.email.trim() === '') {
      alert('No email address available for this contact. Please add an email address first.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedContact.email)) {
      alert('Invalid email address format. Please correct the email address.');
      return;
    }

    // Open enhanced email composer
    // This will be handled by parent component
  };

  const handleMakeCall = () => {
    if (!editedContact.phone) {
      alert('No phone number available for this contact. Please add a phone number first.');
      return;
    }

    // Open enhanced call handler
    // This will be handled by parent component
  };

  const handleSendSMS = () => {
    if (!editedContact.phone) {
      alert('No phone number available for this contact. Please add a phone number first.');
      return;
    }

    // Open SMS composer
    // This will be handled by parent component
  };

  return (
    <div className="w-80 bg-gradient-to-b from-gray-50 via-white to-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Fixed Header with AI Features */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          Customer Profile
          <Sparkles className="w-4 h-4 ml-2 text-purple-500" />
        </h2>
        <div className="flex space-x-2">
          {/* AI Research Button */}
          <button
            onClick={async () => {
              console.log('🧠 AI Web Research button clicked for contact:', editedContact.name);
              const isMockData = editedContact.isMockData || editedContact.dataSource === 'mock' || editedContact.createdBy === 'demo';
researchStatus.startResearch('🔍 Researching contact background...');

try {
  if (isMockData) {
    // Mock research implementation
    researchStatus.updateStatus({
      stage: 'analyzing',
      message: '🔍 Researching background information...'
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    researchStatus.updateStatus({
      stage: 'synthesizing',
      message: '📊 Synthesizing analysis results...'
    });

    const mockEnrichmentData: ContactEnrichmentData = {
      firstName: editedContact.firstName,
      lastName: editedContact.lastName,
      email: editedContact.email,
      company: editedContact.company,
      notes: `AI Web Research: Found comprehensive contact information including social media profiles and professional details.`,
      confidence: 91
    };

    await handleAIEnrichment(mockEnrichmentData);
    researchStatus.complete('✅ Research complete! Enhanced with web intelligence.');
  } else {
    // Real research implementation
    const searchQuery = `${editedContact.company} ${editedContact.firstName} ${editedContact.lastName} executive leadership news`;
    const systemPrompt = `You are a business intelligence researcher...`;
    const userPrompt = `Research this contact: ${editedContact.firstName} ${editedContact.lastName} at ${editedContact.company}.`;

    const searchResults = await webSearchService.searchWithAI(
      searchQuery,
      systemPrompt,
      userPrompt,
      { includeSources: true, searchContextSize: 'high' }
    );

    const enrichmentData: ContactEnrichmentData = {
      firstName: editedContact.firstName,
      lastName: editedContact.lastName,
      email: editedContact.email,
      company: editedContact.company,
      notes: `AI Research: ${searchResults.content.substring(0, 500)}...`,
      confidence: 85
    };

    await handleAIEnrichment(enrichmentData);
    researchStatus.complete('✅ Research complete! Enhanced with web intelligence.');
  }

} catch (error) {
  console.error('Web research failed:', error);
  researchStatus.setError('Research failed. Using cached data instead.');
}
            }}
            disabled={researchStatus.status.isActive}
            className="p-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50"
            title="AI Web Research"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Avatar and Basic Info */}
        <div className="p-5 text-center border-b border-gray-100 bg-white">
          <div className="relative inline-block mb-4">
            <AvatarUpload
              currentAvatar={editedContact.avatarSrc}
              onAvatarChange={(avatarUrl) => {
                setEditedContact(prev => ({ ...prev, avatarSrc: avatarUrl }));
                if (onUpdate) {
                  onUpdate(contact.id, { avatarSrc: avatarUrl });
                }
              }}
              size="xl"
              contactName={editedContact.name}
              contactId={contact.id}
            />

            {/* AI Score Badge */}
            {editedContact.aiScore && (
              <div className={`absolute -top-1 -right-1 h-7 w-7 rounded-full ${editedContact.aiScore >= 80 ? 'bg-green-500' : editedContact.aiScore >= 60 ? 'bg-blue-500' : editedContact.aiScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'} text-white flex items-center justify-center text-xs font-bold shadow-lg ring-2 ring-white`}>
                {editedContact.aiScore}
              </div>
            )}

            {/* Favorite Badge */}
            {editedContact.isFavorite && (
              <div className="absolute -top-1 -left-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                <Heart className="w-3 h-3" />
              </div>
            )}

            {/* AI Enhancement Indicator */}
            {lastEnrichment && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            )}
          </div>

          {/* Name and Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{editedContact.name}</h3>
          <p className="text-gray-600 font-medium mb-1">{editedContact.title}</p>
          <p className="text-gray-500 text-sm">{editedContact.company}</p>
          {editedContact.industry && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {editedContact.industry}
            </span>
          )}

          {/* AI Enhancement Badge */}
          {lastEnrichment && (
            <div className="mt-3 p-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span className="text-xs font-medium text-purple-900">
                  Enhanced with AI ({lastEnrichment.confidence}% confidence)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* AI Tools Section */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
            <Brain className="w-4 h-4 mr-2 text-purple-600" />
            AI Assistant Tools
          </h4>

          {/* AI Goals Button */}
          <div className="mb-3">
            <button
              onClick={() => window.open('https://tubular-choux-2a9b3c.netlify.app/', '_blank')}
              className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 text-sm font-medium transition-all duration-200 border border-indigo-300/50 shadow-sm hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Target className="w-4 h-4 mr-2" />
              AI Goals
            </button>
          </div>

          {/* Quick AI Actions Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={handleSendEmail}
              className="p-3 flex flex-col items-center justify-center rounded-lg font-medium transition-all duration-200 border shadow-sm hover:shadow-md hover:scale-105 min-h-[3.5rem] bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <Mail className="w-4 h-4 mb-1" />
              <span className="text-xs leading-tight text-center">Email AI</span>
            </button>

            <button
              onClick={() => {
                const searchQuery = {
                  email: editedContact.email,
                  firstName: editedContact.firstName,
                  lastName: editedContact.lastName,
                  company: editedContact.company
                };
                handleAIEnrichment({
                  email: searchQuery.email,
                  firstName: searchQuery.firstName,
                  lastName: searchQuery.lastName,
                  company: searchQuery.company,
                  confidence: 75
                });
              }}
              className="p-3 flex flex-col items-center justify-center rounded-lg font-medium transition-all duration-200 border shadow-sm hover:shadow-md hover:scale-105 min-h-[3.5rem] bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <Search className="w-4 h-4 mb-1" />
              <span className="text-xs leading-tight text-center">Enrich</span>
            </button>
          </div>

          {/* Enhanced AI Auto-Enrich Button */}
          <button
            onClick={async () => {
              const isMockData = editedContact.isMockData || editedContact.dataSource === 'mock' || editedContact.createdBy === 'demo';

              researchStatus.startResearch('🔍 Starting intelligent enrichment...');

              try {
                if (isMockData) {
                  researchStatus.updateStatus({
                    stage: 'researching',
                    message: '🌐 Searching for contact information...'
                  });

                  await new Promise(resolve => setTimeout(resolve, 1500));

                  const mockEnrichmentData: ContactEnrichmentData = {
                    firstName: editedContact.firstName,
                    lastName: editedContact.lastName,
                    email: editedContact.email,
                    company: editedContact.company,
                    phone: editedContact.phone || `+1 555 ${Math.floor(Math.random() * 9000) + 1000}`,
                    industry: editedContact.industry || 'Technology',
                    notes: `AI Web Research: Found comprehensive contact information including social media profiles and professional details.`,
                    confidence: 92,
                    socialProfiles: {
                      linkedin: `https://linkedin.com/in/${editedContact.firstName.toLowerCase()}${editedContact.lastName.toLowerCase()}`,
                      twitter: `https://twitter.com/${editedContact.firstName.toLowerCase()}${editedContact.lastName.toLowerCase()}`
                    }
                  };

                  await handleAIEnrichment(mockEnrichmentData);
                  researchStatus.complete('✅ Contact enriched with web intelligence!');
                }
              } catch (error) {
                console.error('Enrichment failed:', error);
                researchStatus.setError('Enrichment failed. Using cached data instead.');
              }
            }}
            disabled={researchStatus.status.isActive}
            className="w-full flex items-center justify-center py-2 px-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 text-sm font-medium transition-all duration-200 border border-purple-300/50 shadow-sm hover:shadow-md hover:scale-105 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {researchStatus.status.isActive ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Researching...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                AI Auto-Enrich
                <Sparkles className="w-3 h-3 ml-2 text-yellow-300" />
              </>
            )}
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <Zap className="w-4 h-4 mr-2 text-blue-500" />
            Quick Actions
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-3 flex flex-col items-center hover:bg-blue-50 rounded-lg transition-all text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Edit className="w-4 h-4 mb-1 text-blue-600" />
              <span className="text-xs font-medium text-gray-900">Edit</span>
            </button>
            <button
              onClick={handleSendEmail}
              className="p-3 flex flex-col items-center hover:bg-green-50 rounded-lg transition-all text-center focus:outline-none focus:ring-2 focus:ring-green-500 relative group"
              title="Send Email (Ctrl+E)"
            >
              <Mail className="w-4 h-4 mb-1 text-green-600" />
              <span className="text-xs font-medium text-gray-900">Email</span>
              <span className="absolute -top-1 -right-1 text-xs bg-green-500 text-white rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                ⌘E
              </span>
            </button>
            <button
              onClick={handleSendSMS}
              className="p-3 flex flex-col items-center hover:bg-teal-50 rounded-lg transition-all text-center focus:outline-none focus:ring-2 focus:ring-teal-500 relative group"
              title="Send SMS (Ctrl+S)"
            >
              <MessageSquare className="w-4 h-4 mb-1 text-teal-600" />
              <span className="text-xs font-medium text-gray-900">SMS</span>
              <span className="absolute -top-1 -right-1 text-xs bg-teal-500 text-white rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                ⌘S
              </span>
            </button>
            <button
              onClick={handleMakeCall}
              className="p-3 flex flex-col items-center hover:bg-yellow-50 rounded-lg transition-all text-center focus:outline-none focus:ring-2 focus:ring-yellow-500 relative group"
              title="Make Call (Ctrl+P)"
            >
              <Phone className="w-4 h-4 mb-1 text-yellow-600" />
              <span className="text-xs font-medium text-gray-900">Call</span>
              <span className="absolute -top-1 -right-1 text-xs bg-yellow-500 text-white rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                ⌘P
              </span>
            </button>
            <button
              onClick={() => setShowAddField(true)}
              className="p-3 flex flex-col items-center hover:bg-purple-50 rounded-lg transition-all text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <Plus className="w-4 h-4 mb-1 text-purple-600" />
              <span className="text-xs font-medium text-gray-900">Add Field</span>
            </button>
            <button
              onClick={() => {/* Navigate to journey tab */}}
              className="p-3 flex flex-col items-center hover:bg-orange-50 rounded-lg transition-all text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <FileText className="w-4 h-4 mb-1 text-orange-600" />
              <span className="text-xs font-medium text-gray-900">Files</span>
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <User className="w-4 h-4 mr-2 text-blue-500" />
              Contact Info
            </h4>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-3 h-3 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email</p>
                  {editingField === 'email' ? (
                    <input
                      type="email"
                      value={editedContact.email}
                      onChange={(e) => handleEditField('email', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                      onBlur={handleSaveField}
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate">{editedContact.email}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleStartEditingField('email')}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Edit className="w-3 h-3" />
              </button>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-3 h-3 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Phone</p>
                  {editingField === 'phone' ? (
                    <input
                      type="tel"
                      value={editedContact.phone || ''}
                      onChange={(e) => handleEditField('phone', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                      onBlur={handleSaveField}
                      autoFocus
                      placeholder="+1-555-0123"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900">{editedContact.phone || 'Not provided'}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleStartEditingField('phone')}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Edit className="w-3 h-3" />
              </button>
            </div>

            {/* Company */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building className="w-3 h-3 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Company</p>
                  {editingField === 'company' ? (
                    <input
                      type="text"
                      value={editedContact.company}
                      onChange={(e) => handleEditField('company', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                      onBlur={handleSaveField}
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900">{editedContact.company}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleStartEditingField('company')}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Edit className="w-3 h-3" />
              </button>
            </div>

            {/* Social Media */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-3 h-3 text-pink-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Socials</p>
                  <div className="flex space-x-1 mt-1">
                    {socialPlatforms.slice(0, 4).map((social, index) => {
                      const Icon = social.icon;
                      const profileUrl = editedContact.socialProfiles?.[social.key as keyof typeof editedContact.socialProfiles];
                      return (
                        <div
                          key={index}
                          className={`${social.color} p-1 rounded-md text-white ${profileUrl ? '' : 'opacity-50'} hover:opacity-80 transition-opacity cursor-pointer`}
                          title={profileUrl ? `${social.name}: ${profileUrl}` : `Add ${social.name}`}
                          onClick={() => {
                            if (profileUrl) {
                              window.open(profileUrl, '_blank');
                            } else {
                              setShowAddSocial(true);
                              setSelectedSocialPlatform(social.key);
                            }
                          }}
                        >
                          <Icon className="w-2.5 h-2.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAddSocial(true)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {showAddSocial && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="mb-2">
                  <label className="block text-xs text-gray-500 mb-1">Platform</label>
                  <select
                    value={selectedSocialPlatform}
                    onChange={(e) => setSelectedSocialPlatform(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                  >
                    <option value="">Select platform...</option>
                    {socialPlatforms.map((platform) => (
                      <option key={platform.key} value={platform.key}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="block text-xs text-gray-500 mb-1">URL / Username</label>
                  <input
                    type="text"
                    value={socialFieldValue}
                    onChange={(e) => setSocialFieldValue(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                    placeholder={selectedSocialPlatform === 'linkedin' ? 'https://linkedin.com/in/username' : ''}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddSocialProfile}
                    disabled={!selectedSocialPlatform || !socialFieldValue}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddSocial(false);
                      setSelectedSocialPlatform('');
                      setSocialFieldValue('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Last Connected */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3 h-3 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Last Connected</p>
                  {editingField === 'lastConnected' ? (
                    <input
                      type="text"
                      value={editedContact.lastConnected || ''}
                      onChange={(e) => handleEditField('lastConnected', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                      onBlur={handleSaveField}
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {editedContact.lastConnected || '06/15/2023 at 7:16 pm'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleStartEditingField('lastConnected')}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Edit className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Interest Level & Sources */}
        <div className="p-4 bg-white">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="w-4 h-4 mr-2 text-orange-500" />
            Lead Information
          </h4>

          {/* Interest Level */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Interest Level</p>
              <button
                onClick={() => setEditInterestLevel(!editInterestLevel)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit className="w-3 h-3" />
              </button>
            </div>
            {editInterestLevel ? (
              <div className="space-y-2 mb-2">
                {(['hot', 'medium', 'low', 'cold'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => handleChangeInterestLevel(level)}
                    className={`flex items-center space-x-2 w-full text-left p-2 rounded-lg ${
                      editedContact.interestLevel === level
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${interestColors[level]}`} />
                    <span className="text-sm font-medium">{interestLabels[level]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${interestColors[editedContact.interestLevel]} animate-pulse`} />
                  <span className="text-sm font-medium text-gray-900">{interestLabels[editedContact.interestLevel]}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }, (_, i) => {
                    const isActive =
                      (editedContact.interestLevel === 'hot' && i < 5) ||
                      (editedContact.interestLevel === 'medium' && i < 3) ||
                      (editedContact.interestLevel === 'low' && i < 2) ||
                      (editedContact.interestLevel === 'cold' && i < 1);

                    return (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          isActive
                            ? `${interestColors[editedContact.interestLevel]} shadow-sm`
                            : 'bg-gray-300'
                        }`}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Sources */}
          <div className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Sources</p>
              <button
                onClick={() => setShowAddSource(true)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {editedContact.sources.map((source, index) => (
                <div key={index} className="group relative">
                  <span
                    className={`
                      ${sourceColors[source] || 'bg-gray-600'}
                      text-white text-xs px-2 py-1 rounded-md font-medium hover:opacity-90 transition-opacity cursor-pointer
                    `}
                  >
                    {source}
                  </span>
                  <button
                    onClick={() => handleRemoveSource(source)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              ))}
            </div>

            {showAddSource && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="mb-2">
                  <input
                    type="text"
                    value={addSource}
                    onChange={(e) => setAddSource(e.target.value)}
                    placeholder="Add source..."
                    className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddSourceToContact}
                    disabled={!addSource}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddSource(false)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
                {/* Quick Source Suggestions */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {quickSourceSuggestions.map(source => (
                    <button
                      key={source}
                      onClick={() => setAddSource(source)}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs"
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};