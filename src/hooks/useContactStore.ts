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
import { recordContactDiff } from '../services/contactTimelineService';
import { automationService } from '../services/automation.service';
import { logger } from '../services/logger.service';
import { sampleContacts } from './sampleContacts';
import { softDeleteInState, restoreInState, destroyInState, excludeDeleted } from '../lib/contacts/softDelete';
import { buildDuplicateContact } from '../lib/contacts/duplicateContact';
import { handleError, logError, withErrorHandling, ERROR_CODES, ContactError } from '../utils/errorHandling';

interface ContactState {
  contacts: Contact[];
  /** Soft-deleted contacts (Trash). Loaded on demand in database mode, kept in localStorage in demo mode. */
  trashedContacts: Contact[];
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
  /** Soft delete: moves the contact to the Trash. */
  deleteContact: (id: string) => Promise<void>;
  restoreContact: (id: string) => Promise<void>;
  /** Permanently delete (from the Trash). */
  destroyContact: (id: string) => Promise<void>;
  loadTrash: () => Promise<void>;
  /** Create a copy ('Name (copy)') of a contact and return it. */
  duplicateContact: (contact: Contact) => Promise<Contact>;
  /** Apply several contact patches optimistically (rolls back if saving fails outside demo mode). */
  /** Load saved contacts (database) or re-apply the saved row order (demo mode). Safe to call repeatedly. */
  hydrateContacts: () => Promise<void>;
  reorderContacts: (patches: Array<{ id: string; updates: Partial<Contact> }>) => Promise<void>;
  clearContacts: () => Promise<void>;
  selectContact: (contact: Contact | null) => void;
  importContacts: (contacts: any[]) => Promise<void>;
  exportContacts: (format: 'csv' | 'json') => Promise<void>;
  searchContacts: (query: string) => Promise<void>;
}

interface ContactStore extends ContactState, ContactActions {}

const POSITIONS_KEY = 'smartcrm.contact_positions';

function readSavedPositions(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(POSITIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePositionsLocally(patches: Array<{ id: string; updates: Partial<Contact> }>) {
  try {
    const saved = readSavedPositions();
    patches.forEach((p) => {
      if (typeof p.updates.position === 'number') saved[p.id] = p.updates.position;
    });
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(saved));
  } catch {
    /* storage unavailable: order lasts for this session only */
  }
}

const TRASH_KEY = 'smartcrm.trashed_contacts';

function readLocalTrash(): Contact[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRASH_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalTrash(trashed: Contact[]) {
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(trashed));
  } catch {
    /* storage unavailable: the trash lasts for this session only */
  }
}

/** Run a persistence call. In demo mode the browser store is the source of truth, so failures are ignored there. */
async function persist(call: () => Promise<unknown>): Promise<void> {
  if (contactAPI.usesDatabase()) {
    await call();
    return;
  }
  try {
    await call();
  } catch (error) {
    logger.warn('Demo mode: kept change locally', { error });
  }
}

