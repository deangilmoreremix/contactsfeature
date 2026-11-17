/**
 * Comprehensive tests for Encryption Service
 * Tests AES encryption/decryption, localStorage integration, and security features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CryptoJS from 'crypto-js';
import { encryptionService } from '../utils/encryption';

// The cipher is real (AES from crypto-js); only localStorage is replaced, by a Map-backed fake.
const ENCRYPTION_KEY = 'contacts-encryption-key-v1';
const storage = new Map<string, string>();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('Encryption Service', () => {
  const testData = {
    id: 'test-123',
    name: 'John Doe',
    email: 'john@example.com',
    sensitive: 'secret-data'
  };

  const testJson = JSON.stringify(testData);

  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    mockLocalStorage.getItem.mockImplementation((k: string) => storage.get(k) ?? null);
    mockLocalStorage.setItem.mockImplementation((k: string, v: string) => { storage.set(k, v); });
    mockLocalStorage.removeItem.mockImplementation((k: string) => { storage.delete(k); });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt data successfully', () => {
      const encrypted = encryptionService.encrypt(testData);

      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      // The result is AES ciphertext, not the plain JSON
      expect(encrypted).not.toContain(testJson);
      expect(encrypted).not.toContain('john@example.com');
      expect(encrypted).not.toContain('secret-data');
    });

    it('should decrypt data successfully', () => {
      const encrypted = encryptionService.encrypt(testData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toEqual(testData);
    });

    it('should handle different data types', () => {
      const testCases = [
        'string value',
        42,
        true,
        [1, 2, 3],
        { nested: { value: 'test' } },
        null
        // `undefined` has no JSON representation, so it cannot be stored
      ];

      testCases.forEach((data) => {
        const encrypted = encryptionService.encrypt(data);
        const decrypted = encryptionService.decrypt(encrypted);

        expect(decrypted).toEqual(data);
      });
    });

    it('should handle empty objects', () => {
      const emptyData = {};
      const encrypted = encryptionService.encrypt(emptyData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toEqual(emptyData);
    });

    it('should handle large data objects', () => {
      const largeData = {
        id: 'large-test',
        data: Array.from({ length: 1000 }, (_, i) => ({
          index: i,
          value: `item-${i}`,
          nested: {
            prop1: `nested-${i}`,
            prop2: i * 2,
            array: [i, i + 1, i + 2]
          }
        }))
      };

      const encrypted = encryptionService.encrypt(largeData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toEqual(largeData);
      expect(decrypted.data).toHaveLength(1000);
    });
  });

  describe('localStorage Integration', () => {
    it('should set encrypted item in localStorage', () => {
      encryptionService.setEncryptedItem('test-key', testData);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', expect.any(String));
      const stored = mockLocalStorage.setItem.mock.calls[0][1] as string;
      expect(stored).not.toContain('john@example.com');
      expect(encryptionService.decrypt(stored)).toEqual(testData);
    });

    it('should get decrypted item from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(encryptionService.encrypt(testData));

      const result = encryptionService.getDecryptedItem('test-key');

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = encryptionService.getDecryptedItem('non-existent-key');

      expect(result).toBeNull();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('non-existent-key');
    });

    it('should remove encrypted item from localStorage', () => {
      encryptionService.removeEncryptedItem('test-key');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle corrupted encrypted data gracefully', () => {
      // Mock corrupted data that can't be decrypted
      mockLocalStorage.getItem.mockReturnValue('corrupted-data');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = encryptionService.getDecryptedItem('test-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Decryption failed:', expect.any(Error));
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');

      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors during set', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        encryptionService.setEncryptedItem('test-key', testData);
      }).toThrow('localStorage quota exceeded'); // the storage error is rethrown as is

      expect(consoleSpy).toHaveBeenCalledWith('Failed to store encrypted data:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors during get', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = encryptionService.getDecryptedItem('test-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve decrypted data:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Security Features', () => {
    it('should use consistent encryption key', () => {
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };

      const encrypted1 = encryptionService.encrypt(data1);
      const encrypted2 = encryptionService.encrypt(data2);

      // Both are decryptable with the one documented key
      expect(CryptoJS.AES.decrypt(encrypted1, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)).toBe(JSON.stringify(data1));
      expect(CryptoJS.AES.decrypt(encrypted2, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)).toBe(JSON.stringify(data2));

      // But produce different encrypted outputs for different data
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should produce different encrypted outputs for same data', () => {
      // CryptoJS passphrase mode salts every encryption, so the output is not deterministic
      const encrypted1 = encryptionService.encrypt(testData);
      const encrypted2 = encryptionService.encrypt(testData);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryptionService.decrypt(encrypted1)).toEqual(testData);
      expect(encryptionService.decrypt(encrypted2)).toEqual(testData);
    });

    it('should handle special characters in data', () => {
      const specialData = {
        name: 'José María ñoño',
        email: 'test+tag@example.com',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        unicode: '🚀💡🔒',
        multiline: 'Line 1\nLine 2\tTab'
      };

      const encrypted = encryptionService.encrypt(specialData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toEqual(specialData);
    });

    it('should handle binary-like data', () => {
      const binaryData = {
        buffer: new Uint8Array([1, 2, 3, 255, 0]),
        blob: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      };

      const encrypted = encryptionService.encrypt(binaryData);
      const decrypted = encryptionService.decrypt(encrypted);

      // JSON has no binary type: the Uint8Array comes back as a plain index -> byte object, the string is intact
      expect(decrypted).toEqual(JSON.parse(JSON.stringify(binaryData)));
      expect(decrypted.blob).toBe(binaryData.blob);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption of circular references', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      expect(() => {
        encryptionService.encrypt(circularData);
      }).toThrow('Failed to encrypt data');
    });

    it('should handle decryption of invalid data', () => {
      expect(() => {
        encryptionService.decrypt('invalid-encrypted-data');
      }).toThrow('Failed to decrypt data');
    });

    it('should handle decryption of empty string', () => {
      expect(() => {
        encryptionService.decrypt('');
      }).toThrow('Failed to decrypt data');
    });

    it('should handle decryption with wrong key', () => {
      const encrypted = encryptionService.encrypt(testData);

      // Another key cannot recover the plain text (empty or garbage, never the JSON)
      let wrongKeyResult = '';
      try {
        wrongKeyResult = CryptoJS.AES.decrypt(encrypted, 'some-other-key').toString(CryptoJS.enc.Utf8);
      } catch {
        wrongKeyResult = ''; // malformed UTF-8 is also a failed decryption
      }
      expect(wrongKeyResult).not.toBe(testJson);

      // The service's own key does
      expect(encryptionService.decrypt(encrypted)).toEqual(testData);
    });
  });

  describe('Performance', () => {
    it('should handle rapid encryption/decryption cycles', () => {
      const iterations = 100;
      const results: any[] = [];

      for (let i = 0; i < iterations; i++) {
        const data = { iteration: i, timestamp: Date.now() };
        const encrypted = encryptionService.encrypt(data);
        const decrypted = encryptionService.decrypt(encrypted);
        results.push(decrypted);
      }

      expect(results).toHaveLength(iterations);
      results.forEach((result, index) => {
        expect(result.iteration).toBe(index);
      });
    });

    it('should maintain performance with large datasets', () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        data: 'x'.repeat(1000), // 1KB per item
        nested: {
          level1: {
            level2: {
              level3: `deep-value-${i}`
            }
          }
        }
      }));

      const startTime = Date.now();
      const encrypted = encryptionService.encrypt(largeDataset);
      const decrypted = encryptionService.decrypt(encrypted);
      const endTime = Date.now();

      expect(decrypted).toEqual(largeDataset);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Integration with Contact Data', () => {
    const contactData = {
      id: 'contact-123',
      firstName: 'Alice',
      lastName: 'Smith',
      name: 'Alice Smith',
      email: 'alice.smith@company.com',
      phone: '+1 555 123 4567',
      title: 'VP of Engineering',
      company: 'Tech Corp',
      industry: 'Software',
      avatarSrc: 'https://example.com/avatar.jpg',
      sources: ['LinkedIn', 'Website'],
      interestLevel: 'hot',
      status: 'prospect',
      tags: ['enterprise', 'decision-maker'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      customFields: {
        'Budget': '$500K-$1M',
        'Timeline': 'Q2 2024',
        'Team Size': '50+ engineers'
      },
      socialProfiles: {
        linkedin: 'https://linkedin.com/in/alice-smith',
        twitter: 'https://twitter.com/alice_smith'
      }
    };

    it('should encrypt/decrypt contact data correctly', () => {
      const encrypted = encryptionService.encrypt(contactData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toEqual(contactData);
      expect(decrypted.email).toBe('alice.smith@company.com');
      expect(decrypted.customFields).toEqual(contactData.customFields);
    });

    it('should store and retrieve contact data from localStorage', () => {
      encryptionService.setEncryptedItem('contacts', [contactData]);

      const retrieved = encryptionService.getDecryptedItem('contacts');

      expect(retrieved).toEqual([contactData]);
      expect(retrieved[0].name).toBe('Alice Smith');
    });

    it('should handle multiple contacts in storage', () => {
      const contacts = [contactData, { ...contactData, id: 'contact-456', name: 'Bob Johnson' }];

      encryptionService.setEncryptedItem('contacts', contacts);
      const retrieved = encryptionService.getDecryptedItem('contacts');

      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].name).toBe('Alice Smith');
      expect(retrieved[1].name).toBe('Bob Johnson');
    });

    it('should protect sensitive contact information', () => {
      // Verify that encrypted data doesn't contain readable sensitive information
      const encrypted = encryptionService.encrypt(contactData);

      expect(encrypted).not.toContain('alice.smith@company.com');
      expect(encrypted).not.toContain('Tech Corp');
      expect(encrypted).not.toContain('+1 555 123 4567');

      // But decrypted data should contain it
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted.email).toBe('alice.smith@company.com');
      expect(decrypted.company).toBe('Tech Corp');
      expect(decrypted.phone).toBe('+1 555 123 4567');
    });
  });
});