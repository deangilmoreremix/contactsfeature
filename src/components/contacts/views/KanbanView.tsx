import React, { useState, useEffect } from 'react';
import { Contact } from '../../../types/contact';
import { KanbanColumn } from '../../../types/view';
import { viewPreferencesService } from '../../../services/viewPreferences.service';
import { useContactStore } from '../../../hooks/useContactStore';
import { GlassCard } from '../../ui/GlassCard';
import { ModernButton } from '../../ui/ModernButton';
import {
  GripVertical,
  Settings,
  Plus,
  MoreVertical,
  Star,
  Mail,
  Phone,
  TrendingUp
} from 'lucide-react';
import { logger } from '../../../services/logger.service';

interface KanbanViewProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
}

export function KanbanView({ contacts, onContactClick }: KanbanViewProps) {
  const { updateContact } = useContactStore();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [columnField, setColumnField] = useState<string>('status');
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKanbanConfig();
  }, []);

  const loadKanbanConfig = async () => {
    try {
      setIsLoading(true);
      const config = await viewPreferencesService.getKanbanConfig();

      if (config) {
        setColumns(config.columns);
        setColumnField(config.column_field);
      } else {
        const defaultColumns: KanbanColumn[] = [
          { id: 'lead', title: 'Lead', order: 0, color: '#3B82F6' },
          { id: 'prospect', title: 'Prospect', order: 1, color: '#8B5CF6' },
          { id: 'customer', title: 'Customer', order: 2, color: '#10B981' },
          { id: 'churned', title: 'Churned', order: 3, color: '#EF4444' }
        ];
        setColumns(defaultColumns);
      }
    } catch (error) {
      logger.error('Failed to load Kanban config', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveColumnConfig = async (newColumns: KanbanColumn[]) => {
    try {
      await viewPreferencesService.saveKanbanConfig(columnField, newColumns);
      setColumns(newColumns);
    } catch (error) {
      logger.error('Failed to save Kanban config', error as Error);
    }
  };

  const getContactsForColumn = (columnId: string): Contact[] => {
    return contacts.filter(contact => {
      const fieldValue = contact[columnField as keyof Contact];
      return fieldValue === columnId;
    });
  };

  const handleDragStart = (contact: Contact) => {
    setDraggedContact(contact);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);

    if (!draggedContact) return;

    try {
      await updateContact(draggedContact.id, {
        [columnField]: columnId
      });
      setDraggedContact(null);
    } catch (error) {
      logger.error('Failed to update contact', error as Error);
    }
  };

  const moveColumnUp = (index: number) => {
    if (index === 0) return;
    const newColumns = [...columns];
    [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
    newColumns.forEach((col, idx) => col.order = idx);
    saveColumnConfig(newColumns);
  };

  const moveColumnDown = (index: number) => {
    if (index === columns.length - 1) return;
    const newColumns = [...columns];
    [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
    newColumns.forEach((col, idx) => col.order = idx);
    saveColumnConfig(newColumns);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Kanban Board
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({contacts.length} contacts)
          </span>
        </div>
        <ModernButton
          variant="secondary"
          onClick={() => setShowColumnConfig(!showColumnConfig)}
          icon={Settings}
        >
          Configure Columns
        </ModernButton>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {sortedColumns.map((column, index) => {
          const columnContacts = getContactsForColumn(column.id);
          const isDraggedOver = draggedOverColumn === column.id;

          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <GlassCard className={`h-full flex flex-col transition-all duration-200 ${
                isDraggedOver ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {column.title}
                    </h4>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {columnContacts.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveColumnUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move column up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveColumnDown(index)}
                      disabled={index === columns.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move column down"
                    >
                      ↓
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {columnContacts.map((contact) => (
                    <div
                      key={contact.id}
                      draggable
                      onDragStart={() => handleDragStart(contact)}
                      onDragEnd={() => setDraggedContact(null)}
                      onClick={() => onContactClick(contact)}
                      className="group bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-move hover:border-blue-400"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={contact.avatarSrc}
                            alt={contact.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-semibold text-gray-900 dark:text-white text-sm">
                                {contact.name}
                              </h5>
                              {contact.isFavorite && (
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {contact.title}
                            </p>
                          </div>
                        </div>
                        <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{contact.company}</span>
                        </div>
                        {contact.aiScore && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-blue-500" />
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${contact.aiScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {contact.aiScore}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {contact.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {contact.tags && contact.tags.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{contact.tags.length - 2}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `mailto:${contact.email}`;
                          }}
                          className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Mail className="w-3 h-3" />
                        </button>
                        {contact.phone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${contact.phone}`;
                            }}
                            className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {columnContacts.length === 0 && (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                      <p className="text-sm">No contacts in this column</p>
                      <p className="text-xs mt-1">Drag contacts here to organize</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
