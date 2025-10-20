/**
 * Comprehensive tests for Contact CRUD operations
 * Tests create, read, update, delete operations with various scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useContactStore } from '../hooks/useContactStore';
import { contactAPI } from '../services/contact-api.service';
import { cacheService } from '../services/cache.service';
import { Contact } from '../types';

// Mock dependencies
vi.mock('../services/contact-api.service');
vi.mock('../services/cache.service');
vi.mock('../services/logger.service');

// Mock DOM APIs
Object.defineProperty(global, 'window', {
  value: {
    localStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => null),
      removeItem: vi.fn(() => null),
      clear: vi.fn(() => null),
    },
    URL: {
      createObjectURL: vi.fn(() => 'mock-url'),
      revokeObjectURL: vi.fn(() => null),
    },
  },
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      click: vi.fn(),
      setAttribute: vi.fn(),
    })),
    body: {
      appendChild: vi.fn(),
    },
  },
  writable: true,
});

describe('Contact CRUD Operations', () => {
  let store: ReturnType<typeof useContactStore>;

  const mockContact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> = {
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 555 123 4567',
    title: 'Software Engineer',
    company: 'Tech Corp',
    industry: 'Technology',
    avatarSrc: 'https://example.com/avatar.jpg',
    sources: ['Website'],
    interestLevel: 'medium',
    status: 'lead',
    tags: ['developer', 'tech']
  };

  const mockCreatedContact: Contact = {
    ...mockContact,
    id: 'test-contact-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Direct instantiation for testing (avoiding React hooks in unit tests)
    store = useContactStore.getState() as any;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Create Contact', () => {
    it('should create a contact successfully', async () => {
      // Mock API response
      vi.mocked(contactAPI.createContact).mockResolvedValue(mockCreatedContact);

      const result = await store.createContact(mockContact);

      expect(contactAPI.createContact).toHaveBeenCalledWith(mockContact);
      expect(result).toEqual(mockCreatedContact);
      expect(store.contacts).toContain(mockCreatedContact);
      expect(store.totalCount).toBe(1);
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      vi.mocked(contactAPI.createContact).mockRejectedValue(apiError);

      await expect(store.createContact(mockContact)).rejects.toThrow('API Error');
      expect(store.contacts).toHaveLength(0);
    });

    it('should create contact locally when in development mode', async () => {
      // Mock development environment
      vi.stubEnv('DEV', true);
      vi.mocked(contactAPI.createContact).mockRejectedValue(new Error('API Error'));

      const result = await store.createContact(mockContact);

      expect(result.id).toMatch(/^local-/);
      expect(result.firstName).toBe(mockContact.firstName);
      expect(result.email).toBe(mockContact.email);
      expect(store.contacts).toContain(result);
    });

    it('should validate contact data before creation', async () => {
      const invalidContact = { ...mockContact, email: 'invalid-email' };

      await expect(store.createContact(invalidContact)).rejects.toThrow('Contact validation failed');
      expect(contactAPI.createContact).not.toHaveBeenCalled();
    });
  });

  describe('Read Contacts', () => {
    it('should fetch contacts with default filters', async () => {
      const mockContacts = [mockCreatedContact];
      const mockResponse = {
        contacts: mockContacts,
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      await store.fetchContacts();

      expect(contactAPI.getContacts).toHaveBeenCalledWith({});
      expect(store.contacts).toEqual(mockContacts);
      expect(store.totalCount).toBe(1);
      expect(store.hasMore).toBe(false);
    });

    it('should fetch contacts with custom filters', async () => {
      const filters = { status: 'lead', limit: 10 };
      const mockResponse = {
        contacts: [mockCreatedContact],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      await store.fetchContacts(filters);

      expect(contactAPI.getContacts).toHaveBeenCalledWith(filters);
    });

    it('should handle API errors and keep sample data', async () => {
      vi.mocked(contactAPI.getContacts).mockRejectedValue(new Error('API Error'));

      await store.fetchContacts();

      // Should keep sample contacts when API fails and no contacts exist
      expect(store.contacts.length).toBeGreaterThan(0);
    });
  });

  describe('Update Contact', () => {
    beforeEach(() => {
      // Set up initial state with a contact
      store.contacts = [mockCreatedContact];
      store.totalCount = 1;
    });

    it('should update a contact successfully', async () => {
      const updates = { title: 'Senior Software Engineer', phone: '+1 555 987 6543' };
      const updatedContact = {
        ...mockCreatedContact,
        ...updates,
        updatedAt: expect.any(String)
      };

      vi.mocked(contactAPI.updateContact).mockResolvedValue(updatedContact);

      const result = await store.updateContact(mockCreatedContact.id, updates);

      expect(contactAPI.updateContact).toHaveBeenCalledWith(mockCreatedContact.id, updates);
      expect(result).toEqual(updatedContact);
      expect(store.contacts[0]).toEqual(updatedContact);
    });

    it('should update contact locally when API fails in development', async () => {
      vi.stubEnv('DEV', true);
      vi.mocked(contactAPI.updateContact).mockRejectedValue(new Error('API Error'));

      const updates = { title: 'Senior Engineer' };
      const result = await store.updateContact(mockCreatedContact.id, updates);

      expect(result.title).toBe('Senior Engineer');
      expect(result.updatedAt).not.toBe(mockCreatedContact.updatedAt);
    });

    it('should throw error for non-existent contact', async () => {
      vi.mocked(contactAPI.updateContact).mockRejectedValue(new Error('Contact not found'));

      await expect(store.updateContact('non-existent-id', { title: 'New Title' }))
        .rejects.toThrow('Contact not found');
    });
  });

  describe('Delete Contact', () => {
    beforeEach(() => {
      store.contacts = [mockCreatedContact];
      store.totalCount = 1;
    });

    it('should delete a contact successfully', async () => {
      vi.mocked(contactAPI.deleteContact).mockResolvedValue(undefined);

      await store.deleteContact(mockCreatedContact.id);

      expect(contactAPI.deleteContact).toHaveBeenCalledWith(mockCreatedContact.id);
      expect(store.contacts).toHaveLength(0);
      expect(store.totalCount).toBe(0);
    });

    it('should delete contact locally when API fails in development', async () => {
      vi.stubEnv('DEV', true);
      vi.mocked(contactAPI.deleteContact).mockRejectedValue(new Error('API Error'));

      await store.deleteContact(mockCreatedContact.id);

      expect(store.contacts).toHaveLength(0);
      expect(store.totalCount).toBe(0);
    });

    it('should handle selected contact cleanup', async () => {
      store.selectedContact = mockCreatedContact;
      vi.mocked(contactAPI.deleteContact).mockResolvedValue(undefined);

      await store.deleteContact(mockCreatedContact.id);

      expect(store.selectedContact).toBeNull();
    });
  });

  describe('Contact Selection', () => {
    it('should select a contact', () => {
      store.selectContact(mockCreatedContact);

      expect(store.selectedContact).toEqual(mockCreatedContact);
    });

    it('should clear contact selection', () => {
      store.selectContact(mockCreatedContact);
      store.selectContact(null);

      expect(store.selectedContact).toBeNull();
    });
  });
});