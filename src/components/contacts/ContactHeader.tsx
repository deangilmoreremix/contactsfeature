import React, { memo, useCallback } from 'react';
import { ModernButton } from '../ui/ModernButton';
import { TOOLBAR_ICON_BTN } from './toolbarStyles';
import { Contact } from '../../types/contact';
import {
  X, Edit, Save, Ambulance as Cancel, Heart, HeartOff, ChevronUp, ChevronDown
} from 'lucide-react';
import { useContactTabLayout } from '../../hooks/useContactTabLayout';
import { TabCustomizer, ContactOverflowMenu } from './ContactHeaderMenus';
import type { ContactCommandId } from '../../lib/commands/contactCommands';

const NAV_BTN = `${TOOLBAR_ICON_BTN} text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:pointer-events-none`;

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
  /** Previous / next record in the list the contact was opened from. */
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  /** e.g. "3 / 24"; shown as the tooltip of the previous / next buttons. */
  positionLabel?: string | undefined;
  /** Record actions (duplicate, export, merge, delete...) shown in the "More actions" menu. */
  onRunCommand?: (id: ContactCommandId) => void;
  /** The record is in the Trash (restore / delete permanently instead of delete). */
  isDeleted?: boolean;
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
  onClose,
  onPrev,
  onNext,
  canPrev = false,
  canNext = false,
  positionLabel,
  onRunCommand,
  isDeleted = false
}) => {
  const { orderedTabs, hiddenIds, toggleTab, moveTab, resetTabs } = useContactTabLayout();
  // A hidden tab stays visible while it is the active one (deep link / command menu), so the bar never loses its highlight.
  const shownTabs = orderedTabs.filter((t) => !hiddenIds.includes(t.id) || t.id === activeTab);

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
      <div className="flex flex-col-reverse gap-3 p-5">
        <div className="flex flex-wrap gap-1 min-w-0">
          {shownTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                data-testid={`${tab.id}-tab`}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  h-10 flex items-center space-x-2 px-4 whitespace-nowrap shrink-0 rounded-lg font-medium transition-all duration-200
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
          <TabCustomizer
            tabs={orderedTabs}
            hiddenIds={hiddenIds}
            onToggle={toggleTab}
            onMove={moveTab}
            onReset={resetTabs}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 shrink-0">
          {(onPrev || onNext) && (
            <div className="flex items-center">
              <button
                type="button"
                data-testid="contact-prev-button"
                onClick={onPrev}
                disabled={!canPrev}
                title={`Previous record (K)${positionLabel ? ` • ${positionLabel}` : ''}`}
                aria-label="Previous record"
                className={NAV_BTN}
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                type="button"
                data-testid="contact-next-button"
                onClick={onNext}
                disabled={!canNext}
                title={`Next record (J)${positionLabel ? ` • ${positionLabel}` : ''}`}
                aria-label="Next record"
                className={NAV_BTN}
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          )}
          <ModernButton
            variant={contact.isFavorite ? "primary" : "outline"}
            size="toolbar"
            onClick={handleToggleFavorite}
            disabled={isDeleted}
            className="flex items-center space-x-2"
          >
            {contact.isFavorite ? <Heart className="w-4 h-4" /> : <HeartOff className="w-4 h-4" />}
            <span>{contact.isFavorite ? 'Favorited' : 'Add to Favorites'}</span>
          </ModernButton>

          {isEditing ? (
            <div className="flex items-center space-x-2">
              <ModernButton
                variant="primary"
                size="toolbar"
                onClick={handleSave}
                loading={isSaving}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </ModernButton>
              <ModernButton
                variant="outline"
                size="toolbar"
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
              size="toolbar"
              onClick={handleEdit}
              disabled={isDeleted}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Contact</span>
            </ModernButton>
          )}

          {onRunCommand && <ContactOverflowMenu isDeleted={isDeleted} onRun={onRunCommand} />}

          <button
            onClick={handleClose}
            className={`${TOOLBAR_ICON_BTN} text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
});