export const useContactStore = create<ContactStore>((set, get) => ({
  contacts: sampleContacts, 
  trashedContacts: [],
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
        contacts: excludeDeleted(response.contacts),
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
      const contactBefore = get().contacts.find(c => c.id === id);
      const contact = await contactAPI.updateContact(id, updates);
      void recordContactDiff(contactBefore, contact);

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
          throw new ContactError(`Contact with ID ${id} not found`, ERROR_CODES.CONTACT_NOT_FOUND);
        }

        const updatedContact: Contact = {
          ...(get().contacts[contactIndex] as Contact),
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

  hydrateContacts: async () => {
    if (contactAPI.usesDatabase()) {
      await get().fetchContacts();
      return;
    }
    // Demo mode: keep the built-in sample contacts but restore the order the user arranged
    // and the contacts the user moved to the Trash.
    const trashed = readLocalTrash();
    const trashedIds = new Set(trashed.map((c) => c.id));
    const saved = readSavedPositions();
    if (Object.keys(saved).length === 0 && trashed.length === 0) return;
    set((state) => ({
      contacts: state.contacts
        .filter((c) => !trashedIds.has(c.id))
        .map((c) => {
          const savedPosition = saved[c.id];
          return savedPosition !== undefined ? { ...c, position: savedPosition } : c;
        }),
      trashedContacts: trashed,
    }));
  },

  reorderContacts: async (patches) => {
    if (patches.length === 0) return;
    const previous = get().contacts;
    const byId = new Map(patches.map((p) => [p.id, p.updates]));
    set((state) => ({
      contacts: state.contacts.map((c) => (byId.has(c.id) ? { ...c, ...byId.get(c.id)! } : c)),
      selectedContact: state.selectedContact && byId.has(state.selectedContact.id)
        ? { ...state.selectedContact, ...byId.get(state.selectedContact.id)! }
        : state.selectedContact
    }));
    savePositionsLocally(patches);
    try {
      await Promise.all(patches.map((p) => contactAPI.updateContact(p.id, p.updates)));
    } catch (error) {
      if (import.meta.env.DEV || import.meta.env['VITE_ENV'] === 'development') {
        logger.warn('Kept reorder locally in development mode', { error });
        return;
      }
      set({ contacts: previous });
      throw error;
    }
  },

  deleteContact: async (id) => {
    const before = get();
    if (!before.contacts.some((c) => c.id === id)) return;
    try {
      await persist(() => contactAPI.deleteContact(id));
    } catch (error) {
      logger.error('Failed to delete contact', error as Error);
      if (!(import.meta.env.DEV || import.meta.env['VITE_ENV'] === 'development')) throw error;
      logger.info('Deleted contact locally in development mode', { contactId: id });
    }
    set((state) => {
      const next = softDeleteInState({ contacts: state.contacts, trashed: state.trashedContacts }, id, new Date().toISOString());
      return {
        contacts: next.contacts,
        trashedContacts: next.trashed,
        totalCount: Math.max(0, state.totalCount - 1),
        selectedContact: state.selectedContact?.id === id ? null : state.selectedContact
      };
    });
    if (!contactAPI.usesDatabase()) saveLocalTrash(get().trashedContacts);
    logger.info('Contact moved to trash', { contactId: id });
  },

  restoreContact: async (id) => {
    if (!get().trashedContacts.some((c) => c.id === id)) return;
    await persist(() => contactAPI.restoreContact(id));
    set((state) => {
      const next = restoreInState({ contacts: state.contacts, trashed: state.trashedContacts }, id);
      return { contacts: next.contacts, trashedContacts: next.trashed, totalCount: state.totalCount + 1 };
    });
    if (!contactAPI.usesDatabase()) saveLocalTrash(get().trashedContacts);
    logger.info('Contact restored from trash', { contactId: id });
  },

  destroyContact: async (id) => {
    await persist(() => contactAPI.destroyContact(id));
    set((state) => {
      const wasActive = state.contacts.some((c) => c.id === id);
      const next = destroyInState({ contacts: state.contacts, trashed: state.trashedContacts }, id);
      return {
        contacts: next.contacts,
        trashedContacts: next.trashed,
        totalCount: wasActive ? Math.max(0, state.totalCount - 1) : state.totalCount
      };
    });
    if (!contactAPI.usesDatabase()) saveLocalTrash(get().trashedContacts);
    logger.info('Contact permanently deleted', { contactId: id });
  },

  loadTrash: async () => {
    if (!contactAPI.usesDatabase()) {
      set({ trashedContacts: readLocalTrash() });
      return;
    }
    try {
      set({ trashedContacts: await contactAPI.getDeletedContacts() });
    } catch (error) {
      // e.g. the soft-delete migration has not been applied yet: keep whatever we have
      logger.warn('Could not load deleted contacts', { error });
    }
  },

  duplicateContact: async (contact) => {
    const existing = get().contacts.map((c) => c.email);
    return get().createContact(buildDuplicateContact(contact, existing));
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
    if (newContacts.length === 0) {
      set({ error: null });
      return;
    }
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
      
      // createContactsBatch already stores locally when Supabase is not configured; any error here is a real
      // failure (validation or database) and must reach the user instead of silently importing fake local rows.
      const createdContacts = await contactAPI.createContactsBatch(
        formattedContacts as Parameters<typeof contactAPI.createContactsBatch>[0]
      );

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
      
      // Local fallback in development/fallback mode
      if (import.meta.env.DEV || import.meta.env['VITE_ENV'] === 'development') {
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
        contacts: excludeDeleted(response.contacts),
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
        const filteredContacts = excludeDeleted(sampleContacts).filter(contact =>
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