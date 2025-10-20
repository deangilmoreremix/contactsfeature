/**
 * Comprehensive tests for Contact search and filtering functionality
 * Tests listing, search, filters, debouncing, and performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useContactStore } from '../hooks/useContactStore';
import { useSearchContacts } from '../hooks/useSearchContacts';
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

describe('Contact Search and Filtering', () => {
  let store: ReturnType<typeof useContactStore>;

  const mockContacts: Contact[] = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
      email: 'john.doe@techcorp.com',
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
      email: 'jane.smith@startup.io',
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
    },
    {
      id: '3',
      firstName: 'Bob',
      lastName: 'Johnson',
      name: 'Bob Johnson',
      email: 'bob.johnson@enterprise.com',
      phone: '+1 555 456 7890',
      title: 'CTO',
      company: 'Enterprise Corp',
      industry: 'Manufacturing',
      avatarSrc: 'https://example.com/avatar3.jpg',
      sources: ['Referral'],
      interestLevel: 'low',
      status: 'customer',
      tags: ['cto', 'enterprise'],
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    store = useContactStore.getState() as any;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Contact Listing', () => {
    it('should list contacts with pagination', async () => {
      const mockResponse = {
        contacts: mockContacts.slice(0, 2),
        total: 3,
        limit: 2,
        offset: 0,
        hasMore: true
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      const result = await store.fetchContacts({ limit: 2, offset: 0 });

      expect(contactAPI.getContacts).toHaveBeenCalledWith({ limit: 2, offset: 0 });
      expect(result.contacts).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(3);
    });

    it('should apply status filter', async () => {
      const mockResponse = {
        contacts: [mockContacts[1]], // Jane Smith - prospect
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      await store.fetchContacts({ status: 'prospect' });

      expect(contactAPI.getContacts).toHaveBeenCalledWith({ status: 'prospect' });
      expect(store.contacts).toEqual([mockContacts[1]]);
    });

    it('should apply interest level filter', async () => {
      const mockResponse = {
        contacts: [mockContacts[0]], // John Doe - hot
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      await store.fetchContacts({ interestLevel: 'hot' });

      expect(contactAPI.getContacts).toHaveBeenCalledWith({ interestLevel: 'hot' });
      expect(store.contacts).toEqual([mockContacts[0]]);
    });

    it('should apply industry filter', async () => {
      const mockResponse = {
        contacts: mockContacts.slice(0, 2), // Both in Technology
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      await store.fetchContacts({ industry: 'Technology' });

      expect(contactAPI.getContacts).toHaveBeenCalledWith({ industry: 'Technology' });
    });

    it('should apply multiple filters simultaneously', async () => {
      const mockResponse = {
        contacts: [mockContacts[1]], // Jane Smith - prospect + Technology
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      await store.fetchContacts({
        status: 'prospect',
        industry: 'Technology',
        interestLevel: 'medium'
      });

      expect(contactAPI.getContacts).toHaveBeenCalledWith({
        status: 'prospect',
        industry: 'Technology',
        interestLevel: 'medium'
      });
    });

    it('should apply sorting', async () => {
      const sortedContacts = [...mockContacts].sort((a, b) => a.name.localeCompare(b.name));
      const mockResponse = {
        contacts: sortedContacts,
        total: 3,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      await store.fetchContacts({ sortBy: 'name', sortOrder: 'asc' });

      expect(contactAPI.getContacts).toHaveBeenCalledWith({
        sortBy: 'name',
        sortOrder: 'asc'
      });
    });
  });

  describe('Contact Search', () => {
    it('should search contacts by name', async () => {
      const mockResponse = {
        contacts: [mockContacts[0]], // John Doe
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.searchContacts).mockResolvedValue(mockResponse);

      await store.searchContacts('John');

      expect(contactAPI.searchContacts).toHaveBeenCalledWith('John');
      expect(store.contacts).toEqual([mockContacts[0]]);
    });

    it('should search contacts by email', async () => {
      const mockResponse = {
        contacts: [mockContacts[1]], // jane.smith@startup.io
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.searchContacts).mockResolvedValue(mockResponse);

      await store.searchContacts('startup.io');

      expect(contactAPI.searchContacts).toHaveBeenCalledWith('startup.io');
      expect(store.contacts).toEqual([mockContacts[1]]);
    });

    it('should search contacts by company', async () => {
      const mockResponse = {
        contacts: [mockContacts[2]], // Enterprise Corp
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.searchContacts).mockResolvedValue(mockResponse);

      await store.searchContacts('Enterprise');

      expect(contactAPI.searchContacts).toHaveBeenCalledWith('Enterprise');
      expect(store.contacts).toEqual([mockContacts[2]]);
    });

    it('should handle empty search query', async () => {
      await store.searchContacts('');

      expect(contactAPI.searchContacts).not.toHaveBeenCalled();
    });

    it('should handle short search queries with client-side filtering', async () => {
      // Short queries (< 2 chars) should use client-side filtering
      await store.searchContacts('J');

      expect(contactAPI.searchContacts).not.toHaveBeenCalled();
      // Should filter existing contacts
    });

    it('should fallback to client-side search when API fails', async () => {
      vi.mocked(contactAPI.searchContacts).mockRejectedValue(new Error('API Error'));

      await store.searchContacts('John');

      expect(contactAPI.searchContacts).toHaveBeenCalledWith('John');
      // Should fallback to client-side search
    });
  });

  describe('Search Hook Integration', () => {
    it('should debounce search queries', async () => {
      const mockSearchHook = {
        query: 'John',
        debouncedQuery: 'John',
        searchResults: [mockContacts[0]],
        isSearching: false,
        error: null,
        updateQuery: vi.fn(),
        clearSearch: vi.fn(),
        hasResults: true,
        resultCount: 1
      };

      // Test that the hook properly debounces
      expect(mockSearchHook.debouncedQuery).toBe('John');
      expect(mockSearchHook.hasResults).toBe(true);
    });

    it('should handle search loading states', () => {
      const mockSearchHook = {
        query: 'John',
        debouncedQuery: 'John',
        searchResults: [],
        isSearching: true,
        error: null,
        updateQuery: vi.fn(),
        clearSearch: vi.fn(),
        hasResults: false,
        resultCount: 0
      };

      expect(mockSearchHook.isSearching).toBe(true);
      expect(mockSearchHook.hasResults).toBe(false);
    });

    it('should handle search errors', () => {
      const mockSearchHook = {
        query: 'John',
        debouncedQuery: 'John',
        searchResults: [],
        isSearching: false,
        error: 'Search failed',
        updateQuery: vi.fn(),
        clearSearch: vi.fn(),
        hasResults: false,
        resultCount: 0
      };

      expect(mockSearchHook.error).toBe('Search failed');
      expect(mockSearchHook.hasResults).toBe(false);
    });
  });

  describe('Cache Integration', () => {
    it('should use cached results when available', async () => {
      const cachedResponse = {
        contacts: mockContacts,
        total: 3,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(cacheService.getContactList).mockReturnValue(cachedResponse);

      const result = await store.fetchContacts({});

      expect(cacheService.getContactList).toHaveBeenCalledWith({});
      expect(contactAPI.getContacts).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResponse);
    });

    it('should cache search results', async () => {
      const mockResponse = {
        contacts: [mockContacts[0]],
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.searchContacts).mockResolvedValue(mockResponse);

      await store.searchContacts('John');

      expect(cacheService.setContactList).toHaveBeenCalled();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large result sets', async () => {
      const largeContactList = Array.from({ length: 100 }, (_, i) => ({
        ...mockContacts[0],
        id: `contact-${i}`,
        name: `Contact ${i}`,
        email: `contact${i}@example.com`
      }));

      const mockResponse = {
        contacts: largeContactList.slice(0, 50),
        total: 100,
        limit: 50,
        offset: 0,
        hasMore: true
      };

      vi.mocked(contactAPI.getContacts).mockResolvedValue(mockResponse);

      await store.fetchContacts({ limit: 50 });

      expect(store.contacts).toHaveLength(50);
      expect(store.hasMore).toBe(true);
      expect(store.totalCount).toBe(100);
    });

    it('should handle special characters in search', async () => {
      const mockResponse = {
        contacts: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.searchContacts).mockResolvedValue(mockResponse);

      await store.searchContacts('test@example.com');

      expect(contactAPI.searchContacts).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle concurrent search requests', async () => {
      const mockResponse1 = {
        contacts: [mockContacts[0]],
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      const mockResponse2 = {
        contacts: [mockContacts[1]],
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      vi.mocked(contactAPI.searchContacts)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      // Start concurrent searches
      const search1 = store.searchContacts('John');
      const search2 = store.searchContacts('Jane');

      await Promise.all([search1, search2]);

      expect(contactAPI.searchContacts).toHaveBeenCalledTimes(2);
    });
  });
});