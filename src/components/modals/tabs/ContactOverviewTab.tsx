import React, { memo } from 'react';
import { Contact } from '../../../types';
import { AvatarUpload } from '../../ui/AvatarUpload';
import { ModernButton } from '../../ui/ModernButton';
import { ContactEnrichmentData } from '../../../services/aiEnrichmentService';
import { contactService } from '../../../services/contactService';
import {
  User,
  Mail,
  Phone,
  Building,
  Tag,
  Activity,
  Database,
  Globe,
  Plus,
  Edit,
  X,
  Sparkles
} from 'lucide-react';

interface ContactOverviewTabProps {
  contact: Contact;
  editedContact: Contact;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  editingField: string | null;
  setEditingField: (field: string | null) => void;
  handleEditField: (field: string, value: any) => void;
  handleSaveField: () => Promise<void>;
  handleAddCustomField: () => Promise<void>;
  handleRemoveCustomField: (fieldName: string) => Promise<void>;
  handleAddSocialProfile: () => void;
  newFieldName: string;
  setNewFieldName: (name: string) => void;
  newFieldValue: string;
  setNewFieldValue: (value: string) => void;
  showAddField: boolean;
  setShowAddField: (show: boolean) => void;
  showAddSocial: boolean;
  setShowAddSocial: (show: boolean) => void;
  selectedSocialPlatform: string;
  setSelectedSocialPlatform: (platform: string) => void;
  socialFieldValue: string;
  setSocialFieldValue: (value: string) => void;
  lastEnrichment?: ContactEnrichmentData | null;
}

const socialPlatforms = [
  { icon: Globe, color: 'bg-green-500', name: 'WhatsApp', key: 'whatsapp' },
  { icon: Globe, color: 'bg-blue-500', name: 'LinkedIn', key: 'linkedin' },
  { icon: Mail, color: 'bg-blue-600', name: 'Email', key: 'email' },
  { icon: Globe, color: 'bg-blue-400', name: 'Twitter', key: 'twitter' },
  { icon: Globe, color: 'bg-blue-700', name: 'Facebook', key: 'facebook' },
  { icon: Globe, color: 'bg-pink-500', name: 'Instagram', key: 'instagram' },
];

