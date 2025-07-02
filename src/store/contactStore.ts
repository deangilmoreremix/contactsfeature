import { create } from 'zustand';
import { Contact } from '../types/contact';
import { contactAPI } from '../services/contact-api.service';
import { logger } from '../services/logger.service';

interface ContactStore {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  selectedContact: Contact | null;
  totalCount: number;
  hasMore: boolean;
  
  // Actions
  fetchContacts: (filters?: any) => Promise<void>;
  createContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  selectContact: (contact: Contact | null) => void;
  importContacts: (contacts: any[]) => Promise<void>;
  exportContacts: (format: 'csv' | 'json') => Promise<void>;
  searchContacts: (query: string) => Promise<void>;
}

export const useContactStore = create<ContactStore>((set, get) => ({
  contacts: [],
  isLoading: false,
  error: null,
  selectedContact: null,
  totalCount: 0,
  hasMore: false,

  fetchContacts: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await contactAPI.getContacts(filters);
      
      set({
        contacts: response.contacts,
        isLoading: false,
        totalCount: response.total,
        hasMore: response.hasMore
      });
      
      logger.info('Contacts fetched successfully', { count: response.contacts.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contacts';
      set({ error: errorMessage, isLoading: false });
      logger.error('Failed to fetch contacts', error as Error);
    }
  },

  createContact: async (contactData) => {
    set({ isLoading: true, error: null });
    
    try {
      const contact = await contactAPI.createContact(contactData);
      
      set(state => ({
        contacts: [contact, ...state.contacts],
        isLoading: false,
        totalCount: state.totalCount + 1
      }));
      
      logger.info('Contact created successfully', { contactId: contact.id });
      return contact;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create contact';
      set({ error: errorMessage, isLoading: false });
      logger.error('Failed to create contact', error as Error);
      throw error;
    }
  },

  updateContact: async (id, updates) => {
    try {
      const contact = await contactAPI.updateContact(id, updates);
      
      set(state => ({
        contacts: state.contacts.map(c => c.id === id ? contact : c),
        selectedContact: state.selectedContact?.id === id ? contact : state.selectedContact
      }));
      
      logger.info('Contact updated successfully', { contactId: id });
      return contact;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update contact';
      logger.error('Failed to update contact', error as Error);
      throw new Error(errorMessage);
    }
  },

  deleteContact: async (id) => {
    try {
      await contactAPI.deleteContact(id);
      
      set(state => ({
        contacts: state.contacts.filter(c => c.id !== id),
        totalCount: Math.max(0, state.totalCount - 1),
        selectedContact: state.selectedContact?.id === id ? null : state.selectedContact
      }));
      
      logger.info('Contact deleted successfully', { contactId: id });
    } catch (error) {
      logger.error('Failed to delete contact', error as Error);
      throw error;
    }
  },

  selectContact: (contact) => {
    set({ selectedContact: contact });
  },

  importContacts: async (newContacts) => {
    set({ isLoading: true, error: null });
    
    try {
      // Format contacts properly for API
      const formattedContacts = newContacts.map(contact => ({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        email: contact.email || '',
        phone: contact.phone,
        title: contact.title || '',
        company: contact.company || '',
        industry: contact.industry,
        sources: contact.sources || ['Manual Import'],
        interestLevel: contact.interestLevel || 'medium',
        status: contact.status || 'lead',
        notes: contact.notes,
        tags: contact.tags
      }));
      
      const createdContacts = await contactAPI.createContactsBatch(formattedContacts);
      
      set(state => ({
        contacts: [...state.contacts, ...createdContacts],
        isLoading: false,
        totalCount: state.totalCount + createdContacts.length
      }));
      
      logger.info('Contacts imported successfully', { count: createdContacts.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import contacts';
      set({ error: errorMessage, isLoading: false });
      logger.error('Failed to import contacts', error as Error);
      throw error;
    }
  },

  exportContacts: async (format: 'csv' | 'json' = 'csv') => {
    try {
      // Get current filters from state (implement if needed)
      const filters = {};
      
      const blob = await contactAPI.exportContacts(filters, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contacts_export_${new Date().toISOString().slice(0, 10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      logger.info('Contacts exported successfully', { format });
    } catch (error) {
      logger.error('Failed to export contacts', error as Error);
      throw error;
    }
  },

  searchContacts: async (query: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await contactAPI.searchContacts(query);
      
      set({
        contacts: response.contacts,
        isLoading: false,
        totalCount: response.total,
        hasMore: response.hasMore
      });
      
      logger.info('Contacts search completed', { query, resultCount: response.contacts.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search contacts';
      set({ error: errorMessage, isLoading: false });
      logger.error('Failed to search contacts', error as Error);
    }
  }
}));