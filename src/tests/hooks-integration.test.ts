/**
 * Comprehensive tests for React Hooks integration
 * Tests state management, effects, and component integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useContactStore } from '../hooks/useContactStore';
import { useSearchContacts } from '../hooks/useSearchContacts';
import { useDebounce } from '../hooks/useDebounce';
import { contactAPI } from '../services/contact-api.service';
import { Contact } from '../types';

// Mock dependencies
vi.mock('../services/contact-api.service');
vi.mock('../services/cache.service');
vi.mock('../services/logger.service');

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null),
  },
  writable: true,
});

Object.defineProperty(window, 'document', {
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

describe('React Hooks Integration', () => {
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useContactStore Hook', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useContactStore());

      expect(result.current.contacts).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.selectedContact).toBeNull();
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle contact creation', async () => {
      const { result } = renderHook(() => useContactStore());

      const newContact = {
        firstName: 'Alice',
        lastName: 'Johnson',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        title: 'Designer',
        company: 'Design Co',
        sources: ['Website'],
        interestLevel: 'medium' as const,
        status: 'lead' as const
      };

      // Mock API response
      const createdContact = {
        ...newContact,
        id: 'new-contact-1',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      };

      vi.mocked(contactAPI.createContact).mockResolvedValue(createdContact);

      await act(async () => {
        await result.current.createContact(newContact);
      });

      expect(contactAPI.createContact).toHaveBeenCalledWith(newContact);
      expect(result.current.contacts).toContain(createdContact);
      expect(result.current.totalCount).toBe(1);
    });

    it('should handle contact updates', async () => {
      const { result } = renderHook(() => useContactStore());

      // Set up initial contact
      act(() => {
        result.current.contacts = [mockContacts[0]];
        result.current.totalCount = 1;
      });

      const updates = { title: 'Senior Software Engineer', phone: '+1 555 999 8888' };
      const updatedContact = {
        ...mockContacts[0],
        ...updates,
        updatedAt: expect.any(String)
      };

      vi.mocked(contactAPI.updateContact).mockResolvedValue(updatedContact);

      await act(async () => {
        await result.current.updateContact(mockContacts[0].id, updates);
      });

      expect(contactAPI.updateContact).toHaveBeenCalledWith(mockContacts[0].id, updates);
      expect(result.current.contacts[0]).toEqual(updatedContact);
    });

    it('should handle contact deletion', async () => {
      const { result } = renderHook(() => useContactStore());

      // Set up initial contacts
      act(() => {
        result.current.contacts = [...mockContacts];
        result.current.totalCount = 2;
        result.current.selectedContact = mockContacts[0];
      });

      vi.mocked(contactAPI.deleteContact).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.deleteContact(mockContacts[0].id);
      });

      expect(contactAPI.deleteContact).toHaveBeenCalledWith(mockContacts[0].id);
      expect(result.current.contacts).toHaveLength(1);
      expect(result.current.contacts[0]).toEqual(mockContacts[1]);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.selectedContact).toBeNull();
    });

    it('should handle contact selection', () => {
      const { result } = renderHook(() => useContactStore());

      act(() => {
        result.current.selectContact(mockContacts[0]);
      });

      expect(result.current.selectedContact).toEqual(mockContacts[0]);

      act(() => {
        result.current.selectContact(null);
      });

      expect(result.current.selectedContact).toBeNull();
    });

    it('should handle loading states', async () => {
      const { result } = renderHook(() => useContactStore());

      const mockResponse = {
        contacts: mockContacts,
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      let loadingState;
      await act(async () => {
        const fetchPromise = result.current.fetchContacts();
        loadingState = result.current.isLoading;
        await fetchPromise;
      });

      expect(loadingState).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      const { result } = renderHook(() => useContactStore());

      const errorMessage = 'Network error';
      vi.mocked(contactAPI.getContacts).mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await result.current.fetchContacts();
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useSearchContacts Hook', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSearchContacts());

      expect(result.current.query).toBe('');
      expect(result.current.debouncedQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasResults).toBe(false);
      expect(result.current.resultCount).toBe(0);
    });

    it('should update query and trigger search', async () => {
      const { result } = renderHook(() => useSearchContacts());

      const mockResponse = {
        contacts: [mockContacts[0]],
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.searchContacts).mockResolvedValue(mockResponse);

      act(() => {
        result.current.updateQuery('John');
      });

      // Wait for debounced search
      await waitFor(() => {
        expect(result.current.debouncedQuery).toBe('John');
      });

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false);
      });

      expect(contactAPI.searchContacts).toHaveBeenCalledWith('John');
      expect(result.current.searchResults).toEqual([mockContacts[0]]);
      expect(result.current.hasResults).toBe(true);
      expect(result.current.resultCount).toBe(1);
    });

    it('should debounce search queries', async () => {
      const { result } = renderHook(() => useSearchContacts());

      act(() => {
        result.current.updateQuery('J');
        result.current.updateQuery('Jo');
        result.current.updateQuery('Joh');
        result.current.updateQuery('John');
      });

      // Should only trigger search for the final query
      await waitFor(() => {
        expect(result.current.debouncedQuery).toBe('John');
      });

      expect(contactAPI.searchContacts).toHaveBeenCalledTimes(1);
      expect(contactAPI.searchContacts).toHaveBeenCalledWith('John');
    });

    it('should clear search results', () => {
      const { result } = renderHook(() => useSearchContacts());

      act(() => {
        result.current.searchResults = mockContacts;
        result.current.resultCount = 2;
        result.current.clearSearch();
      });

      expect(result.current.query).toBe('');
      expect(result.current.debouncedQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.resultCount).toBe(0);
      expect(result.current.hasResults).toBe(false);
    });

    it('should handle search errors', async () => {
      const { result } = renderHook(() => useSearchContacts());

      const errorMessage = 'Search failed';
      vi.mocked(contactAPI.searchContacts).mockRejectedValue(new Error(errorMessage));

      act(() => {
        result.current.updateQuery('test');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });

      expect(result.current.isSearching).toBe(false);
      expect(result.current.hasResults).toBe(false);
    });
  });

  describe('useDebounce Hook', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      // Change value
      rerender({ value: 'updated', delay: 500 });

      // Should still return initial value immediately
      expect(result.current).toBe('initial');

      // Wait for debounce delay
      await waitFor(() => {
        expect(result.current).toBe('updated');
      }, { timeout: 600 });
    });

    it('should handle rapid changes', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'first' } }
      );

      // Rapid changes
      rerender({ value: 'second' });
      rerender({ value: 'third' });
      rerender({ value: 'final' });

      // Should eventually return the final value
      await waitFor(() => {
        expect(result.current).toBe('final');
      }, { timeout: 400 });
    });

    it('should handle delay changes', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'test', delay: 1000 } }
      );

      rerender({ value: 'updated', delay: 100 });

      await waitFor(() => {
        expect(result.current).toBe('updated');
      }, { timeout: 200 });
    });
  });

  describe('Hook Integration and State Synchronization', () => {
    it('should synchronize between contact store and search hook', async () => {
      const { result: storeResult } = renderHook(() => useContactStore());
      const { result: searchResult } = renderHook(() => useSearchContacts());

      // Set up contacts in store
      act(() => {
        storeResult.current.contacts = mockContacts;
      });

      // Search should work with store data
      const mockResponse = {
        contacts: [mockContacts[0]],
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.searchContacts).mockResolvedValue(mockResponse);

      act(() => {
        searchResult.current.updateQuery('John');
      });

      await waitFor(() => {
        expect(searchResult.current.searchResults).toEqual([mockContacts[0]]);
      });
    });

    it('should handle concurrent operations', async () => {
      const { result } = renderHook(() => useContactStore());

      // Mock responses
      const createResponse = {
        ...mockContacts[0],
        id: 'created-1'
      };

      const updateResponse = {
        ...mockContacts[0],
        title: 'Updated Title'
      };

      vi.mocked(contactAPI.createContact).mockResolvedValue(createResponse);
      vi.mocked(contactAPI.updateContact).mockResolvedValue(updateResponse);

      // Perform concurrent operations
      await act(async () => {
        const [created, updated] = await Promise.all([
          result.current.createContact({
            firstName: 'Test',
            lastName: 'User',
            name: 'Test User',
            email: 'test@example.com',
            title: 'Tester',
            company: 'Test Co',
            sources: ['Test'],
            interestLevel: 'medium',
            status: 'lead'
          }),
          result.current.updateContact(mockContacts[0].id, { title: 'Updated Title' })
        ]);

        expect(created).toEqual(createResponse);
        expect(updated).toEqual(updateResponse);
      });
    });

    it('should maintain state consistency across operations', async () => {
      const { result } = renderHook(() => useContactStore());

      // Initial state
      expect(result.current.contacts).toEqual([]);
      expect(result.current.totalCount).toBe(0);

      // Create contact
      const newContact = {
        ...mockContacts[0],
        id: 'test-1'
      };

      vi.mocked(contactAPI.createContact).mockResolvedValue(newContact);

      await act(async () => {
        await result.current.createContact(mockContacts[0]);
      });

      expect(result.current.contacts).toHaveLength(1);
      expect(result.current.totalCount).toBe(1);

      // Update contact
      const updatedContact = {
        ...newContact,
        title: 'Senior Engineer'
      };

      vi.mocked(contactAPI.updateContact).mockResolvedValue(updatedContact);

      await act(async () => {
        await result.current.updateContact('test-1', { title: 'Senior Engineer' });
      });

      expect(result.current.contacts[0].title).toBe('Senior Engineer');
      expect(result.current.totalCount).toBe(1);

      // Delete contact
      vi.mocked(contactAPI.deleteContact).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.deleteContact('test-1');
      });

      expect(result.current.contacts).toHaveLength(0);
      expect(result.current.totalCount).toBe(0);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large datasets efficiently', async () => {
      const { result } = renderHook(() => useContactStore());

      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockContacts[0],
        id: `contact-${i}`,
        name: `Contact ${i}`,
        email: `contact${i}@example.com`
      }));

      const mockResponse = {
        contacts: largeDataset,
        total: 1000,
        limit: 1000,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      const startTime = Date.now();

      await act(async () => {
        await result.current.fetchContacts();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.current.contacts).toHaveLength(1000);
      expect(result.current.totalCount).toBe(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should clean up resources on unmount', () => {
      const { result, unmount } = renderHook(() => useContactStore());

      // Set some state
      act(() => {
        result.current.contacts = mockContacts;
        result.current.selectedContact = mockContacts[0];
      });

      expect(result.current.contacts).toHaveLength(2);
      expect(result.current.selectedContact).toEqual(mockContacts[0]);

      // Unmount should not crash
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid state changes without memory leaks', async () => {
      const { result } = renderHook(() => useContactStore());

      // Simulate rapid operations
      for (let i = 0; i < 10; i++) {
        const contact = {
          ...mockContacts[0],
          id: `rapid-${i}`,
          name: `Rapid Contact ${i}`
        };

        vi.mocked(contactAPI.createContact).mockResolvedValue(contact);

        await act(async () => {
          await result.current.createContact(mockContacts[0]);
        });
      }

      expect(result.current.contacts.length).toBe(10);
      expect(result.current.totalCount).toBe(10);
    });
  });

  describe('Error Boundaries and Resilience', () => {
    it('should handle hook errors gracefully', async () => {
      const { result } = renderHook(() => useContactStore());

      // Mock API to throw error
      vi.mocked(contactAPI.getContacts).mockRejectedValue(new Error('API Error'));

      await act(async () => {
        await result.current.fetchContacts();
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.isLoading).toBe(false);
      // Should still have basic functionality
      expect(typeof result.current.createContact).toBe('function');
    });

    it('should recover from errors', async () => {
      const { result } = renderHook(() => useContactStore());

      // First call fails
      vi.mocked(contactAPI.getContacts).mockRejectedValueOnce(new Error('Temporary error'));

      await act(async () => {
        await result.current.fetchContacts();
      });

      expect(result.current.error).toBe('Temporary error');

      // Second call succeeds
      const mockResponse = {
        contacts: mockContacts,
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.fetchContacts();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.contacts).toEqual(mockContacts);
    });
  });
});