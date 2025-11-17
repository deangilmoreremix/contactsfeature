import { useState, useEffect, useCallback, useMemo } from 'react';
import { Contact } from '../types/contact';
import { contactService } from '../services/contactService';

interface UseContactDetailResult {
  contact: Contact | null;
  editedContact: Contact | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  editingFields: Set<string>;
  activeTab: string;
  loadContact: (id: string) => Promise<void>;
  updateContact: (updates: Partial<Contact>) => Promise<void>;
  saveField: (field: keyof Contact) => Promise<void>;
  startEditing: (field: string) => void;
  cancelEditing: (field: string) => void;
  setActiveTab: (tab: string) => void;
  reset: () => void;
}

export const useContactDetail = (contactId: string): UseContactDetailResult => {
  const [contact, setContact] = useState<Contact | null>(null);
  const [editedContact, setEditedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');

  // Load contact data
  const loadContact = useCallback(async (id: string) => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const contactData = await contactService.getContactById(id);
      setContact(contactData);
      setEditedContact(contactData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contact';
      setError(errorMessage);
      console.error('Failed to load contact:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update contact with new data
  const updateContact = useCallback(async (updates: Partial<Contact>) => {
    if (!contact) return;

    setIsSaving(true);
    setError(null);

    try {
      const updatedContact = await contactService.updateContact(contact.id, updates);
      setContact(updatedContact);
      setEditedContact(updatedContact);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update contact';
      setError(errorMessage);
      console.error('Failed to update contact:', err);
      throw err; // Re-throw for component handling
    } finally {
      setIsSaving(false);
    }
  }, [contact]);

  // Save a specific field
  const saveField = useCallback(async (field: keyof Contact) => {
    if (!editedContact || !contact) return;

    const newValue = editedContact[field];
    const oldValue = contact[field];

    // Only save if value actually changed
    if (JSON.stringify(newValue) === JSON.stringify(oldValue)) {
      setEditingFields(prev => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
      return;
    }

    try {
      await updateContact({ [field]: newValue });
      setEditingFields(prev => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    } catch (err) {
      // Error is already set in updateContact
    }
  }, [editedContact, contact, updateContact]);

  // Start editing a field
  const startEditing = useCallback((field: string) => {
    setEditingFields(prev => new Set(prev).add(field));
  }, []);

  // Cancel editing a field
  const cancelEditing = useCallback((field: string) => {
    // Reset the field value to original
    if (contact && editedContact) {
      setEditedContact(prev => prev ? { ...prev, [field]: contact[field as keyof Contact] } : null);
    }
    setEditingFields(prev => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, [contact, editedContact]);

  // Update field value
  const updateField = useCallback((field: keyof Contact, value: any) => {
    setEditedContact(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  // Reset everything
  const reset = useCallback(() => {
    setContact(null);
    setEditedContact(null);
    setError(null);
    setEditingFields(new Set());
    setActiveTab('overview');
  }, []);

  // Load contact when contactId changes
  useEffect(() => {
    if (contactId) {
      loadContact(contactId);
    } else {
      reset();
    }
  }, [contactId, loadContact, reset]);

  // Memoized computed values
  const hasUnsavedChanges = useMemo(() => {
    if (!contact || !editedContact) return false;

    return Object.keys(editedContact).some(key => {
      const editedValue = editedContact[key as keyof Contact];
      const originalValue = contact[key as keyof Contact];
      return JSON.stringify(editedValue) !== JSON.stringify(originalValue);
    });
  }, [contact, editedContact]);

  const isDirty = useMemo(() => editingFields.size > 0 || hasUnsavedChanges, [editingFields, hasUnsavedChanges]);

  return {
    contact,
    editedContact,
    isLoading,
    isSaving,
    error,
    editingFields,
    activeTab,
    loadContact,
    updateContact,
    saveField,
    startEditing,
    cancelEditing,
    setActiveTab,
    reset,
    // Additional computed values
    hasUnsavedChanges,
    isDirty,
    updateField
  } as UseContactDetailResult & {
    hasUnsavedChanges: boolean;
    isDirty: boolean;
    updateField: (field: keyof Contact, value: any) => void;
  };
};