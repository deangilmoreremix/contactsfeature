import React, { useState, useEffect } from 'react';
import { Contact } from '../../../types/contact';
import { viewPreferencesService } from '../../../services/viewPreferences.service';
import { GlassCard } from '../../ui/GlassCard';
import { ModernButton } from '../../ui/ModernButton';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings,
  Star,
  CheckSquare,
  Square,
  Download
} from 'lucide-react';
import { logger } from '../../../services/logger.service';

interface TableViewProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
}

interface ColumnDefinition {
  id: string;
  label: string;
  accessor: (contact: Contact) => any;
  sortable: boolean;
  width?: number;
  render?: (value: any, contact: Contact) => React.ReactNode;
}

const allColumns: ColumnDefinition[] = [
  {
    id: 'name',
    label: 'Name',
    accessor: (c) => c.name,
    sortable: true,
    width: 200,
    render: (value, contact) => (
      <div className="flex items-center gap-3">
        <img
          src={contact.avatarSrc}
          alt={contact.name}
          className="w-8 h-8 rounded-full object-cover"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{value}</span>
            {contact.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'email',
    label: 'Email',
    accessor: (c) => c.email,
    sortable: true,
    width: 220
  },
  {
    id: 'company',
    label: 'Company',
    accessor: (c) => c.company,
    sortable: true,
    width: 180
  },
  {
    id: 'title',
    label: 'Title',
    accessor: (c) => c.title,
    sortable: true,
    width: 180
  },
  {
    id: 'status',
    label: 'Status',
    accessor: (c) => c.status,
    sortable: true,
    width: 120,
    render: (value) => {
      const statusColors: Record<string, string> = {
        lead: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        prospect: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        customer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        churned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
      };
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[value] || statusColors.inactive}`}>
          {value}
        </span>
      );
    }
  },
  {
    id: 'interestLevel',
    label: 'Interest',
    accessor: (c) => c.interestLevel,
    sortable: true,
    width: 110,
    render: (value) => {
      const levelColors: Record<string, string> = {
        hot: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        cold: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      };
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${levelColors[value]}`}>
          {value}
        </span>
      );
    }
  },
  {
    id: 'aiScore',
    label: 'AI Score',
    accessor: (c) => c.aiScore || 0,
    sortable: true,
    width: 120,
    render: (value) => (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8">
          {value}
        </span>
      </div>
    )
  },
  {
    id: 'lastConnected',
    label: 'Last Contact',
    accessor: (c) => c.lastConnected || 'Never',
    sortable: true,
    width: 150
  },
  {
    id: 'industry',
    label: 'Industry',
    accessor: (c) => c.industry || '-',
    sortable: true,
    width: 140
  },
  {
    id: 'phone',
    label: 'Phone',
    accessor: (c) => c.phone || '-',
    sortable: false,
    width: 150
  },
  {
    id: 'tags',
    label: 'Tags',
    accessor: (c) => c.tags || [],
    sortable: false,
    width: 200,
    render: (value: string[]) => (
      <div className="flex flex-wrap gap-1">
        {value.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full"
          >
            {tag}
          </span>
        ))}
        {value.length > 2 && (
          <span className="text-xs text-gray-500">+{value.length - 2}</span>
        )}
      </div>
    )
  }
];

export function TableView({ contacts, onContactClick }: TableViewProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 'email', 'company', 'title', 'status', 'interestLevel', 'aiScore'
  ]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'name', 'email', 'company', 'title', 'status', 'interestLevel', 'aiScore', 'lastConnected'
  ]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  useEffect(() => {
    loadTablePreferences();
  }, []);

  const loadTablePreferences = async () => {
    try {
      const prefs = await viewPreferencesService.getTableColumnPreferences();
      if (prefs) {
        setVisibleColumns(prefs.visible_columns);
        setColumnOrder(prefs.column_order);
        setColumnWidths(prefs.column_widths);
      }
    } catch (error) {
      logger.error('Failed to load table preferences', error as Error);
    }
  };

  const saveTablePreferences = async () => {
    try {
      await viewPreferencesService.saveTableColumnPreferences(
        visibleColumns,
        columnOrder,
        columnWidths
      );
    } catch (error) {
      logger.error('Failed to save table preferences', error as Error);
    }
  };

  const handleSort = (columnId: string) => {
    if (sortField === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(columnId);
      setSortDirection('asc');
    }
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    const column = allColumns.find(col => col.id === sortField);
    if (!column) return 0;

    const aValue = column.accessor(a);
    const bValue = column.accessor(b);

    if (aValue === bValue) return 0;
    const comparison = aValue < bValue ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
    saveTablePreferences();
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const orderedColumns = columnOrder
    .map(id => allColumns.find(col => col.id === id))
    .filter((col): col is ColumnDefinition => col !== undefined && visibleColumns.includes(col.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Contact Table
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({contacts.length} contacts)
          </span>
          {selectedContacts.size > 0 && (
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {selectedContacts.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedContacts.size > 0 && (
            <ModernButton variant="secondary" icon={Download} className="text-sm">
              Export Selected
            </ModernButton>
          )}
          <ModernButton
            variant="secondary"
            onClick={() => setShowColumnConfig(!showColumnConfig)}
            icon={Settings}
            className="text-sm"
          >
            Columns
          </ModernButton>
        </div>
      </div>

      {showColumnConfig && (
        <GlassCard className="mb-4 p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Configure Columns
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allColumns.map(column => (
              <label
                key={column.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.id)}
                  onChange={() => toggleColumnVisibility(column.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {column.label}
                </span>
              </label>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="flex-1 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto h-full">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {selectedContacts.size === contacts.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                {orderedColumns.map(column => (
                  <th
                    key={column.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    style={{ width: columnWidths[column.id] || column.width }}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.id)}
                        className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group"
                      >
                        <span>{column.label}</span>
                        {sortField === column.id ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                        )}
                      </button>
                    ) : (
                      <span>{column.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {sortedContacts.map(contact => (
                <tr
                  key={contact.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  onClick={() => onContactClick(contact)}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectContact(contact.id);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {selectedContacts.has(contact.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  {orderedColumns.map(column => (
                    <td
                      key={column.id}
                      className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {column.render
                        ? column.render(column.accessor(contact), contact)
                        : column.accessor(contact)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No contacts found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Try adjusting your filters or add new contacts to get started.
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
