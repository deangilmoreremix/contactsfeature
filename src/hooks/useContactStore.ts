/**
 * Contact Store Hook
 *
 * Centralized state management for contacts using Zustand.
 * Provides CRUD operations, search, import/export functionality.
 *
 * @deprecated This implementation is deprecated. Use the hooks-based approach instead.
 * Components should migrate to using individual hooks like useContactStore from hooks/useContactStore.ts
 */

import { create } from 'zustand';
import { Contact } from '../types';
import { contactAPI } from '../services/contact-api.service';
import { automationService } from '../services/automation.service';
import { logger } from '../services/logger.service';
import { sampleContacts } from './sampleContacts';
import { useDebounce } from './useDebounce';
import { handleError, logError, withErrorHandling, ERROR_CODES, createError } from '../utils/errorHandling';

interface ContactState {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  selectedContact: Contact | null;
  totalCount: number;
  hasMore: boolean;
}

interface ContactActions {
  fetchContacts: (filters?: any) => Promise<void>;
  createContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  clearContacts: () => Promise<void>;
  selectContact: (contact: Contact | null) => void;
  importContacts: (contacts: any[]) => Promise<void>;
  exportContacts: (format: 'csv' | 'json') => Promise<void>;
  searchContacts: (query: string) => Promise<void>;
}

interface ContactStore extends ContactState, ContactActions {}

