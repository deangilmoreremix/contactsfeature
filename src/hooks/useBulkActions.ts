import { useState, useRef, useCallback } from 'react';
import { useContactStore } from '../hooks/useContactStore';
import { Contact } from '../types/contact';

export function useBulkActions(contacts: Contact[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const { updateContact } = useContactStore();

  const selectedContacts = contacts.filter(c => selectedIds.has(c.id));
  const isAllSelected = contacts.length > 0 && selectedIds.size === contacts.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === contacts.length) {
        return new Set();
      }
      return new Set(contacts.map(c => c.id));
    });
  }, [contacts]);

  const toggleSelect = useCallback((contactId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkUpdateField = useCallback(async (field: keyof Contact, value: any) => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);

    try {
      const updates: Partial<Contact> = { [field]: value, updatedAt: new Date().toISOString() };
      await Promise.all(
        Array.from(selectedIds).map(id =>
          updateContact(id, updates).catch(err =>
            console.error(`Failed to update contact ${id}:`, err)
          )
        )
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Bulk update failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, updateContact]);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} contacts? This cannot be undone.`)) return;

    setIsProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          updateContact(id, { status: 'churned' as Contact['status'], deletedAt: new Date().toISOString() })
            .catch(err => console.error(`Failed to delete contact ${id}:`, err))
        )
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Bulk delete failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, updateContact]);

  return {
    selectedIds,
    selectedContacts,
    isAllSelected,
    isSomeSelected,
    isProcessing,
    toggleSelectAll,
    toggleSelect,
    clearSelection,
    bulkUpdateField,
    bulkDelete
  };
}
