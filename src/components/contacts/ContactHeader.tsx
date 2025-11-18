import React, { memo, useCallback } from 'react';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { contactTabs } from '../../constants/contactConstants';
import {
  X, Edit, Save, Ambulance as Cancel, Heart, HeartOff
} from 'lucide-react';

interface ContactHeaderProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  contact: Contact;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onToggleFavorite: () => void;
  onClose: () => void;
}

export const ContactHeader: React.FC<ContactHeaderProps> = memo(({
  activeTab,
  onTabChange,
  contact,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onToggleFavorite,
  onClose
}) => {
  const handleTabChange = useCallback((tabId: string) => {
    onTabChange(tabId);
  }, [onTabChange]);

  const handleEdit = useCallback(() => {
    onEdit();
  }, [onEdit]);

  const handleSave = useCallback(() => {
    onSave();
  }, [onSave]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite();
  }, [onToggleFavorite]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  return (
    <div className="border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center justify-between p-5">
        <div className="flex space-x-1">
          {contactTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                data-testid={`${tab.id}-tab`}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-3">
          <ModernButton
            variant={contact.isFavorite ? "primary" : "outline"}
            size="sm"
            onClick={handleToggleFavorite}
            className="flex items-center space-x-2"
          >
            {contact.isFavorite ? <Heart className="w-4 h-4" /> : <HeartOff className="w-4 h-4" />}
            <span>{contact.isFavorite ? 'Favorited' : 'Add to Favorites'}</span>
          </ModernButton>

          {isEditing ? (
            <div className="flex items-center space-x-2">
              <ModernButton
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={isSaving}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </ModernButton>
              <ModernButton
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex items-center space-x-2"
              >
                <Cancel className="w-4 h-4" />
                <span>Cancel</span>
              </ModernButton>
            </div>
          ) : (
            <ModernButton
              data-testid="modal-edit-contact-button"
              variant="primary"
              size="sm"
              onClick={handleEdit}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Contact</span>
            </ModernButton>
          )}

          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};