export const useContactStore = create<ContactStore>((set, get) => ({
  contacts: sampleContacts, 
  isLoading: false,
  error: null,
  selectedContact: null,
  totalCount: sampleContacts.length,
  hasMore: false,

  fetchContacts: async (filters = {}) => {
    return withErrorHandling(async () => {
      set({ isLoading: true, error: null });

      const response = await contactAPI.getContacts(filters);

      set({
        contacts: response.contacts,
        isLoading: false,
        totalCount: response.total,
        hasMore: response.hasMore
      });

      logger.info('Contacts fetched successfully', { count: response.contacts.length });
    }, { operation: 'fetchContacts', filters }).catch((error) => {
      const appError = handleError(error, { operation: 'fetchContacts', filters });
      logError(appError);

      set({ error: appError.message, isLoading: false });

      // Keep sample contacts if API fails
      if (get().contacts.length === 0) {
        set({
          contacts: sampleContacts,
          totalCount: sampleContacts.length
        });
      }
    });
  },

  createContact: async (contactData) => {
    return withErrorHandling(async () => {
      set({ isLoading: true, error: null });

      const contact = await contactAPI.createContact(contactData);

      set(state => ({
        contacts: [contact, ...state.contacts],
        isLoading: false,
        totalCount: state.totalCount + 1
      }));

      logger.info('Contact created successfully', { contactId: contact.id });

      // Trigger automations for contact creation (non-blocking)
      automationService.processContactAutomation(contact, 'contact_created')
        .catch(automationError => {
          logger.warn('Contact creation automation failed', { contactId: contact.id, error: automationError });
        });

      return contact;
    }, { operation: 'createContact', contactData }).catch((error) => {
      const appError = handleError(error, { operation: 'createContact', contactData });
      logError(appError);

      set({ error: appError.message, isLoading: false });

      // Generate a mock contact when in development/fallback mode
      if (import.meta.env.DEV || import.meta.env['VITE_ENV'] === 'development') {
        const mockContact: Contact = {
          ...contactData as any,
          id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          aiScore: 0
        };

        set(state => ({
          contacts: [mockContact, ...state.contacts],
          isLoading: false,
          totalCount: state.totalCount + 1
        }));

        logger.info('Created mock contact in development mode', { contactId: mockContact.id });
        return mockContact;
      }

      throw appError;
    });
  },

  updateContact: async (id, updates) => {
    console.log('useContactStore updateContact called with id:', id, 'updates:', updates);
    return withErrorHandling(async () => {
      const contact = await contactAPI.updateContact(id, updates);

      set(state => ({
        contacts: state.contacts.map(c => c.id === id ? contact : c),
        selectedContact: state.selectedContact?.id === id ? contact : state.selectedContact
      }));

      logger.info('Contact updated successfully', { contactId: id });

      // Trigger automations for contact updates (non-blocking)
      automationService.processContactAutomation(contact, 'contact_updated', Object.keys(updates))
        .catch(automationError => {
          logger.warn('Contact update automation failed', { contactId: id, error: automationError });
        });

      return contact;
    }, { operation: 'updateContact', contactId: id, updates }).catch((error) => {
      const appError = handleError(error, { operation: 'updateContact', contactId: id, updates });
      logError(appError);

      // Update locally in development/fallback mode
      if (import.meta.env.DEV || import.meta.env['VITE_ENV'] === 'development') {
        const contactIndex = get().contacts.findIndex(c => c.id === id);
        if (contactIndex === -1) {
          throw createError(ERROR_CODES.CONTACT_NOT_FOUND, `Contact with ID ${id} not found`);
        }

        const updatedContact: Contact = {
          ...get().contacts[contactIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };

        set(state => ({
          contacts: state.contacts.map(c => c.id === id ? updatedContact : c),
          selectedContact: state.selectedContact?.id === id ? updatedContact : state.selectedContact
        }));

        logger.info('Updated contact locally in development mode', { contactId: id });
        return updatedContact;
      }

      throw appError;
    });
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

      // Delete locally in development/fallback mode
      if (import.meta.env.DEV || import.meta.env['VITE_ENV'] === 'development') {
        set(state => ({
          contacts: state.contacts.filter(c => c.id !== id),
          totalCount: Math.max(0, state.totalCount - 1),
          selectedContact: state.selectedContact?.id === id ? null : state.selectedContact
        }));

        logger.info('Deleted contact locally in development mode', { contactId: id });
        return;
      }

      throw error;
    }
  },

  clearContacts: async () => {
    try {
      // For now, we'll clear contacts locally
      // In a real implementation, this would call contactAPI.clearAllContacts()
      set({
        contacts: [],
        totalCount: 0,
        selectedContact: null
      });

      logger.info('All contacts cleared successfully');
    } catch (error) {
      logger.error('Failed to clear contacts', error as Error);
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
      
      try {
        const createdContacts = await contactAPI.createContactsBatch(formattedContacts);
        
        set(state => ({
          contacts: [...state.contacts, ...createdContacts],
          isLoading: false,
          totalCount: state.totalCount + createdContacts.length
        }));
        
        logger.info('Contacts imported successfully', { count: createdContacts.length });
      } catch (apiError) {
        logger.error('API import failed, falling back to local import', apiError);
        
        // Local fallback
        const now = new Date().toISOString();
        const mockImportedContacts = formattedContacts.map((contact, index) => ({
          ...contact,
          id: `local-import-${Date.now()}-${index}`,
          createdAt: now,
          updatedAt: now,
          avatarSrc: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'
        }));
        
        set(state => ({
          contacts: [...state.contacts, ...mockImportedContacts],
          isLoading: false,
          totalCount: state.totalCount + mockImportedContacts.length
        }));
        
        logger.info('Contacts imported locally', { count: mockImportedContacts.length });
      }
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
      
      // Local fallback in development/fallback mode
      if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
        const contacts = get().contacts;
        let content: string | object = '';
        
        if (format === 'json') {
          content = JSON.stringify(contacts, null, 2);
        } else {
          // CSV export
          const headers = [
            'id', 'firstName', 'lastName', 'email', 'phone', 'title', 
            'company', 'industry', 'interestLevel', 'status', 'aiScore'
          ];
          
          const rows = contacts.map(contact => {
            return headers.map(header => {
              const value = (contact as any)[header];
              // Handle values that might contain commas or quotes
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value !== undefined && value !== null ? value : '';
            }).join(',');
          });
          
          content = [headers.join(','), ...rows].join('\n');
        }
        
        const blob = new Blob(
          [typeof content === 'string' ? content : JSON.stringify(content)], 
          { type: format === 'csv' ? 'text/csv' : 'application/json' }
        );
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `contacts_export_${new Date().toISOString().slice(0, 10)}.${format}`);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        logger.info('Contacts exported locally', { format, count: contacts.length });
      } else {
        throw error;
      }
    }
  },

  searchContacts: async (query: string) => {
    set({ isLoading: true, error: null });

    try {
      // Use server-side search with debouncing via API
      const response = await contactAPI.searchContacts(query);

      set({
        contacts: response.contacts,
        isLoading: false,
        totalCount: response.total,
        hasMore: response.hasMore
      });

      logger.info('Server-side search completed', { query, resultCount: response.contacts.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search contacts';
      set({ error: errorMessage, isLoading: false });
      logger.error('Failed to search contacts', error as Error);

      // Fallback to client-side search on error
      if (query) {
        const lowerQuery = query.toLowerCase();
        const filteredContacts = sampleContacts.filter(contact =>
          contact.name.toLowerCase().includes(lowerQuery) ||
          contact.email.toLowerCase().includes(lowerQuery) ||
          contact.company.toLowerCase().includes(lowerQuery) ||
          (contact.title && contact.title.toLowerCase().includes(lowerQuery)) ||
          (contact.industry && contact.industry.toLowerCase().includes(lowerQuery))
        );

        set({
          contacts: filteredContacts,
          totalCount: filteredContacts.length,
          hasMore: false
        });

        logger.info('Fallback client-side search completed', { query, resultCount: filteredContacts.length });
      }
    }
  }
}));