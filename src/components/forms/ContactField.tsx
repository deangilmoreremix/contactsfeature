import React, { useState, useCallback, memo } from 'react';
import { Contact } from '../../types/contact';
import { Edit, Check, X, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message: string;
}

export interface ContactFieldProps {
  field: keyof Contact;
  value: any;
  onChange: (value: any) => void;
  onSave: () => Promise<void>;
  isEditing: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  validation: ValidationRule[];
  type?: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }> | undefined;
  className?: string;
  disabled: boolean;
  required: boolean;
}

const ContactFieldComponent: React.FC<ContactFieldProps> = ({
  field,
  value,
  onChange,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit,
  validation = [],
  type = 'text',
  options = [],
  placeholder,
  label,
  icon: Icon,
  className,
  disabled = false,
  required = false
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local value when prop value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const validateValue = useCallback((val: any): string | null => {
    for (const rule of validation) {
      if (rule.required && (!val || val.toString().trim() === '')) {
        return rule.message;
      }
      if (rule.pattern && val && !rule.pattern.test(val)) {
        return rule.message;
      }
      if (rule.custom && !rule.custom(val)) {
        return rule.message;
      }
    }
    return null;
  }, [validation]);

  const handleLocalChange = useCallback((newValue: any) => {
    setLocalValue(newValue);
    onChange(newValue);
    setError(null);
  }, [onChange]);

  const handleSave = useCallback(async () => {
    const validationError = validateValue(localValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [localValue, validateValue, onSave]);

  const handleCancel = useCallback(() => {
    setLocalValue(value);
    setError(null);
    onCancelEdit?.();
  }, [value, onCancelEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const renderInput = () => {
    const commonProps = {
      value: localValue || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        handleLocalChange(e.target.value),
      onKeyDown: handleKeyDown,
      placeholder,
      disabled: disabled || isSaving,
      className: clsx(
        'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors',
        error
          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
        disabled && 'bg-gray-100 cursor-not-allowed',
        type === 'textarea' && 'resize-none min-h-[80px]'
      ),
      'aria-invalid': !!error,
      'aria-describedby': error ? `${field}-error` : undefined
    };

    switch (type) {
      case 'textarea':
        return <textarea {...commonProps} rows={3} />;
      case 'select':
        return (
          <select {...commonProps}>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return <input {...commonProps} type={type} />;
    }
  };

  return (
    <div className={clsx('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            {Icon && <Icon className="w-4 h-4 mr-2" />}
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {!isEditing && !disabled && (
            <button
              onClick={onStartEdit}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={`Edit ${label}`}
            >
              <Edit className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div className="relative">
        {isEditing ? (
          <div className="space-y-2">
            {renderInput()}

            {error && (
              <div className="flex items-center text-sm text-red-600" id={`${field}-error`}>
                <AlertCircle className="w-4 h-4 mr-1" />
                {error}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Check className="w-3 h-3 mr-1" />
                )}
                Save
              </button>

              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {Icon && !label && <Icon className="w-4 h-4 mr-2 inline" />}
              <span className="text-gray-900 break-words">
                {value || <span className="text-gray-400 italic">Not provided</span>}
              </span>
            </div>

            {!disabled && (
              <button
                onClick={onStartEdit}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`Edit ${label || field}`}
              >
                <Edit className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ContactField = memo(ContactFieldComponent);
ContactField.displayName = 'ContactField';