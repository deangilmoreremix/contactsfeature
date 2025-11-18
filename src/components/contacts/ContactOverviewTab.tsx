import React, { memo } from 'react';
import { AvatarUpload } from '../ui/AvatarUpload';
import { Contact } from '../../types/contact';
import { ContactEnrichmentData } from '../../services/aiEnrichmentService';
import { socialPlatforms } from '../../constants/contactConstants';
import {
  User, Building, Tag, Activity, Database, Globe,
  Edit, Sparkles
} from 'lucide-react';

interface ContactOverviewTabProps {
  contact: Contact;
  isEditing: boolean;
  editingField: string | null;
  onEditField: (field: string, value: any) => void;
  onStartEditingField: (field: string) => void;
  onSaveField: () => void;
  onUpdate?: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  lastEnrichment: ContactEnrichmentData | null;
}

export const ContactOverviewTab: React.FC<ContactOverviewTabProps> = memo(({
  contact,
  isEditing,
  editingField,
  onEditField,
  onStartEditingField,
  onSaveField,
  onUpdate,
  lastEnrichment
}) => {
  const personalInfoFields = [
    { label: 'First Name', value: contact.firstName || contact.name.split(' ')[0], icon: User, field: 'firstName' },
    { label: 'Last Name', value: contact.lastName || contact.name.split(' ').slice(1).join(' '), icon: User, field: 'lastName' },
    { label: 'Email', value: contact.email, icon: User, field: 'email' },
    { label: 'Phone', value: contact.phone || 'Not provided', icon: User, field: 'phone' },
    { label: 'Title', value: contact.title, icon: Building, field: 'title' },
    { label: 'Company', value: contact.company, icon: Building, field: 'company' },
    { label: 'Industry', value: contact.industry || 'Not specified', icon: Tag, field: 'industry' },
    { label: 'Status', value: contact.status, icon: Activity, field: 'status' }
  ];

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
            onClick={() => {/* Toggle editing */}}
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personalInfoFields.map((field, index) => {
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
                        value={contact[field.field as keyof Contact] as string || ''}
                        onChange={(e) => onEditField(field.field, e.target.value)}
                        onBlur={() => editingField === field.field && onSaveField()}
                        className="text-gray-900 bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus={editingField === field.field}
                      />
                    ) : (
                      <p className="text-gray-900">{field.value}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onStartEditingField(field.field)}
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
            onClick={() => {/* Add social profile */}}
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {socialPlatforms.map((platform, index) => {
            const Icon = platform.icon;
            const profileUrl = contact.socialProfiles?.[platform.key as keyof typeof contact.socialProfiles];

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
                      value={contact.socialProfiles?.[platform.key as keyof typeof contact.socialProfiles] || ''}
                      onChange={(e) => {
                        const socialProfiles = {
                          ...(contact.socialProfiles || {}),
                          [platform.key]: e.target.value
                        };
                        onEditField('socialProfiles', socialProfiles);
                      }}
                      onBlur={onSaveField}
                      className="w-full text-xs border border-gray-300 rounded-md px-2 py-1"
                      autoFocus
                    />
                  ) : profileUrl ? (
                    <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                      View Profile
                    </a>
                  ) : (
                    <button
                      onClick={() => {/* Add social profile */}}
                      className="text-xs text-gray-500 hover:text-blue-600"
                    >
                      Add {platform.name}
                    </button>
                  )}
                </div>
                {profileUrl && (
                  <button
                    onClick={() => onStartEditingField(`social_${platform.key}`)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Fields */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Database className="w-5 h-5 mr-2 text-purple-500" />
            Custom Fields
          </h4>
          <button
            onClick={() => {/* Add custom field */}}
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        {contact.customFields && Object.keys(contact.customFields).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(contact.customFields).map(([key, value], index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-700">{key}</p>
                  {editingField === `custom_${key}` ? (
                    <input
                      type="text"
                      value={String(contact.customFields?.[key] || '')}
                      onChange={(e) => {
                        const customFields = {
                          ...(contact.customFields || {}),
                          [key]: e.target.value
                        };
                        onEditField('customFields', customFields);
                      }}
                      onBlur={onSaveField}
                      className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                      autoFocus
                    />
                  ) : (
                    <p className="text-gray-900">{String(value)}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onStartEditingField(`custom_${key}`)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {/* Remove custom field */}}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No custom fields added</p>
        )}
      </div>
    </div>
  );
});