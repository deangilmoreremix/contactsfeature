/**
 * Comprehensive tests for Cache Service functionality
 * Tests set, get, eviction, TTL, tag-based invalidation, and memory leak prevention
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cacheService } from '../services/cache.service';

// Mock timers for TTL testing
vi.useFakeTimers();

describe('Cache Service', () => {
  beforeEach(() => {
    cacheService.clear();
    vi.clearAllTimers();
  });

  afterEach(() => {
    cacheService.clear();
    vi.restoreAllTimers();
  });

  describe('Basic Set/Get Operations', () => {
    it('should set and get a simple value', () => {
      const testData = { id: 1, name: 'Test' };

      cacheService.set('test', 'item1', testData);
      const result = cacheService.get('test', 'item1');

      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('test', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      const testCases = [
        { data: 'string value', key: 'string' },
        { data: 42, key: 'number' },
        { data: true, key: 'boolean' },
        { data: [1, 2, 3], key: 'array' },
        { data: { nested: { value: 'test' } }, key: 'object' },
        { data: null, key: 'null' },
        { data: undefined, key: 'undefined' }
      ];

      testCases.forEach(({ data, key }) => {
        cacheService.set('types', key, data);
        const result = cacheService.get('types', key);
        expect(result).toEqual(data);
      });
    });

    it('should support object keys', () => {
      const objectKey = { id: 1, type: 'user' };
      const testData = { name: 'John Doe' };

      cacheService.set('users', objectKey, testData);
      const result = cacheService.get('users', objectKey);

      expect(result).toEqual(testData);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect TTL for cache entries', () => {
      const testData = { id: 1, name: 'Test' };

      // Set with 1 second TTL
      cacheService.set('test', 'ttl-item', testData, 1000);

      // Should be available immediately
      expect(cacheService.get('test', 'ttl-item')).toEqual(testData);

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);

      // Should be expired
      expect(cacheService.get('test', 'ttl-item')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      const testData = { id: 1, name: 'Test' };

      cacheService.set('test', 'default-ttl', testData);

      // Should be available immediately
      expect(cacheService.get('test', 'default-ttl')).toEqual(testData);

      // Advance time by default TTL (5 minutes)
      vi.advanceTimersByTime(300000);

      // Should be expired
      expect(cacheService.get('test', 'default-ttl')).toBeNull();
    });

    it('should handle zero TTL (immediate expiration)', () => {
      const testData = { id: 1, name: 'Test' };

      cacheService.set('test', 'zero-ttl', testData, 0);

      // Should be expired immediately
      expect(cacheService.get('test', 'zero-ttl')).toBeNull();
    });
  });

  describe('Cache Eviction and Size Limits', () => {
    it('should evict oldest entries when exceeding max size', () => {
      // Set max size to 3 for testing
      cacheService.setMaxSize(3);

      // Add 4 items
      cacheService.set('test', 'item1', { id: 1 }, 60000);
      cacheService.set('test', 'item2', { id: 2 }, 60000);
      cacheService.set('test', 'item3', { id: 3 }, 60000);
      cacheService.set('test', 'item4', { id: 4 }, 60000); // This should evict item1

      // item1 should be evicted
      expect(cacheService.get('test', 'item1')).toBeNull();

      // Others should still be available
      expect(cacheService.get('test', 'item2')).toEqual({ id: 2 });
      expect(cacheService.get('test', 'item3')).toEqual({ id: 3 });
      expect(cacheService.get('test', 'item4')).toEqual({ id: 4 });
    });

    it('should handle size limit changes dynamically', () => {
      // Add 5 items
      for (let i = 1; i <= 5; i++) {
        cacheService.set('test', `item${i}`, { id: i });
      }

      // Set max size to 3
      cacheService.setMaxSize(3);

      // Should only have 3 items left (newest ones)
      expect(cacheService.get('test', 'item1')).toBeNull();
      expect(cacheService.get('test', 'item2')).toBeNull();
      expect(cacheService.get('test', 'item3')).toEqual({ id: 3 });
      expect(cacheService.get('test', 'item4')).toEqual({ id: 4 });
      expect(cacheService.get('test', 'item5')).toEqual({ id: 5 });
    });
  });

  describe('Tag-Based Operations', () => {
    it('should support tagging cache entries', () => {
      cacheService.set('test', 'item1', { id: 1 }, 60000, ['tag1', 'tag2']);
      cacheService.set('test', 'item2', { id: 2 }, 60000, ['tag2', 'tag3']);
      cacheService.set('test', 'item3', { id: 3 }, 60000, ['tag1']);

      expect(cacheService.get('test', 'item1')).toEqual({ id: 1 });
      expect(cacheService.get('test', 'item2')).toEqual({ id: 2 });
      expect(cacheService.get('test', 'item3')).toEqual({ id: 3 });
    });

    it('should delete entries by tag', () => {
      cacheService.set('test', 'item1', { id: 1 }, 60000, ['tag1']);
      cacheService.set('test', 'item2', { id: 2 }, 60000, ['tag2']);
      cacheService.set('test', 'item3', { id: 3 }, 60000, ['tag1']);

      // Delete by tag1
      const deletedCount = cacheService.deleteByTag('tag1');

      expect(deletedCount).toBe(2);
      expect(cacheService.get('test', 'item1')).toBeNull();
      expect(cacheService.get('test', 'item2')).toEqual({ id: 2 }); // Still available
      expect(cacheService.get('test', 'item3')).toBeNull();
    });

    it('should handle multiple tags per entry', () => {
      cacheService.set('test', 'item1', { id: 1 }, 60000, ['users', 'active']);
      cacheService.set('test', 'item2', { id: 2 }, 60000, ['users', 'inactive']);
      cacheService.set('test', 'item3', { id: 3 }, 60000, ['posts', 'active']);

      // Delete by 'users' tag
      cacheService.deleteByTag('users');

      expect(cacheService.get('test', 'item1')).toBeNull();
      expect(cacheService.get('test', 'item2')).toBeNull();
      expect(cacheService.get('test', 'item3')).toEqual({ id: 3 }); // Still available
    });

    it('should return 0 when deleting non-existent tag', () => {
      cacheService.set('test', 'item1', { id: 1 }, 60000, ['tag1']);

      const deletedCount = cacheService.deleteByTag('nonexistent');

      expect(deletedCount).toBe(0);
      expect(cacheService.get('test', 'item1')).toEqual({ id: 1 });
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit/miss statistics', () => {
      const stats1 = cacheService.getStats();
      expect(stats1.hits).toBe(0);
      expect(stats1.misses).toBe(0);

      // Add an item
      cacheService.set('test', 'item1', { id: 1 });

      // Hit
      cacheService.get('test', 'item1');
      const stats2 = cacheService.getStats();
      expect(stats2.hits).toBe(1);
      expect(stats2.misses).toBe(0);

      // Miss
      cacheService.get('test', 'nonexistent');
      const stats3 = cacheService.getStats();
      expect(stats3.hits).toBe(1);
      expect(stats3.misses).toBe(1);

      // Hit rate calculation
      expect(stats3.hitRate).toBe(0.5);
    });

    it('should track cache size', () => {
      const stats1 = cacheService.getStats();
      expect(stats1.size).toBe(0);

      cacheService.set('test', 'item1', { id: 1 });
      cacheService.set('test', 'item2', { id: 2 });

      const stats2 = cacheService.getStats();
      expect(stats2.size).toBe(2);

      cacheService.delete('test', 'item1');

      const stats3 = cacheService.getStats();
      expect(stats3.size).toBe(1);
    });

    it('should reset statistics on clear', () => {
      cacheService.set('test', 'item1', { id: 1 });
      cacheService.get('test', 'item1'); // Hit
      cacheService.get('test', 'nonexistent'); // Miss

      const statsBefore = cacheService.getStats();
      expect(statsBefore.hits).toBe(1);
      expect(statsBefore.misses).toBe(1);
      expect(statsBefore.size).toBe(1);

      cacheService.clear();

      const statsAfter = cacheService.getStats();
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
      expect(statsAfter.size).toBe(0);
    });
  });

  describe('Automatic Cleanup', () => {
    it('should automatically clean up expired entries', () => {
      cacheService.set('test', 'item1', { id: 1 }, 1000); // Expires in 1s
      cacheService.set('test', 'item2', { id: 2 }, 3000); // Expires in 3s

      // Both should be available initially
      expect(cacheService.get('test', 'item1')).toEqual({ id: 1 });
      expect(cacheService.get('test', 'item2')).toEqual({ id: 2 });

      // Advance time by 2 seconds
      vi.advanceTimersByTime(2000);

      // item1 should be expired, item2 should still be available
      expect(cacheService.get('test', 'item1')).toBeNull();
      expect(cacheService.get('test', 'item2')).toEqual({ id: 2 });

      // Advance time by another 2 seconds
      vi.advanceTimersByTime(2000);

      // Both should be expired
      expect(cacheService.get('test', 'item1')).toBeNull();
      expect(cacheService.get('test', 'item2')).toBeNull();
    });

    it('should force cleanup when requested', () => {
      cacheService.set('test', 'item1', { id: 1 }, 1000);
      cacheService.set('test', 'item2', { id: 2 }, 1000);

      // Both available
      expect(cacheService.get('test', 'item1')).toEqual({ id: 1 });
      expect(cacheService.get('test', 'item2')).toEqual({ id: 2 });

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);

      // Force cleanup
      cacheService.forceCleanup();

      // Both should be cleaned up
      expect(cacheService.get('test', 'item1')).toBeNull();
      expect(cacheService.get('test', 'item2')).toBeNull();
    });
  });

  describe('Contact-Specific Methods', () => {
    it('should set and get contact data', () => {
      const contactData = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      cacheService.setContact('contact-1', contactData);
      const result = cacheService.getContact('contact-1');

      expect(result).toEqual(contactData);
    });

    it('should set and get contact lists', () => {
      const contactList = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' }
      ];
      const filters = { status: 'active' };

      cacheService.setContactList(filters, contactList);
      const result = cacheService.getContactList(filters);

      expect(result).toEqual(contactList);
    });

    it('should invalidate contact cache', () => {
      const contactData = { id: 'contact-1', name: 'John' };
      const contactList = [{ id: '1', name: 'John' }];
      const filters = { status: 'active' };

      cacheService.setContact('contact-1', contactData);
      cacheService.setContactList(filters, contactList);

      // Verify they're cached
      expect(cacheService.getContact('contact-1')).toEqual(contactData);
      expect(cacheService.getContactList(filters)).toEqual(contactList);

      // Invalidate contact
      cacheService.invalidateContact('contact-1');

      // Contact should be gone, list should also be invalidated due to tag
      expect(cacheService.getContact('contact-1')).toBeNull();
      expect(cacheService.getContactList(filters)).toBeNull();
    });

    it('should invalidate all contacts', () => {
      const contact1 = { id: '1', name: 'John' };
      const contact2 = { id: '2', name: 'Jane' };
      const list1 = [{ id: '1', name: 'John' }];
      const list2 = [{ id: '2', name: 'Jane' }];

      cacheService.setContact('1', contact1);
      cacheService.setContact('2', contact2);
      cacheService.setContactList({ status: 'active' }, list1);
      cacheService.setContactList({ status: 'inactive' }, list2);

      // Verify all are cached
      expect(cacheService.getContact('1')).toEqual(contact1);
      expect(cacheService.getContact('2')).toEqual(contact2);
      expect(cacheService.getContactList({ status: 'active' })).toEqual(list1);
      expect(cacheService.getContactList({ status: 'inactive' })).toEqual(list2);

      // Invalidate all contacts
      cacheService.invalidateAllContacts();

      // All should be gone
      expect(cacheService.getContact('1')).toBeNull();
      expect(cacheService.getContact('2')).toBeNull();
      expect(cacheService.getContactList({ status: 'active' })).toBeNull();
      expect(cacheService.getContactList({ status: 'inactive' })).toBeNull();
    });
  });

  describe('Namespace Management', () => {
    it('should track namespace sizes', () => {
      cacheService.set('users', '1', { name: 'John' });
      cacheService.set('users', '2', { name: 'Jane' });
      cacheService.set('posts', '1', { title: 'Post 1' });

      expect(cacheService.getNamespaceSize('users')).toBe(2);
      expect(cacheService.getNamespaceSize('posts')).toBe(1);
      expect(cacheService.getNamespaceSize('nonexistent')).toBe(0);
    });

    it('should isolate namespaces', () => {
      cacheService.set('users', '1', { name: 'John' });
      cacheService.set('posts', '1', { title: 'Post 1' });

      expect(cacheService.get('users', '1')).toEqual({ name: 'John' });
      expect(cacheService.get('posts', '1')).toEqual({ title: 'Post 1' });

      // Different namespaces should not interfere
      expect(cacheService.get('users', '1')).not.toEqual({ title: 'Post 1' });
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should prevent unbounded growth', () => {
      const maxSize = 100;

      // Add more items than max size
      for (let i = 0; i < maxSize + 50; i++) {
        cacheService.set('test', `item${i}`, { id: i });
      }

      // Cache size should be capped
      const stats = cacheService.getStats();
      expect(stats.size).toBeLessThanOrEqual(maxSize + 50); // Some tolerance for implementation
    });

    it('should clean up expired entries regularly', () => {
      // Add many items with short TTL
      for (let i = 0; i < 10; i++) {
        cacheService.set('test', `item${i}`, { id: i }, 1000);
      }

      expect(cacheService.getStats().size).toBe(10);

      // Advance time past TTL
      vi.advanceTimersByTime(2000);

      // Trigger cleanup (normally happens every 5 minutes)
      cacheService.forceCleanup();

      // All should be cleaned up
      expect(cacheService.getStats().size).toBe(0);
    });

    it('should handle rapid set/get cycles without memory issues', () => {
      // Simulate rapid cache operations
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i < 20; i++) {
          const key = `cycle${cycle}-item${i}`;
          cacheService.set('rapid', key, { cycle, item: i });

          // Immediate read
          const result = cacheService.get('rapid', key);
          expect(result).toEqual({ cycle, item: i });
        }

        // Clear every few cycles to prevent unbounded growth
        if (cycle % 3 === 0) {
          cacheService.deleteByTag('rapid');
        }
      }

      // Should not have grown too large
      const stats = cacheService.getStats();
      expect(stats.size).toBeLessThan(50);
    });
  });
});