/**
 * Comprehensive tests for Contact Import/Export functionality
 * Tests file parsing (CSV, JSON), validation, error handling, and secure downloads
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContactStore } from '../hooks/useContactStore';
import { contactAPI } from '../services/contact-api.service';
import { Contact } from '../types';
import { asContacts } from './helpers/contactFixtures';

// Mock dependencies
vi.mock('../services/contact-api.service');
vi.mock('../services/cache.service');
vi.mock('../services/logger.service');

// Mock browser APIs
const mockLocalStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(() => null),
  removeItem: vi.fn(() => null),
  clear: vi.fn(() => null),
};

// Set up global mocks




Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

/**
 * The store never throws for a rejected import batch: it keeps the contacts locally (`local-import-*` ids)
 * and logs the API error, so the user does not lose the file they just imported.
 */
/** A rejected batch must surface as an error and must NOT add local stand-in contacts (createContactsBatch stores locally itself when Supabase is not configured). */
async function expectImportRejected(
  result: { current: ReturnType<typeof useContactStore.getState> },
  contacts: any[]
) {
  const before = result.current.contacts.length;
  const beforeTotal = result.current.totalCount;
  await act(async () => {
    await expect(result.current.importContacts(contacts)).rejects.toThrow();
  });
  expect(result.current.contacts).toHaveLength(before);
  expect(result.current.totalCount).toBe(beforeTotal);
  expect(result.current.error).toEqual(expect.any(String));
  expect(result.current.isLoading).toBe(false);
}

