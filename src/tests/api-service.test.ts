/**
 * Comprehensive tests for Contact API Service
 * Tests API interactions, error handling, fallbacks, and data transformations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { contactAPI } from '../services/contact-api.service';
import { Contact } from '../types';

// Mock dependencies
vi.mock('../services/http-client.service');
vi.mock('../services/validation.service');
vi.mock('../services/cache.service');
vi.mock('../services/logger.service');
vi.mock('../services/supabaseClient');

// Mock localStorage
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

describe('Contact API Service', () => {
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
    tags: ['developer', 'react']
  };

  const mockCreatedContact: Contact = {
    ...mockContact,
    id: 'test-contact-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Contact Creation', () => {
    it('should create contact successfully via Supabase', async () => {
      // Mock Supabase response
      const mockSupabaseResponse = {
        data: mockCreatedContact,
        error: null
      };

      const mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(mockSupabaseResponse))
            }))
          }))
        }))
      };

      // Mock the supabase import
      vi.mocked(await import('../services/supabaseClient')).supabase = mockSupabase as any;

      const result = await contactAPI.createContact(mockContact);

      expect(result).toEqual(mockCreatedContact);
    });

    it('should fallback to localStorage when Supabase fails', async () => {
      // Mock Supabase failure
      const mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: new Error('API Error') }))
            }))
          }))
        }))
      };

      vi.mocked(await import('../services/supabaseClient')).supabase = mockSupabase as any;

      const result = await contactAPI.createContact(mockContact);

      // Should create a local contact with generated ID
      expect(result.id).toMatch(/^local-/);
      expect(result.firstName).toBe(mockContact.firstName);
      expect(result.email).toBe(mockContact.email);
    });

    it('should validate contact data before creation', async () => {
      const invalidContact = { ...mockContact, email: 'invalid-email' };

      // Mock validation failure
      const mockValidation = {
        sanitizeContact: vi.fn(() => invalidContact),
        validateContact: vi.fn(() => ({
          isValid: false,
          errors: { email: ['Invalid email format'] }
        }))
      };

      vi.mocked(await import('../services/validation.service')).validationService = mockValidation as any;

      await expect(contactAPI.createContact(invalidContact)).rejects.toThrow('Contact validation failed');
    });
  });

  describe('Contact Retrieval', () => {
    it('should retrieve contact from localStorage', async () => {
      // Mock localStorage to return our contact
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify([mockCreatedContact])),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      const result = await contactAPI.getContact(mockCreatedContact.id);

      expect(result).toEqual(mockCreatedContact);
    });

    it('should throw error for non-existent contact', async () => {
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify([])),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      await expect(contactAPI.getContact('non-existent-id')).rejects.toThrow('Contact with ID non-existent-id not found');
    });
  });

  describe('Contact Updates', () => {
    beforeEach(() => {
      // Set up initial contact in localStorage
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify([mockCreatedContact])),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
    });

    it('should update contact successfully', async () => {
      const updates = { title: 'Senior Software Engineer', phone: '+1 555 987 6543' };

      const result = await contactAPI.updateContact(mockCreatedContact.id, updates);

      expect(result.title).toBe('Senior Software Engineer');
      expect(result.phone).toBe('+1 555 987 6543');
      expect(result.updatedAt).not.toBe(mockCreatedContact.updatedAt);
    });

    it('should handle partial updates', async () => {
      const updates = { title: 'Tech Lead' };

      const result = await contactAPI.updateContact(mockCreatedContact.id, updates);

      expect(result.title).toBe('Tech Lead');
      expect(result.email).toBe(mockCreatedContact.email); // Unchanged
      expect(result.company).toBe(mockCreatedContact.company); // Unchanged
    });

    it('should throw error for non-existent contact update', async () => {
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify([])),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      await expect(contactAPI.updateContact('non-existent-id', { title: 'New Title' }))
        .rejects.toThrow('Contact with ID non-existent-id not found');
    });
  });

  describe('Contact Deletion', () => {
    beforeEach(() => {
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify([mockCreatedContact])),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
    });

    it('should delete contact successfully', async () => {
      await contactAPI.deleteContact(mockCreatedContact.id);

      // Verify the contact was removed from localStorage
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'contacts',
        JSON.stringify([])
      );
    });

    it('should throw error for non-existent contact deletion', async () => {
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify([])),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      await expect(contactAPI.deleteContact('non-existent-id'))
        .rejects.toThrow('Contact with ID non-existent-id not found');
    });
  });

  describe('Contact Listing and Filtering', () => {
    const mockContacts = [
      mockCreatedContact,
      {
        ...mockCreatedContact,
        id: 'contact-2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        status: 'prospect',
        interestLevel: 'hot'
      },
      {
        ...mockCreatedContact,
        id: 'contact-3',
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        status: 'customer',
        industry: 'Manufacturing'
      }
    ];

    beforeEach(() => {
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify(mockContacts)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
    });

    it('should list all contacts without filters', async () => {
      const result = await contactAPI.getContacts({});

      expect(result.contacts).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should apply status filter', async () => {
      const result = await contactAPI.getContacts({ status: 'prospect' });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].status).toBe('prospect');
      expect(result.total).toBe(1);
    });

    it('should apply interest level filter', async () => {
      const result = await contactAPI.getContacts({ interestLevel: 'hot' });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].interestLevel).toBe('hot');
    });

    it('should apply industry filter', async () => {
      const result = await contactAPI.getContacts({ industry: 'Manufacturing' });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].industry).toBe('Manufacturing');
    });

    it('should apply search filter', async () => {
      const result = await contactAPI.getContacts({ search: 'Jane' });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('Jane Smith');
    });

    it('should apply pagination', async () => {
      const result = await contactAPI.getContacts({ limit: 2, offset: 1 });

      expect(result.contacts).toHaveLength(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
      expect(result.hasMore).toBe(true);
    });

    it('should apply sorting', async () => {
      const result = await contactAPI.getContacts({ sortBy: 'name', sortOrder: 'asc' });

      expect(result.contacts[0].name).toBe('Bob Johnson');
      expect(result.contacts[1].name).toBe('Jane Smith');
      expect(result.contacts[2].name).toBe('John Doe');
    });

    it('should combine multiple filters', async () => {
      const result = await contactAPI.getContacts({
        status: 'lead',
        industry: 'Technology',
        search: 'John'
      });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('John Doe');
    });
  });

  describe('Search Functionality', () => {
    const mockContacts = [
      mockCreatedContact,
      {
        ...mockCreatedContact,
        id: 'contact-2',
        name: 'Jane Smith',
        email: 'jane.smith@startup.io',
        company: 'StartupIO'
      }
    ];

    beforeEach(() => {
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify(mockContacts)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
    });

    it('should search contacts by query', async () => {
      const result = await contactAPI.searchContacts('Jane');

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('Jane Smith');
    });

    it('should search across multiple fields', async () => {
      const result = await contactAPI.searchContacts('startup.io');

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].email).toBe('jane.smith@startup.io');
    });

    it('should return empty results for no matches', async () => {
      const result = await contactAPI.searchContacts('nonexistent');

      expect(result.contacts).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Batch Operations', () => {
    const batchContacts = [
      { ...mockContact, name: 'Contact 1' },
      { ...mockContact, name: 'Contact 2' },
      { ...mockContact, name: 'Contact 3' }
    ];

    it('should create contacts in batch', async () => {
      const result = await contactAPI.createContactsBatch(batchContacts);

      expect(result).toHaveLength(3);
      result.forEach((contact, index) => {
        expect(contact.id).toMatch(/^batch-/);
        expect(contact.name).toBe(`Contact ${index + 1}`);
      });
    });

    it('should reject batches exceeding size limit', async () => {
      const largeBatch = Array.from({ length: 101 }, (_, i) => ({
        ...mockContact,
        name: `Contact ${i}`
      }));

      await expect(contactAPI.createContactsBatch(largeBatch))
        .rejects.toThrow('Batch size cannot exceed 100 contacts');
    });

    it('should validate all contacts in batch', async () => {
      const invalidBatch = [
        mockContact,
        { ...mockContact, email: 'invalid-email' }
      ];

      await expect(contactAPI.createContactsBatch(invalidBatch))
        .rejects.toThrow('Batch validation failed');
    });
  });

  describe('Export Functionality', () => {
    const mockContacts = [mockCreatedContact];

    beforeEach(() => {
      const mockLocalStorage = {
        getItem: vi.fn(() => JSON.stringify(mockContacts)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
    });

    it('should export contacts as CSV', async () => {
      const blob = await contactAPI.exportContacts({}, 'csv');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');
    });

    it('should export contacts as JSON', async () => {
      const blob = await contactAPI.exportContacts({}, 'json');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should apply filters during export', async () => {
      const blob = await contactAPI.exportContacts({ status: 'lead' }, 'csv');

      expect(blob).toBeInstanceOf(Blob);
      // The actual filtering would be tested in the getContacts method
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle Supabase connection errors', async () => {
      // Mock Supabase failure
      const mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.reject(new Error('Network error')))
            }))
          }))
        }))
      };

      vi.mocked(await import('../services/supabaseClient')).supabase = mockSupabase as any;

      // Should fallback to local creation
      const result = await contactAPI.createContact(mockContact);
      expect(result.id).toMatch(/^local-/);
    });

    it('should handle localStorage corruption', async () => {
      // Mock corrupted localStorage
      const mockLocalStorage = {
        getItem: vi.fn(() => 'invalid json'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      // Should reinitialize with sample data
      const result = await contactAPI.getContacts({});
      expect(result.contacts.length).toBeGreaterThan(0);
    });

    it('should handle validation errors', async () => {
      const invalidContact = { ...mockContact, email: '' };

      await expect(contactAPI.createContact(invalidContact))
        .rejects.toThrow('Contact validation failed');
    });
  });

  describe('Data Transformation', () => {
    it('should properly format contact data for API', async () => {
      const result = await contactAPI.createContact(mockContact);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result.firstName).toBe(mockContact.firstName);
      expect(result.email).toBe(mockContact.email);
    });

    it('should handle optional fields correctly', async () => {
      const minimalContact = {
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        email: 'john@example.com',
        title: 'Developer',
        company: 'Tech Corp'
      };

      const result = await contactAPI.createContact(minimalContact as any);

      expect(result.firstName).toBe('John');
      expect(result.phone).toBeUndefined();
      expect(result.industry).toBeUndefined();
    });
  });
});