export const ContactOverviewTab: React.FC<ContactOverviewTabProps> = memo(({
  contact,
  editedContact,
  isEditing,
  setIsEditing,
  editingField,
  setEditingField,
  handleEditField,
  handleSaveField,
  handleAddCustomField,
  handleRemoveCustomField,
  handleAddSocialProfile,
  newFieldName,
  setNewFieldName,
  newFieldValue,
  setNewFieldValue,
  showAddField,
  setShowAddField,
  showAddSocial,
  setShowAddSocial,
  selectedSocialPlatform,
  setSelectedSocialPlatform,
  socialFieldValue,
  setSocialFieldValue,
  lastEnrichment
}) => {
  const handleStartEditingField = (field: string) => {
    setEditingField(field);
  };

  return (
    <div className="p-6 space-y-6">
      {/* AI Enhancement Notice */}
      {lastEnrichment && (
        <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-900">Contact Enhanced with AI Research</h4>
              <p className="text-purple-700 text-sm">
                This contact was enriched with additional information from OpenAI & Gemini research
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-500" />
            Personal Information
          </h4>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'First Name', value: editedContact.firstName || editedContact.name.split(' ')[0], icon: User, field: 'firstName' },
            { label: 'Last Name', value: editedContact.lastName || editedContact.name.split(' ').slice(1).join(' '), icon: User, field: 'lastName' },
            { label: 'Email', value: editedContact.email, icon: Mail, field: 'email' },
            { label: 'Phone', value: editedContact.phone || 'Not provided', icon: Phone, field: 'phone' },
            { label: 'Title', value: editedContact.title, icon: Building, field: 'title' },
            { label: 'Company', value: editedContact.company, icon: Building, field: 'company' },
            { label: 'Industry', value: editedContact.industry || 'Not specified', icon: Tag, field: 'industry' },
            { label: 'Status', value: editedContact.status, icon: Activity, field: 'status' }
          ].map((field, index) => {
            const Icon = field.icon;
            return (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{field.label}</p>
                    {isEditing || editingField === field.field ? (
                      <input
                        type="text"
                        value={editedContact[field.field as keyof Contact] as string || ''}
                        onChange={(e) => handleEditField(field.field, e.target.value)}
                        onBlur={() => editingField === field.field && handleSaveField()}
                        className="text-gray-900 bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus={editingField === field.field}
                      />
                    ) : (
                      <p className="text-gray-900">{field.value}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleStartEditingField(field.field)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Social Profiles */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-green-500" />
            Social Profiles & AI Research
          </h4>
          <button
            onClick={() => setShowAddSocial(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {socialPlatforms.map((platform, index) => {
            const Icon = platform.icon;
            const profileUrl = editedContact.socialProfiles?.[platform.key as keyof typeof editedContact.socialProfiles];

            return (
              <div key={index} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`${platform.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{platform.name}</p>
                  {editingField === `social_${platform.key}` ? (
                    <input
                      type="text"
                      value={editedContact.socialProfiles?.[platform.key as keyof typeof editedContact.socialProfiles] || ''}
                      onChange={(e) => {
                        const socialProfiles = {
                          ...(editedContact.socialProfiles || {}),
                          [platform.key]: e.target.value
                        };
                        handleEditField('socialProfiles', socialProfiles);
                      }}
                      onBlur={handleSaveField}
                      className="w-full text-xs border border-gray-300 rounded-md px-2 py-1"
                      autoFocus
                    />
                  ) : profileUrl ? (
                    <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                      View Profile
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        setShowAddSocial(true);
                        setSelectedSocialPlatform(platform.key);
                      }}
                      className="text-xs text-gray-500 hover:text-blue-600"
                    >
                      Add {platform.name}
                    </button>
                  )}
                </div>
                {profileUrl && (
                  <button
                    onClick={() => handleStartEditingField(`social_${platform.key}`)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Social Profile Modal */}
        {showAddSocial && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-3">
              <select
                value={selectedSocialPlatform}
                onChange={(e) => setSelectedSocialPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Platform</option>
                {socialPlatforms.map(platform => (
                  <option key={platform.key} value={platform.key}>{platform.name}</option>
                ))}
              </select>
              <input
                type="url"
                placeholder="Profile URL"
                value={socialFieldValue}
                onChange={(e) => setSocialFieldValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex space-x-3">
                <ModernButton
                  variant="primary"
                  size="sm"
                  onClick={handleAddSocialProfile}
                  disabled={!selectedSocialPlatform || !socialFieldValue}
                >
                  Add Profile
                </ModernButton>
                <ModernButton
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSocial(false)}
                >
                  Cancel
                </ModernButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Fields */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Database className="w-5 h-5 mr-2 text-purple-500" />
            Custom Fields
          </h4>
          <button
            onClick={() => setShowAddField(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {editedContact.customFields && Object.keys(editedContact.customFields).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(editedContact.customFields).map(([key, value], index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-700">{key}</p>
                  {editingField === `custom_${key}` ? (
                    <input
                      type="text"
                      value={String(editedContact.customFields?.[key] || '')}
                      onChange={(e) => {
                        const customFields = {
                          ...(editedContact.customFields || {}),
                          [key]: e.target.value
                        };
                        handleEditField('customFields', customFields);
                      }}
                      onBlur={handleSaveField}
                      className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                      autoFocus
                    />
                  ) : (
                    <p className="text-gray-900">{String(value)}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleStartEditingField(`custom_${key}`)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveCustomField(key)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No custom fields added</p>
        )}

        {showAddField && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Field name"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Field value"
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex space-x-3">
                <ModernButton
                  variant="primary"
                  size="sm"
                  onClick={handleAddCustomField}
                  disabled={!newFieldName || !newFieldValue}
                >
                  Add Field
                </ModernButton>
                <ModernButton
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddField(false)}
                >
                  Cancel
                </ModernButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});