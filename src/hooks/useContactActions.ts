import { useCallback } from 'react';
import { useContactStore } from './useContactStore';
import { Contact, ContactCreateRequest } from '../types';
import { safeClipboardWrite } from '../utils/validation';

interface UseContactActionsResult {
  handleExport: (contact: Contact) => Promise<void>;
  handleDuplicate: (contact: Contact) => Promise<Contact | null>;
  handleArchive: (contact: Contact) => Promise<void>;
  handleDelete: (contact: Contact) => Promise<void>;
}

export const useContactActions = (): UseContactActionsResult => {
  const { createContact, updateContact, deleteContact } = useContactStore();

  const handleExport = useCallback(async (contact: Contact) => {
    try {
      const contactData = JSON.stringify(contact, null, 2);
      const blob = new Blob([contactData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contact.name.replace(/\s+/g, '_')}_contact.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export contact:', error);
      throw new Error('Failed to export contact data');
    }
  }, []);

  const handleDuplicate = useCallback(async (contact: Contact): Promise<Contact | null> => {
    try {
      const duplicatedContactData = {
        firstName: contact.firstName,
        lastName: contact.lastName,
        name: `${contact.name} (Copy)`,
        email: contact.email,
        phone: contact.phone || '',
        title: contact.title,
        company: contact.company,
        industry: contact.industry || '',
        sources: contact.sources,
        interestLevel: contact.interestLevel,
        status: contact.status,
        avatarSrc: contact.avatarSrc,
        notes: contact.notes ? `${contact.notes}\n\nDuplicated from ${contact.name}` : `Duplicated from ${contact.name}`,
        tags: contact.tags || []
      };

      const duplicatedContact = await createContact(duplicatedContactData as any);
      return duplicatedContact;
    } catch (error) {
      console.error('Failed to duplicate contact:', error);
      throw new Error('Failed to duplicate contact');
    }
  }, [createContact]);

  const handleArchive = useCallback(async (contact: Contact) => {
    try {
      await updateContact(contact.id, {
        status: 'inactive' as const,
        updatedAt: new Date().toISOString(),
        notes: contact.notes ?
          `${contact.notes}\n\nArchived on ${new Date().toLocaleDateString()}` :
          `Archived on ${new Date().toLocaleDateString()}`
      });
    } catch (error) {
      console.error('Failed to archive contact:', error);
      throw new Error('Failed to archive contact');
    }
  }, [updateContact]);

  const handleDelete = useCallback(async (contact: Contact) => {
    try {
      await deleteContact(contact.id);
    } catch (error) {
      console.error('Failed to delete contact:', error);
      throw new Error('Failed to delete contact');
    }
  }, [deleteContact]);

  return {
    handleExport,
    handleDuplicate,
    handleArchive,
    handleDelete
  };
};