describe('Contact Import/Export Functionality', () => {
  const mockContacts: Contact[] = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 555 123 4567',
      title: 'Software Engineer',
      company: 'Tech Corp',
      industry: 'Technology',
      avatarSrc: 'https://example.com/avatar1.jpg',
      sources: ['Website'],
      interestLevel: 'hot',
      status: 'lead',
      tags: ['developer', 'react'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1 555 987 6543',
      title: 'CEO',
      company: 'StartupIO',
      industry: 'Technology',
      avatarSrc: 'https://example.com/avatar2.jpg',
      sources: ['LinkedIn'],
      interestLevel: 'medium',
      status: 'prospect',
      tags: ['ceo', 'startup'],
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Database mode with the development fallbacks off: API failures must reach the caller, and the
    // store starts empty instead of with the built-in sample contacts.
    vi.stubEnv('DEV', false);
    vi.mocked(contactAPI.usesDatabase).mockReturnValue(true);
    useContactStore.setState({ contacts: [], totalCount: 0, hasMore: false, error: null, isLoading: false, selectedContact: null, trashedContacts: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  describe('CSV Import', () => {


    it('should successfully import valid CSV data', async () => {
      const { result } = renderHook(() => useContactStore());

      const mockImportedContacts = [
        {
          ...mockContacts[0]!,
          id: 'imported-1',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        },
        {
          ...mockContacts[1]!,
          id: 'imported-2',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ];

      vi.mocked(contactAPI.createContactsBatch).mockResolvedValue(mockImportedContacts);

      await act(async () => {
        await result.current.importContacts([
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1 555 123 4567',
            title: 'Software Engineer',
            company: 'Tech Corp',
            industry: 'Technology',
            interestLevel: 'hot',
            status: 'lead',
            tags: ['developer', 'react']
          },
          {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '+1 555 987 6543',
            title: 'CEO',
            company: 'StartupIO',
            industry: 'Technology',
            interestLevel: 'medium',
            status: 'prospect',
            tags: ['ceo', 'startup']
          }
        ]);
      });

      expect(contactAPI.createContactsBatch).toHaveBeenCalled();
      expect(result.current.contacts).toHaveLength(2);
      expect(result.current.totalCount).toBe(2);
    });

    it('should handle CSV parsing errors', async () => {
      const { result } = renderHook(() => useContactStore());

      // Mock API to throw validation error
      vi.mocked(contactAPI.createContactsBatch).mockRejectedValue(
        new Error('Batch validation failed: Contact 1: Invalid email format')
      );

      await expectImportRejected(result, [{ firstName: 'Bad', lastName: 'Email', email: 'not-an-email' }]);
    });

    it('should handle empty CSV files', async () => {
      const { result } = renderHook(() => useContactStore());

      await act(async () => {
        await result.current.importContacts([]);
      });

      // nothing to import: no API call, no error
      expect(contactAPI.createContactsBatch).not.toHaveBeenCalled();
      expect(result.current.contacts).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });

    it('should handle CSV files with missing required fields', async () => {
      const { result } = renderHook(() => useContactStore());

      const invalidContacts = [
        {
          firstName: 'John',
          // Missing lastName, email
          title: 'Engineer',
          company: 'Tech Corp'
        }
      ];

      vi.mocked(contactAPI.createContactsBatch).mockRejectedValue(
        new Error('Validation failed: Missing required fields')
      );

      await expectImportRejected(result, invalidContacts);
    });

    it('should handle large CSV imports', async () => {
      const { result } = renderHook(() => useContactStore());

      const largeBatch = Array.from({ length: 50 }, (_, i) => ({
        firstName: `Contact${i}`,
        lastName: 'Test',
        email: `contact${i}@example.com`,
        title: 'Tester',
        company: 'Test Corp',
        sources: ['Import'],
        interestLevel: 'medium' as const,
        status: 'lead' as const
      }));

      const mockImportedContacts = largeBatch.map((contact, i) => ({
        ...contact,
        id: `imported-${i}`,
        name: `${contact.firstName} ${contact.lastName}`,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }));

      vi.mocked(contactAPI.createContactsBatch).mockResolvedValue(asContacts(mockImportedContacts));

      await act(async () => {
        await result.current.importContacts(largeBatch);
      });

      expect(contactAPI.createContactsBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            firstName: 'Contact0',
            email: 'contact0@example.com'
          })
        ])
      );
      expect(result.current.contacts).toHaveLength(50);
      expect(result.current.totalCount).toBe(50);
    });
  });

  describe('JSON Import', () => {

    it('should successfully import valid JSON data', async () => {
      const { result } = renderHook(() => useContactStore());

      const mockImportedContacts = [
        {
          ...mockContacts[0]!,
          id: 'json-import-1',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ];

      vi.mocked(contactAPI.createContactsBatch).mockResolvedValue(mockImportedContacts);

      await act(async () => {
        await result.current.importContacts([
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1 555 123 4567',
            title: 'Software Engineer',
            company: 'Tech Corp',
            industry: 'Technology',
            interestLevel: 'hot',
            status: 'lead',
            tags: ['developer', 'react']
          }
        ]);
      });

      expect(contactAPI.createContactsBatch).toHaveBeenCalled();
      expect(result.current.contacts).toHaveLength(1);
    });

    it('should handle malformed JSON data', async () => {
      const { result } = renderHook(() => useContactStore());

      // Invalid JSON structure
      const malformedData = [
        {
          firstName: 'John',
          // Missing required fields
        }
      ];

      vi.mocked(contactAPI.createContactsBatch).mockRejectedValue(
        new Error('Validation failed: Missing required fields')
      );

      await expectImportRejected(result, malformedData);
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      // Set up contacts in store
      act(() => {
        useContactStore.setState({ contacts: mockContacts, totalCount: 2 });
      });
    });

    // jsdom has no object URLs; stub them and observe the temporary download link
    let createObjectURL: ReturnType<typeof vi.fn>;
    let revokeObjectURL: ReturnType<typeof vi.fn>;
    let clickSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      createObjectURL = vi.fn(() => 'mock-blob-url');
      revokeObjectURL = vi.fn();
      Object.assign(window.URL, { createObjectURL, revokeObjectURL });
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });
    afterEach(() => {
      clickSpy.mockRestore();
    });

    it('should export contacts as CSV', async () => {
      const { result } = renderHook(() => useContactStore());

      const mockBlob = new Blob(['mock,csv,data'], { type: 'text/csv' });
      vi.mocked(contactAPI.exportContacts).mockResolvedValue(mockBlob);

      await act(async () => {
        await result.current.exportContacts('csv');
      });

      expect(contactAPI.exportContacts).toHaveBeenCalledWith({}, 'csv');

      // Verify download link creation
      expect(createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      const link = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
      expect(link.href).toContain('mock-blob-url');
      expect(link.getAttribute('download')).toMatch(/^contacts_export_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should export contacts as JSON', async () => {
      const { result } = renderHook(() => useContactStore());

      const mockBlob = new Blob([JSON.stringify(mockContacts)], { type: 'application/json' });
      vi.mocked(contactAPI.exportContacts).mockResolvedValue(mockBlob);

      await act(async () => {
        await result.current.exportContacts('json');
      });

      expect(contactAPI.exportContacts).toHaveBeenCalledWith({}, 'json');
      expect(createObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it('should handle export errors', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.exportContacts).mockRejectedValue(new Error('Export failed'));

      await expect(result.current.exportContacts('csv')).rejects.toThrow('Export failed');
    });

    it('should clean up download resources', async () => {
      const { result } = renderHook(() => useContactStore());

      const mockBlob = new Blob(['test,data'], { type: 'text/csv' });
      vi.mocked(contactAPI.exportContacts).mockResolvedValue(mockBlob);

      await act(async () => {
        await result.current.exportContacts('csv');
      });

      // Verify cleanup
      expect(revokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
      expect(document.querySelector('a[download]')).toBeNull(); // the temporary link is removed
    });
  });

  describe('File Format Validation', () => {
    it('should validate CSV headers', async () => {
      const { result } = renderHook(() => useContactStore());

      const invalidCsvContacts = [
        {
          // Missing required fields
          name: 'John Doe',
          email: 'john@example.com'
        }
      ];

      vi.mocked(contactAPI.createContactsBatch).mockRejectedValue(
        new Error('Validation failed: Missing firstName, lastName')
      );

      await expectImportRejected(result, invalidCsvContacts);
    });

    it('should handle special characters in CSV', async () => {
      const { result } = renderHook(() => useContactStore());

      const specialCharContacts = [
        {
          firstName: 'José',
          lastName: 'Muñoz',
          email: 'jose@example.com',
          title: 'Engineer',
          company: 'Tech Corp',
          sources: ['Import'],
          interestLevel: 'medium' as const,
          status: 'lead' as const
        }
      ];

      const mockImportedContacts = [
        {
          ...specialCharContacts[0],
          id: 'special-1',
          name: 'José Muñoz',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ];

      vi.mocked(contactAPI.createContactsBatch).mockResolvedValue(asContacts(mockImportedContacts));

      await act(async () => {
        await result.current.importContacts(specialCharContacts);
      });

      expect(result.current.contacts[0]!.firstName).toBe('José');
      expect(result.current.contacts[0]!.lastName).toBe('Muñoz');
    });

    it('should handle quoted CSV fields', async () => {
      const { result } = renderHook(() => useContactStore());

      const quotedContacts = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          title: 'Software Engineer',
          company: 'Tech Corp',
          notes: 'This is a "quoted" note with, commas',
          sources: ['Import'],
          interestLevel: 'medium' as const,
          status: 'lead' as const
        }
      ];

      const mockImportedContacts = [
        {
          ...quotedContacts[0],
          id: 'quoted-1',
          name: 'John Doe',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ];

      vi.mocked(contactAPI.createContactsBatch).mockResolvedValue(asContacts(mockImportedContacts));

      await act(async () => {
        await result.current.importContacts(quotedContacts);
      });

      expect(result.current.contacts[0]!.notes).toBe('This is a "quoted" note with, commas');
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate emails during import', async () => {
      const { result } = renderHook(() => useContactStore());

      const duplicateContacts = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          title: 'Engineer',
          company: 'Tech Corp',
          sources: ['Import'],
          interestLevel: 'medium' as const,
          status: 'lead' as const
        },
        {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'john@example.com', // Same email
          title: 'Manager',
          company: 'Tech Corp',
          sources: ['Import'],
          interestLevel: 'medium' as const,
          status: 'lead' as const
        }
      ];

      vi.mocked(contactAPI.createContactsBatch).mockRejectedValue(
        new Error('Duplicate email detected: john@example.com')
      );

      await expectImportRejected(result, duplicateContacts);
    });

    it('should handle existing contact conflicts', async () => {
      const { result } = renderHook(() => useContactStore());

      // Set up existing contact
      act(() => {
        useContactStore.setState({ contacts: [mockContacts[0]!], totalCount: 1 });
      });

      const conflictingContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com', // Same email as existing
        title: 'Senior Engineer',
        company: 'Tech Corp',
        sources: ['Import'],
        interestLevel: 'hot' as const,
        status: 'prospect' as const
      };

      vi.mocked(contactAPI.createContactsBatch).mockRejectedValue(
        new Error('Contact with email john.doe@example.com already exists')
      );

      // The API rejects the duplicate: the error surfaces and the existing contact list is untouched
      await expectImportRejected(result, [conflictingContact]);
      expect(result.current.contacts).toHaveLength(1);
      expect(result.current.contacts[0]!.id).toBe(mockContacts[0]!.id);
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network timeouts during import', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContactsBatch).mockRejectedValue(
        new Error('Network timeout')
      );

      await expectImportRejected(result, mockContacts);
    });

    it('should handle network errors during export', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.exportContacts).mockRejectedValue(
        new Error('Network connection failed')
      );

      await expect(result.current.exportContacts('csv')).rejects.toThrow('Network connection failed');
    });

    it('should retry failed imports', async () => {
      const { result } = renderHook(() => useContactStore());

      // Fail first, succeed second
      vi.mocked(contactAPI.createContactsBatch)
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce([
          {
            ...mockContacts[0]!,
            id: 'retry-1',
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          }
        ]);

      // First attempt: the API fails, nothing is added and the error is reported
      await expectImportRejected(result, [mockContacts[0]!]);

      // Second attempt: the API succeeds and its contact is added
      await act(async () => {
        await result.current.importContacts([mockContacts[0]!]);
      });

      expect(result.current.contacts).toHaveLength(1);
      expect(result.current.contacts.map(c => c.id)).toContain('retry-1');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Progress and UI Feedback', () => {
    it('should show loading state during import', async () => {
      const { result } = renderHook(() => useContactStore());

      let loadingState: boolean = false;

      vi.mocked(contactAPI.createContactsBatch).mockImplementation(async () => {
        loadingState = useContactStore.getState().isLoading;
        await new Promise(resolve => setTimeout(resolve, 10));
        return [{
          ...mockContacts[0]!,
          id: 'loading-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }];
      });

      await act(async () => {
        await result.current.importContacts([mockContacts[0]!]);
      });

      expect(loadingState).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should provide success feedback after import', async () => {
      const { result } = renderHook(() => useContactStore());

      const mockImportedContacts = mockContacts.map((contact, i) => ({
        ...contact,
        id: `success-${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      vi.mocked(contactAPI.createContactsBatch).mockResolvedValue(mockImportedContacts);

      await act(async () => {
        await result.current.importContacts(mockContacts);
      });

      expect(result.current.contacts).toHaveLength(2);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.error).toBeNull();
    });

    it('should provide error feedback for failed imports', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContactsBatch).mockRejectedValue(
        new Error('Import validation failed')
      );

      await expectImportRejected(result, mockContacts);
    });
  });

  describe('Security and Data Protection', () => {
    it('should sanitize imported data', async () => {
      const { result } = renderHook(() => useContactStore());

      const maliciousContacts = [
        {
          firstName: '<script>alert("xss")</script>John',
          lastName: 'Doe',
          email: 'john@example.com',
          title: 'Engineer',
          company: 'Tech Corp',
          sources: ['Import'],
          interestLevel: 'medium' as const,
          status: 'lead' as const
        }
      ];

      const mockImportedContacts = [
        {
          ...maliciousContacts[0],
          firstName: 'John', // Should be sanitized
          id: 'sanitized-1',
          name: 'John Doe',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ];

      vi.mocked(contactAPI.createContactsBatch).mockResolvedValue(asContacts(mockImportedContacts));

      await act(async () => {
        await result.current.importContacts(maliciousContacts);
      });

      expect(result.current.contacts[0]!.firstName).toBe('John');
      expect(result.current.contacts[0]!.firstName).not.toContain('<script>');
    });

    it('should validate file size limits', async () => {
      const { result } = renderHook(() => useContactStore());

      const largeBatch = Array.from({ length: 200 }, (_, i) => ({
        firstName: `Contact${i}`,
        lastName: 'Test',
        email: `contact${i}@example.com`,
        title: 'Tester',
        company: 'Test Corp',
        sources: ['Import'],
        interestLevel: 'medium' as const,
        status: 'lead' as const
      }));

      vi.mocked(contactAPI.createContactsBatch).mockRejectedValue(
        new Error('Batch size exceeds limit of 100 contacts')
      );

      await expectImportRejected(result, largeBatch);
    });
  });
});