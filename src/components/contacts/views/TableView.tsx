import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { contactsToCsvBlob } from '../../../utils/contactCsv';
import { Contact } from '../../../types/contact';
import { viewPreferencesService } from '../../../services/viewPreferences.service';
import { GlassCard } from '../../ui/GlassCard';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings,
  Star,
  CheckSquare,
  Square,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { useContactStore } from '../../../hooks/useContactStore';
import { InlineEditCell } from '../InlineEditCell';
import { useContactSelectionStore } from '../../../store/contactSelectionStore';
import { useContactGroups } from '../../../hooks/useContactGroups';
import { ContactGroupHeader } from '../ContactGroupHeader';

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
  editable?: boolean;
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
          onError={(e) => {
            const img = e.currentTarget;
            img.onerror = null;
            img.src = 'https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
            img.style.opacity = '0.7';
          }}
          loading="lazy"
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
    editable: true,
    label: 'Email',
    accessor: (c) => c.email,
    sortable: true,
    width: 220
  },
  {
    id: 'company',
    editable: true,
    label: 'Company',
    accessor: (c) => c.company,
    sortable: true,
    width: 180
  },
  {
    id: 'title',
    editable: true,
    label: 'Title',
    accessor: (c) => c.title,
    sortable: true,
    width: 180
  },
  {
    id: 'status',
    editable: true,
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
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[value] || statusColors['inactive']}`}>
          {value}
        </span>
      );
    }
  },
  {
    id: 'interestLevel',
    editable: true,
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

type SortDirection = 'asc' | 'desc';

export function TableView({ contacts, onContactClick }: TableViewProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 'email', 'company', 'title', 'status', 'interestLevel', 'aiScore'
  ]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'name', 'email', 'company', 'title', 'status', 'interestLevel', 'aiScore', 'lastConnected'
  ]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const selectedContacts = useContactSelectionStore((s) => s.selected);
  const toggleSelection = useContactSelectionStore((s) => s.toggle);
  const selectAllIds = useContactSelectionStore((s) => s.selectAll);
  const clearSelection = useContactSelectionStore((s) => s.clear);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const prefsLoaded = useRef(false);
  const updateContact = useContactStore((s) => s.updateContact);
  const deleteContact = useContactStore((s) => s.deleteContact);

  const bulkStatusOptions = ['lead', 'prospect', 'customer', 'churned', 'active', 'pending', 'inactive'];
  const bulkInterestOptions = ['hot', 'medium', 'low', 'cold'];

  const handleSort = (columnId: string) => {
    setManualOrder([]);
    setSortField(columnId);
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
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

  // Manual drag-and-drop ordering overrides column sort until the user sorts again.
  const displayContacts = manualOrder.length
    ? [...sortedContacts].sort((a, b) => {
        const ai = manualOrder.indexOf(a.id);
        const bi = manualOrder.indexOf(b.id);
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
      })
    : sortedContacts;

  const reorderContacts = (draggedId: string, targetId: string) => {
    const ids = displayContacts.map(c => c.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const [moved] = ids.splice(from, 1);
    if (moved === undefined) return;
    ids.splice(to, 0, moved);
    setManualOrder(ids);
  };

  const loadTablePreferences = async () => {
    try {
      const prefs = await viewPreferencesService.getTableColumnPreferences();
      if (prefs) {
        setVisibleColumns(prefs.visible_columns);
        setColumnOrder(prefs.column_order);
        setColumnWidths(prefs.column_widths);
      }
    } catch (error) {
      console.error('Failed to load table preferences', error);
    }
  };

  const saveTablePreferences = async (
    nextVisible: string[] = visibleColumns,
    nextOrder: string[] = columnOrder,
    nextWidths: Record<string, number> = columnWidths
  ) => {
    try {
      await viewPreferencesService.saveTableColumnPreferences(nextVisible, nextOrder, nextWidths);
    } catch (error) {
      console.error('Failed to save table preferences', error);
    }
  };

  const toggleColumnVisibility = (columnId: string) => {
    const next = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId];
    setVisibleColumns(next);
    void saveTablePreferences(next);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === contacts.length) clearSelection();
    else selectAllIds(contacts.map(c => c.id));
  };

  const toggleSelectContact = (contactId: string, shift = false) => {
    toggleSelection(contactId, displayContacts.map(c => c.id), { shift });
  };

  const updateContactField = async (contactId: string, field: string, rawValue: any) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    setEditingCell(null);
    if (contact[field as keyof Contact] === rawValue) return;
    try {
      await updateContact(contactId, { [field]: rawValue } as Partial<Contact>);
    } catch (error) {
      console.error('Failed to update contact', error);
    }
  };

  const bulkUpdateField = async (field: string, value: any) => {
    const ids = Array.from(selectedContacts);
    if (!ids.length) return;
    const results = await Promise.allSettled(
      ids.map(id => updateContact(id, { [field]: value } as Partial<Contact>))
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed) console.error(`Bulk update failed for ${failed} of ${ids.length} contacts`);
    clearSelection();
    setShowBulkMenu(false);
  };

  const bulkDeleteContacts = async () => {
    const ids = Array.from(selectedContacts);
    if (!ids.length || !confirm(`Delete ${ids.length} contacts?`)) return;
    await Promise.allSettled(ids.map(id => deleteContact(id)));
    clearSelection();
    setShowBulkMenu(false);
  };

  const bulkExportSelected = () => {
    const selected = contacts.filter(c => selectedContacts.has(c.id));
    if (!selected.length) return;
    const blob = contactsToCsvBlob(selected, visibleColumns.length ? ['name', ...visibleColumns.filter(c => c !== 'name').map(c => c)] : undefined);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    clearSelection();
    setShowBulkMenu(false);
  };

  const bulkChangeStatus = async (status: string) => bulkUpdateField('status', status);
  const bulkChangeInterest = async (level: string) => bulkUpdateField('interestLevel', level);

  useEffect(() => {
    if (prefsLoaded.current) return;
    prefsLoaded.current = true;
    void loadTablePreferences();
  }, []);

  // Columns missing from the saved order (e.g. Industry, Phone, Tags) are appended so they can be shown.
  const allColumnIds = allColumns.map(col => col.id);
  const fullColumnOrder = [
    ...columnOrder.filter(id => allColumnIds.includes(id)),
    ...allColumnIds.filter(id => !columnOrder.includes(id))
  ];
  const orderedColumns = fullColumnOrder
    .map(id => allColumns.find(col => col.id === id))
    .filter((col): col is ColumnDefinition => col !== undefined && visibleColumns.includes(col.id));

  // ---- Group sections ----
  const contactGroups = useContactGroups(displayContacts);
  const { groups, isCollapsed } = contactGroups;
  const toggleGroup = contactGroups.toggle;
  const navRows = groups ? groups.flatMap(g => (isCollapsed(g.key) ? [] : g.contacts)) : displayContacts;

  // ---- Column drag-reorder and resize ----
  const widthsRef = useRef(columnWidths);
  widthsRef.current = columnWidths;

  const moveColumn = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const next = fullColumnOrder.filter(id => id !== fromId);
    const toIndex = next.indexOf(toId);
    if (toIndex === -1) return;
    next.splice(toIndex, 0, fromId);
    setColumnOrder(next);
    void saveTablePreferences(visibleColumns, next, columnWidths);
  };

  const startResize = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
    const startWidth = th.offsetWidth;
    const startX = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const width = Math.max(80, Math.round(startWidth + ev.clientX - startX));
      setColumnWidths(prev => ({ ...prev, [columnId]: width }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      void saveTablePreferences(visibleColumns, fullColumnOrder, widthsRef.current);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ---- Keyboard cell navigation (arrows, Tab, Enter/F2, Space, Esc, type-to-edit) ----
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusCell, setFocusCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    if (!focusCell) return;
    containerRef.current
      ?.querySelector(`[data-cell="${focusCell.row}:${focusCell.col}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [focusCell]);

  const startEditing = (row: number, col: number) => {
    const contact = navRows[row];
    const column = orderedColumns[col];
    if (contact && column?.editable) setEditingCell({ id: contact.id, field: column.id });
  };

  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (editingCell || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const rowCount = navRows.length;
    const colCount = orderedColumns.length;
    if (rowCount === 0 || colCount === 0) return;
    const cur = focusCell ?? { row: 0, col: 0 };
    const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));
    const go = (row: number, col: number) => { e.preventDefault(); setFocusCell({ row: clamp(row, rowCount - 1), col: clamp(col, colCount - 1) }); };

    switch (e.key) {
      case 'ArrowDown': return go(focusCell ? cur.row + 1 : 0, cur.col);
      case 'ArrowUp': return go(cur.row - 1, cur.col);
      case 'ArrowRight': return go(cur.row, focusCell ? cur.col + 1 : 0);
      case 'ArrowLeft': return go(cur.row, cur.col - 1);
      case 'Home': return go(cur.row, 0);
      case 'End': return go(cur.row, colCount - 1);
      case 'Tab': {
        const forward = !e.shiftKey;
        if (!focusCell) return go(0, 0);
        if (forward && cur.col === colCount - 1) {
          if (cur.row === rowCount - 1) { setFocusCell(null); return; } // leave the table
          return go(cur.row + 1, 0);
        }
        if (!forward && cur.col === 0) {
          if (cur.row === 0) { setFocusCell(null); return; }
          return go(cur.row - 1, colCount - 1);
        }
        return go(cur.row, cur.col + (forward ? 1 : -1));
      }
      case 'Enter':
      case 'F2': {
        if (!focusCell) return;
        e.preventDefault();
        if (orderedColumns[cur.col]?.editable) startEditing(cur.row, cur.col);
        else if (navRows[cur.row]) onContactClick(navRows[cur.row]!);
        return;
      }
      case ' ': {
        if (!focusCell || !navRows[cur.row]) return;
        e.preventDefault();
        toggleSelectContact(navRows[cur.row]!.id, e.shiftKey);
        return;
      }
      case 'Escape': {
        if (focusCell) { e.stopPropagation(); setFocusCell(null); }
        return;
      }
      default: {
        // Typing on an editable cell starts editing it (spreadsheet behaviour).
        if (focusCell && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && orderedColumns[cur.col]?.editable) {
          startEditing(cur.row, cur.col);
        }
      }
    }
  };

  const finishEditing = () => {
    setEditingCell(null);
    containerRef.current?.focus();
  };

  let rowCounter = 0;
  const renderRow = (contact: Contact, groupKey = '') => {
    const rowIndex = rowCounter++;
    return (
      <tr
        key={`${groupKey}:${contact.id}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', contact.id);
          e.dataTransfer.effectAllowed = 'move';
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedId = e.dataTransfer.getData('text/plain');
          if (draggedId && draggedId !== contact.id) {
            reorderContacts(draggedId, contact.id);
          }
        }}
        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
        onClick={() => onContactClick(contact)}
      >
        <td className="px-4 py-3">
          <button
            onClick={(e) => { e.stopPropagation(); toggleSelectContact(contact.id, e.shiftKey); }}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {selectedContacts.has(contact.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
          </button>
        </td>
        {orderedColumns.map((column, colIndex) => {
          const editable = column.editable;
          const isEditing = editable && editingCell?.id === contact.id && editingCell.field === column.id;
          const isFocused = focusCell?.row === rowIndex && focusCell.col === colIndex;
          const customWidth = columnWidths[column.id];
          const value = column.render
            ? column.render(column.accessor(contact), contact)
            : column.accessor(contact);
          return (
            <td
              key={column.id}
              data-cell={`${rowIndex}:${colIndex}`}
              className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px]${isFocused ? ' ring-2 ring-inset ring-blue-500' : ''}`}
              style={customWidth ? { width: customWidth, minWidth: customWidth, maxWidth: customWidth } : undefined}
              onMouseDown={() => setFocusCell({ row: rowIndex, col: colIndex })}
              onDoubleClick={editable ? (e) => { e.stopPropagation(); setEditingCell({ id: contact.id, field: column.id }); } : undefined}
              onClick={isEditing ? (e) => e.stopPropagation() : undefined}
            >
              {isEditing ? (
                <InlineEditCell
                  value={column.accessor(contact)}
                  type={column.id === 'status' || column.id === 'interestLevel' ? 'select' : 'text'}
                  {...(column.id === 'status' ? { options: bulkStatusOptions } : column.id === 'interestLevel' ? { options: bulkInterestOptions } : {})}
                  onSave={(v) => { void updateContactField(contact.id, column.id, v); containerRef.current?.focus(); }}
                  onCancel={finishEditing}
                />
              ) : value}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Table</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">({contacts.length} contacts)</span>
          {selectedContacts.size > 0 && (
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{selectedContacts.size} selected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedContacts.size > 0 && (
            <div className="relative">
              {showBulkMenu && (
              <GlassCard className="absolute right-0 top-full mt-2 w-64 z-50 shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedContacts.size} selected</p>
                </div>
                <div className="p-2">
                  <button onClick={bulkExportSelected} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Export Selected</button>
                  <div className="relative group">
                    <button className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      <span>Change Status</span><ChevronDown className="w-3 h-3" />
                    </button>
                    <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-md z-50">
                      {bulkStatusOptions.map(status => (
                        <button key={status} onClick={() => bulkChangeStatus(status)} className="w-full text-left px-3 py-1.5 text-sm capitalize hover:bg-gray-100 dark:hover:bg-gray-700">{status}</button>
                      ))}
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      <span>Change Interest</span><ChevronDown className="w-3 h-3" />
                    </button>
                    <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-md z-50">
                      {bulkInterestOptions.map(level => (
                        <button key={level} onClick={() => bulkChangeInterest(level)} className="w-full text-left px-3 py-1.5 text-sm capitalize hover:bg-gray-100 dark:hover:bg-gray-700">{level}</button>
                      ))}
                    </div>
                  </div>
                  <hr className="my-2 border-gray-200 dark:border-gray-700" />
                  <button onClick={bulkDeleteContacts} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">Delete Selected</button>
                </div>
              </GlassCard>
              )}
              <button
                onClick={() => setShowBulkMenu(v => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <MoreHorizontal className="w-4 h-4" /> Bulk Actions
              </button>
            </div>
          )}
          <button
            onClick={() => setShowColumnConfig(v => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            <Settings className="w-4 h-4" /> Columns
          </button>
        </div>
      </div>

      {showColumnConfig && (
        <GlassCard className="mb-4 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allColumns.map(column => (
              <label key={column.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.id)}
                  onChange={() => toggleColumnVisibility(column.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{column.label}</span>
              </label>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="flex-1 overflow-hidden">
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleTableKeyDown}
          className="overflow-x-auto overflow-y-auto h-full focus:outline-none"
        >
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <button onClick={toggleSelectAll} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    {selectedContacts.size === contacts.length && contacts.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {orderedColumns.map(column => (
                  <th
                    key={column.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-contact-column', column.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes('application/x-contact-column')) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      const from = e.dataTransfer.getData('application/x-contact-column');
                      if (from) {
                        e.preventDefault();
                        moveColumn(from, column.id);
                      }
                    }}
                    className="relative px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    style={{ width: columnWidths[column.id] || column.width }}
                  >
                    {column.sortable ? (
                      <button onClick={() => handleSort(column.id)} className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group">
                        <span>{column.label}</span>
                        {sortField === column.id ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                        )}
                      </button>
                    ) : <span>{column.label}</span>}
                    <div
                      role="separator"
                      aria-label={`Resize ${column.label} column`}
                      onMouseDown={(e) => startResize(e, column.id)}
                      onClick={(e) => e.stopPropagation()}
                      draggable={false}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {groups
                ? groups.map(group => (
                    <React.Fragment key={group.key || '__none__'}>
                      <tr className="bg-gray-50/60 dark:bg-gray-800/30">
                        <td colSpan={orderedColumns.length + 1} className="px-2">
                          <ContactGroupHeader
                            label={group.label}
                            count={group.contacts.length}
                            collapsed={isCollapsed(group.key)}
                            onToggle={() => toggleGroup(group.key)}
                          />
                        </td>
                      </tr>
                      {!isCollapsed(group.key) && group.contacts.map(contact => renderRow(contact, group.key))}
                    </React.Fragment>
                  ))
                : displayContacts.map(contact => renderRow(contact))}
              {displayContacts.length === 0 && (
                <tr>
                  <td colSpan={orderedColumns.length + 1} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Settings className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No contacts found</h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-sm">Try adjusting your filters or add new contacts to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
