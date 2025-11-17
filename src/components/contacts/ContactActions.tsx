import React, { memo, useState } from 'react';
import { Edit, MoreHorizontal, Mail, Phone, User } from 'lucide-react';
import { Contact } from '../../types';
import { ModernButton } from '../ui/ModernButton';

interface ContactActionsProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onEmail?: () => void;
  onCall?: () => void;
  onView?: () => void;
  onExport?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  visible?: boolean;
  variant?: 'minimal' | 'full';
}

export const ContactActions: React.FC<ContactActionsProps> = memo(({
  contact,
  onEdit,
  onEmail,
  onCall,
  onView,
  onExport,
  onDuplicate,
  onArchive,
  onDelete,
  visible = false,
  variant = 'full'
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${visible ? 'opacity-100' : ''}`}>
        {onEdit && (
          <button
            data-testid="edit-contact-button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(contact);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit contact"
          >
            <Edit className="w-3 h-3" />
          </button>
        )}

        <div className="relative">
          <button
            data-testid="more-actions-button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="More actions"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>

          {showMenu && (
            <div className="absolute top-full right-0 mt-2 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl min-w-48">
              <div className="py-2">
                {onExport && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(onExport);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Export Contact
                  </button>
                )}

                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Create a duplicate of this contact?')) {
                        handleAction(onDuplicate);
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Duplicate Contact
                  </button>
                )}

                {onArchive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Archive this contact?')) {
                        handleAction(onArchive);
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Archive Contact
                  </button>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
                        handleAction(onDelete);
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Delete Contact
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full variant with action buttons
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEmail?.();
        }}
        className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full hover:from-blue-100 hover:to-blue-200 text-xs font-medium transition-all duration-200 border border-blue-200/50 shadow-sm"
      >
        <Mail className="w-3 h-3 mr-1" /> Email
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onCall?.();
        }}
        className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-full hover:from-green-100 hover:to-green-200 text-xs font-medium transition-all duration-200 border border-green-200/50 shadow-sm"
      >
        <Phone className="w-3 h-3 mr-1" /> Call
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onView?.();
        }}
        className="flex items-center justify-center py-1.5 px-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-full hover:from-purple-100 hover:to-purple-200 text-xs font-medium transition-all duration-200 border border-purple-200/50 shadow-sm"
      >
        <User className="w-3 h-3 mr-1" /> View
      </button>
    </div>
  );
});

ContactActions.displayName = 'ContactActions';