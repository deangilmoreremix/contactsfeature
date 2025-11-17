import React, { memo } from 'react';
import { Contact } from '../../types/contact';
import clsx from 'clsx';
import { ContactField, ValidationRule } from './ContactField';
import { Loader2 } from 'lucide-react';

export interface ContactFieldConfig {
  field: keyof Contact;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  validation?: ValidationRule[];
  required?: boolean;
  disabled?: boolean;
}

export interface ContactFormSectionProps {
  title: string;
  fields: ContactFieldConfig[];
  contact: Contact;
  editedContact: Contact;
  onFieldChange: (field: keyof Contact, value: any) => void;
  onFieldSave: (field: keyof Contact) => Promise<void>;
  editingFields: Set<string>;
  onStartEditing: (field: string) => void;
  onCancelEditing: (field: string) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

const ContactFormSectionComponent: React.FC<ContactFormSectionProps> = ({
  title,
  fields,
  contact,
  editedContact,
  onFieldChange,
  onFieldSave,
  editingFields,
  onStartEditing,
  onCancelEditing,
  isLoading = false,
  error = null,
  className,
  collapsible = false,
  defaultExpanded = true,
  icon: Icon
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const handleFieldChange = React.useCallback((field: keyof Contact, value: any) => {
    onFieldChange(field, value);
  }, [onFieldChange]);

  const handleFieldSave = React.useCallback(async (field: keyof Contact) => {
    await onFieldSave(field);
  }, [onFieldSave]);

  if (collapsible) {
    return (
      <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          aria-expanded={isExpanded}
          aria-controls={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center">
            {Icon && <Icon className="w-5 h-5 mr-3 text-blue-500" />}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className={clsx(
            'transform transition-transform duration-200',
            isExpanded ? 'rotate-180' : ''
          )}>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isExpanded && (
          <div
            id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
            className="px-4 pb-4"
          >
            <FormSectionContent
              fields={fields}
              contact={contact}
              editedContact={editedContact}
              onFieldChange={handleFieldChange}
              onFieldSave={handleFieldSave}
              editingFields={editingFields}
              onStartEditing={onStartEditing}
              onCancelEditing={onCancelEditing}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('bg-white rounded-xl p-6 shadow-sm border border-gray-200', className)}>
      <div className="flex items-center mb-4">
        {Icon && <Icon className="w-5 h-5 mr-3 text-blue-500" />}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {isLoading && (
          <Loader2 className="w-4 h-4 ml-2 animate-spin text-blue-500" />
        )}
      </div>

      <FormSectionContent
        fields={fields}
        contact={contact}
        editedContact={editedContact}
        onFieldChange={handleFieldChange}
        onFieldSave={handleFieldSave}
        editingFields={editingFields}
        onStartEditing={onStartEditing}
        onCancelEditing={onCancelEditing}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
};

interface FormSectionContentProps {
  fields: ContactFieldConfig[];
  contact: Contact;
  editedContact: Contact;
  onFieldChange: (field: keyof Contact, value: any) => void;
  onFieldSave: (field: keyof Contact) => Promise<void>;
  editingFields: Set<string>;
  onStartEditing: (field: string) => void;
  onCancelEditing: (field: string) => void;
  isLoading: boolean;
  error: string | null;
}

const FormSectionContent: React.FC<FormSectionContentProps> = ({
  fields,
  contact,
  editedContact,
  onFieldChange,
  onFieldSave,
  editingFields,
  onStartEditing,
  onCancelEditing,
  isLoading,
  error
}) => {
  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {fields.map((fieldConfig) => (
        <ContactField
          key={fieldConfig.field}
          field={fieldConfig.field}
          value={editedContact[fieldConfig.field]}
          onChange={(value) => onFieldChange(fieldConfig.field, value)}
          onSave={() => onFieldSave(fieldConfig.field)}
          isEditing={editingFields.has(fieldConfig.field)}
          onStartEdit={() => onStartEditing(fieldConfig.field)}
          onCancelEdit={() => onCancelEditing(fieldConfig.field)}
          validation={fieldConfig.validation || []}
          type={fieldConfig.type || 'text'}
          options={fieldConfig.options || []}
          placeholder={fieldConfig.placeholder || ''}
          label={fieldConfig.label}
          icon={fieldConfig.icon}
          disabled={isLoading || (fieldConfig.disabled ?? false)}
          required={fieldConfig.required ?? false}
          className="group"
        />
      ))}
    </div>
  );
};

export const ContactFormSection = memo(ContactFormSectionComponent);
ContactFormSection.displayName = 'ContactFormSection';