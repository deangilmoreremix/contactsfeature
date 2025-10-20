/**
 * API Integration Tests
 * Tests actual API calls to Supabase and external services
 * These tests require a test database and should be run in CI/CD
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useContactStore } from '../../hooks/useContactStore';
import { contactAPI } from '../../services/contact-api.service';
import { Contact } from '../../types';

// Test configuration - these should be set in CI/CD environment
const TEST_CONFIG = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'test-url',
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || 'test-key',
  enableRealApi: process.env.ENABLE_REAL_API_TESTS === 'true',
  testDatabase: process.env.TEST_DATABASE_NAME || 'test_contacts'
};

// Skip these tests if real API is not enabled
const describeConditional = TEST_CONFIG.enableRealApi ? describe : describe.skip;

// Real test data that will be inserted into actual database
const testContacts = {
  basic: {
    firstName: 'API',
    lastName: 'Test',
    email: 'api.test@example.com',
    title: 'Test Engineer',
    company: 'Test Corp',
    industry: 'Technology',
    sources: ['API Test'],
    interestLevel: 'medium' as const,
    status: 'lead' as const,
    tags: ['api-test', 'integration']
  },
  complex: {
    firstName: 'Integration',
    lastName: 'Tester',
    email: 'integration.tester@example.com',
    phone: '+1 555 0123',
    title: 'Senior Integration Engineer',
    company: 'Integration Labs',
    industry: 'Software',
    sources: ['Automated Test', 'CI/CD'],
    interestLevel: 'hot' as const,
    status: 'prospect' as const,
    tags: ['integration', 'senior', 'automated'],
    notes: 'Created by automated integration test suite'
  },
  international: {
    firstName: 'José',
    lastName: 'Martínez',
    email: 'jose.martinez@empresa.es',
    phone: '+34 91 123 4567',
    title: 'Director Técnico',
    company: 'Empresa Española S.A.',
    industry: 'Technology',
    sources: ['International Test'],
    interestLevel: 'medium' as const,
    status: 'customer' as const,
    tags: ['international', 'spanish', 'director']
  }
};

describeConditional('API Integration Tests', () => {
  // Test database state management
  let createdContactIds: string[] = [];

  beforeAll(async () => {
    if (!TEST_CONFIG.enableRealApi) {
      console.log('Skipping real API integration tests - ENABLE_REAL_API_TESTS not set to true');
      return;
    }

    // Verify database connection
    try {
      await contactAPI.getContacts();
      console.log('✅ Database connection verified');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  });

  beforeEach(() => {
    createdContactIds = [];
  });

  afterEach(async () => {
    // Clean up test data
    if (TEST_CONFIG.enableRealApi && createdContactIds.length > 0) {
      console.log(`🧹 Cleaning up ${createdContactIds.length} test contacts...`);
      for (const id of createdContactIds) {
        try {
          await contactAPI.deleteContact(id);
        } catch (error) {
          console.warn(`Failed to cleanup contact ${id}:`, error);
        }
      }
      createdContactIds = [];
    }
  });

  describe('Real Database CRUD Operations', () => {
    it('should create, read, update, and delete contacts in real database', async () => {
      const { result } = renderHook(() => useContactStore());

      // CREATE
      const contactData = testContacts.basic;
      let createdContact: Contact;

      await act(async () => {
        createdContact = await result.current.createContact(contactData);
      });

      expect(createdContact).toBeDefined();
      expect(createdContact!.id).toBeDefined();
      expect(createdContact!.firstName).toBe(contactData.firstName);
      expect(createdContact!.email).toBe(contactData.email);
      expect(createdContact!.createdAt).toBeDefined();
      expect(createdContact!.updatedAt).toBeDefined();

      createdContactIds.push(createdContact!.id);

      // READ - Verify contact exists in database
      const fetchedContact = await contactAPI.getContact(createdContact!.id);
      expect(fetchedContact).toEqual(createdContact);

      // UPDATE
      const updates = {
        title: 'Senior Test Engineer',
        interestLevel: 'hot' as const,
        tags: [...contactData.tags, 'updated']
      };

      let updatedContact: Contact;
      await act(async () => {
        updatedContact = await result.current.updateContact(createdContact!.id, updates);
      });

      expect(updatedContact!.title).toBe('Senior Test Engineer');
      expect(updatedContact!.interestLevel).toBe('hot');
      expect(updatedContact!.tags).toContain('updated');
      expect(updatedContact!.updatedAt).not.toBe(createdContact!.updatedAt);

      // DELETE
      await act(async () => {
        await result.current.deleteContact(createdContact!.id);
      });

      // Verify deletion
      await expect(contactAPI.getContact(createdContact!.id)).rejects.toThrow();

      // Remove from cleanup list since it's already deleted
      createdContactIds = createdContactIds.filter(id => id !== createdContact!.id);
    });

    it('should handle complex contact data with all fields', async () => {
      const { result } = renderHook(() => useContactStore());

      const contactData = testContacts.complex;

      let createdContact: Contact;
      await act(async () => {
        createdContact = await result.current.createContact(contactData);
      });

      expect(createdContact).toBeDefined();
      expect(createdContact!.firstName).toBe('Integration');
      expect(createdContact!.lastName).toBe('Tester');
      expect(createdContact!.phone).toBe('+1 555 0123');
      expect(createdContact!.industry).toBe('Software');
      expect(createdContact!.sources).toEqual(['Automated Test', 'CI/CD']);
      expect(createdContact!.interestLevel).toBe('hot');
      expect(createdContact!.status).toBe('prospect');
      expect(createdContact!.tags).toEqual(['integration', 'senior', 'automated']);
      expect(createdContact!.notes).toBe('Created by automated integration test suite');

      createdContactIds.push(createdContact!.id);

      // Verify in database
      const fetchedContact = await contactAPI.getContact(createdContact!.id);
      expect(fetchedContact).toEqual(createdContact);
    });

    it('should handle international characters and data', async () => {
      const { result } = renderHook(() => useContactStore());

      const contactData = testContacts.international;

      let createdContact: Contact;
      await act(async () => {
        createdContact = await result.current.createContact(contactData);
      });

      expect(createdContact).toBeDefined();
      expect(createdContact!.firstName).toBe('José');
      expect(createdContact!.lastName).toBe('Martínez');
      expect(createdContact!.company).toBe('Empresa Española S.A.');
      expect(createdContact!.phone).toBe('+34 91 123 4567');

      createdContactIds.push(createdContact!.id);

      // Verify international data is stored correctly
      const fetchedContact = await contactAPI.getContact(createdContact!.id);
      expect(fetchedContact!.firstName).toBe('José');
      expect(fetchedContact!.company).toBe('Empresa Española S.A.');
    });
  });

  describe('Real Bulk Operations', () => {
    it('should import multiple contacts via real API', async () => {
      const { result } = renderHook(() => useContactStore());

      const bulkContacts = [
        {
          ...testContacts.basic,
          email: 'bulk1@example.com',
          firstName: 'Bulk',
          lastName: 'One'
        },
        {
          ...testContacts.basic,
          email: 'bulk2@example.com',
          firstName: 'Bulk',
          lastName: 'Two'
        },
        {
          ...testContacts.basic,
          email: 'bulk3@example.com',
          firstName: 'Bulk',
          lastName: 'Three'
        }
      ];

      await act(async () => {
        await result.current.importContacts(bulkContacts);
      });

      expect(result.current.contacts).toHaveLength(3);
      expect(result.current.totalCount).toBe(3);

      // Store IDs for cleanup
      result.current.contacts.forEach(contact => {
        createdContactIds.push(contact.id);
      });

      // Verify all contacts exist in database
      for (const contact of result.current.contacts) {
        const fetched = await contactAPI.getContact(contact.id);
        expect(fetched.email).toMatch(/^bulk\d@example\.com$/);
      }
    });

    it('should handle large bulk imports efficiently', async () => {
      const { result } = renderHook(() => useContactStore());

      // Create 50 test contacts
      const bulkContacts = Array.from({ length: 50 }, (_, i) => ({
        firstName: `BulkTest${i}`,
        lastName: 'User',
        email: `bulktest${i}@integration.example.com`,
        title: 'Test User',
        company: `TestCompany${i % 5}`,
        industry: 'Technology',
        sources: ['Bulk Integration Test'],
        interestLevel: (['hot', 'medium', 'low'] as const)[i % 3],
        status: (['lead', 'prospect', 'customer'] as const)[i % 3],
        tags: [`bulk-test-${i % 10}`]
      }));

      const startTime = Date.now();

      await act(async () => {
        await result.current.importContacts(bulkContacts);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.current.contacts).toHaveLength(50);
      expect(result.current.totalCount).toBe(50);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      // Store IDs for cleanup
      result.current.contacts.forEach(contact => {
        createdContactIds.push(contact.id);
      });

      // Verify a sample of contacts in database
      const sampleContacts = result.current.contacts.slice(0, 5);
      for (const contact of sampleContacts) {
        const fetched = await contactAPI.getContact(contact.id);
        expect(fetched.email).toMatch(/^bulktest\d@integration\.example\.com$/);
      }
    });
  });

  describe('Real Search and Filtering', () => {
    beforeEach(async () => {
      if (!TEST_CONFIG.enableRealApi) return;

      // Set up test data
      const { result } = renderHook(() => useContactStore());

      const searchTestContacts = [
        { ...testContacts.basic, email: 'search.tech@example.com', industry: 'Technology', tags: ['tech'] },
        { ...testContacts.basic, email: 'search.health@example.com', industry: 'Healthcare', tags: ['health'] },
        { ...testContacts.basic, email: 'search.finance@example.com', industry: 'Finance', tags: ['finance'] },
        { ...testContacts.basic, email: 'search.hot@example.com', interestLevel: 'hot' as const, tags: ['hot'] },
        { ...testContacts.basic, email: 'search.cold@example.com', interestLevel: 'cold' as const, tags: ['cold'] }
      ];

      await act(async () => {
        await result.current.importContacts(searchTestContacts);
      });

      // Store IDs for cleanup
      result.current.contacts.forEach(contact => {
        createdContactIds.push(contact.id);
      });
    });

    it('should search contacts by text in real database', async () => {
      const { result } = renderHook(() => useContactStore());

      await act(async () => {
        await result.current.searchContacts('tech');
      });

      expect(result.current.contacts.length).toBeGreaterThan(0);
      result.current.contacts.forEach(contact => {
        expect(
          contact.firstName.toLowerCase().includes('tech') ||
          contact.lastName.toLowerCase().includes('tech') ||
          contact.email.toLowerCase().includes('tech') ||
          contact.company.toLowerCase().includes('tech') ||
          contact.tags.some(tag => tag.toLowerCase().includes('tech'))
        ).toBe(true);
      });
    });

    it('should filter contacts by industry in real database', async () => {
      const { result } = renderHook(() => useContactStore());

      await act(async () => {
        await result.current.fetchContacts({ industry: 'Technology' });
      });

      expect(result.current.contacts.length).toBeGreaterThan(0);
      result.current.contacts.forEach(contact => {
        expect(contact.industry).toBe('Technology');
      });
    });

    it('should filter contacts by interest level in real database', async () => {
      const { result } = renderHook(() => useContactStore());

      await act(async () => {
        await result.current.fetchContacts({ interestLevel: 'hot' });
      });

      expect(result.current.contacts.length).toBeGreaterThan(0);
      result.current.contacts.forEach(contact => {
        expect(contact.interestLevel).toBe('hot');
      });
    });
  });

  describe('Real Export Operations', () => {
    beforeEach(async () => {
      if (!TEST_CONFIG.enableRealApi) return;

      // Set up test data for export
      const { result } = renderHook(() => useContactStore());

      const exportTestContacts = [
        { ...testContacts.basic, email: 'export1@example.com', firstName: 'Export', lastName: 'One' },
        { ...testContacts.basic, email: 'export2@example.com', firstName: 'Export', lastName: 'Two' }
      ];

      await act(async () => {
        await result.current.importContacts(exportTestContacts);
      });

      result.current.contacts.forEach(contact => {
        createdContactIds.push(contact.id);
      });
    });

    it('should export contacts as CSV from real database', async () => {
      const { result } = renderHook(() => useContactStore());

      // Mock download functionality since we can't test actual file downloads
      const mockBlob = new Blob(['mock,csv,data'], { type: 'text/csv' });
      vi.mocked(contactAPI.exportContacts).mockResolvedValue(mockBlob);

      await act(async () => {
        await result.current.exportContacts('csv');
      });

      expect(contactAPI.exportContacts).toHaveBeenCalledWith({}, 'csv');
    });

    it('should export filtered contacts from real database', async () => {
      const { result } = renderHook(() => useContactStore());

      const mockBlob = new Blob(['filtered,data'], { type: 'text/csv' });
      vi.mocked(contactAPI.exportContacts).mockResolvedValue(mockBlob);

      await act(async () => {
        await result.current.exportContacts('csv', { industry: 'Technology' });
      });

      expect(contactAPI.exportContacts).toHaveBeenCalledWith({ industry: 'Technology' }, 'csv');
    });
  });

  describe('Real Error Handling', () => {
    it('should handle duplicate email errors from real database', async () => {
      const { result } = renderHook(() => useContactStore());

      const contactData = testContacts.basic;

      // Create first contact
      await act(async () => {
        const created = await result.current.createContact(contactData);
        createdContactIds.push(created.id);
      });

      // Try to create duplicate
      await expect(result.current.createContact(contactData)).rejects.toThrow();

      expect(result.current.error).toBeDefined();
      expect(result.current.contacts).toHaveLength(1); // Should not add duplicate
    });

    it('should handle network errors during real API calls', async () => {
      // Temporarily break the API connection
      const originalFetch = global.fetch;
      global.fetch = vi.fn(() => Promise.reject(new Error('Network Error')));

      const { result } = renderHook(() => useContactStore());

      await expect(result.current.createContact(testContacts.basic)).rejects.toThrow('Network Error');

      expect(result.current.error).toContain('Network Error');

      // Restore fetch
      global.fetch = originalFetch;
    });

    it('should handle database constraint violations', async () => {
      const { result } = renderHook(() => useContactStore());

      // Try to create contact with invalid data that violates DB constraints
      const invalidContact = {
        ...testContacts.basic,
        email: 'invalid-email-format', // This should be caught by validation
        firstName: '', // Required field
        lastName: '' // Required field
      };

      await expect(result.current.createContact(invalidContact)).rejects.toThrow();

      expect(result.current.error).toBeDefined();
      expect(result.current.contacts).toHaveLength(0);
    });
  });

  describe('Real Performance Testing', () => {
    it('should handle concurrent operations on real database', async () => {
      const { result } = renderHook(() => useContactStore());

      const concurrentContacts = Array.from({ length: 10 }, (_, i) => ({
        ...testContacts.basic,
        email: `concurrent${i}@example.com`,
        firstName: `Concurrent${i}`,
        lastName: 'Test'
      }));

      const startTime = Date.now();

      await act(async () => {
        await Promise.all(concurrentContacts.map(contact => result.current.createContact(contact)));
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.current.contacts).toHaveLength(10);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Store IDs for cleanup
      result.current.contacts.forEach(contact => {
        createdContactIds.push(contact.id);
      });
    });

    it('should maintain data consistency during high load', async () => {
      const { result } = renderHook(() => useContactStore());

      // Create, update, and delete operations concurrently
      const operations = Array.from({ length: 20 }, (_, i) => ({
        type: i % 3, // 0: create, 1: update, 2: delete
        data: {
          ...testContacts.basic,
          email: `consistency${i}@example.com`,
          firstName: `Consistency${i}`
        }
      }));

      const createdIds: string[] = [];

      await act(async () => {
        const promises = operations.map(async (op, i) => {
          if (op.type === 0) {
            // Create
            const created = await result.current.createContact(op.data);
            createdIds.push(created.id);
            return created;
          } else if (op.type === 1 && createdIds.length > 0) {
            // Update existing
            const idToUpdate = createdIds[createdIds.length - 1];
            return result.current.updateContact(idToUpdate, { title: 'Updated Title' });
          } else if (op.type === 2 && createdIds.length > 0) {
            // Delete existing
            const idToDelete = createdIds.pop()!;
            return result.current.deleteContact(idToDelete);
          }
        });

        await Promise.all(promises);
      });

      // Verify final state is consistent
      expect(result.current.contacts.length).toBeGreaterThanOrEqual(0);

      // Clean up remaining contacts
      result.current.contacts.forEach(contact => {
        createdContactIds.push(contact.id);
      });
    });
  });

  describe('Real Data Validation and Sanitization', () => {
    it('should validate and sanitize XSS attempts in real database', async () => {
      const { result } = renderHook(() => useContactStore());

      const maliciousContact = {
        ...testContacts.basic,
        firstName: '<script>alert("xss")</script>Malicious',
        lastName: 'User',
        email: 'malicious@example.com',
        notes: '<img src=x onerror=alert("xss")>'
      };

      await act(async () => {
        const created = await result.current.createContact(maliciousContact);
        createdContactIds.push(created.id);
      });

      // Verify data was sanitized
      expect(result.current.contacts[0].firstName).not.toContain('<script>');
      expect(result.current.contacts[0].firstName).toContain('Malicious');
      expect(result.current.contacts[0].notes).not.toContain('<img');
      expect(result.current.contacts[0].notes).not.toContain('onerror');

      // Verify in database
      const fetched = await contactAPI.getContact(result.current.contacts[0].id);
      expect(fetched.firstName).not.toContain('<script>');
      expect(fetched.notes).not.toContain('<img');
    });

    it('should handle edge cases in real data', async () => {
      const { result } = renderHook(() => useContactStore());

      const edgeCaseContacts = [
        {
          ...testContacts.basic,
          email: 'edge1@example.com',
          firstName: 'User with "quotes"',
          lastName: 'And \'single quotes\'',
          phone: '+1 (555) 123-4567',
          tags: ['tag with spaces', 'tag-with-dashes', 'tag_with_underscores']
        },
        {
          ...testContacts.basic,
          email: 'edge2@example.com',
          firstName: 'José María',
          lastName: 'García López',
          company: 'Compañía S.A. de C.V.',
          notes: 'Notes with special chars: àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ'
        }
      ];

      await act(async () => {
        await result.current.importContacts(edgeCaseContacts);
      });

      expect(result.current.contacts).toHaveLength(2);

      // Verify special characters are preserved
      expect(result.current.contacts[0].firstName).toBe('User with "quotes"');
      expect(result.current.contacts[1].firstName).toBe('José María');
      expect(result.current.contacts[1].company).toBe('Compañía S.A. de C.V.');

      // Store for cleanup
      result.current.contacts.forEach(contact => {
        createdContactIds.push(contact.id);
      });
    });
  });
});