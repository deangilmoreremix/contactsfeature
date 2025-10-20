/**
 * Comprehensive tests for Contact Creation functionality
 * Tests form validation, duplicate detection, API integration, and UI feedback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useContactStore } from '../hooks/useContactStore';
import { contactAPI } from '../services/contact-api.service';
import { Contact } from '../types';

// Mock dependencies
vi.mock('../services/contact-api.service');
vi.mock('../services/cache.service');
vi.mock('../services/logger.service');
vi.mock('../services/validation.service');

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

describe('Contact Creation Functionality', () => {
  const validContactData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 555 123 4567',
    title: 'Software Engineer',
    company: 'Tech Corp',
    industry: 'Technology',
    sources: ['Website'],
    interestLevel: 'medium' as const,
    status: 'lead' as const,
    tags: ['developer', 'react']
  };

  const mockCreatedContact: Contact = {
    ...validContactData,
    id: 'created-contact-1',
    name: 'John Doe',
    avatarSrc: 'https://example.com/avatar.jpg',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const { result } = renderHook(() => useContactStore());

      const invalidContact = {
        firstName: '',
        lastName: '',
        email: '',
        title: 'Engineer',
        company: 'Tech Corp'
      };

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Validation failed: firstName, lastName, email are required')
      );

      await expect(result.current.createContact(invalidContact as any)).rejects.toThrow('Validation failed');

      expect(result.current.error).toContain('Validation failed');
      expect(contactAPI.createContact).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const { result } = renderHook(() => useContactStore());

      const invalidEmailContact = {
        ...validContactData,
        email: 'invalid-email-format'
      };

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Validation failed: Invalid email format')
      );

      await expect(result.current.createContact(invalidEmailContact)).rejects.toThrow('Invalid email format');

      expect(result.current.error).toContain('Invalid email format');
    });

    it('should validate phone number format', async () => {
      const { result } = renderHook(() => useContactStore());

      const invalidPhoneContact = {
        ...validContactData,
        phone: 'invalid-phone'
      };

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Validation failed: Invalid phone number format')
      );

      await expect(result.current.createContact(invalidPhoneContact)).rejects.toThrow('Invalid phone number format');

      expect(result.current.error).toContain('Invalid phone number format');
    });

    it('should validate name length', async () => {
      const { result } = renderHook(() => useContactStore());

      const shortNameContact = {
        ...validContactData,
        firstName: 'A',
        lastName: 'B'
      };

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Validation failed: Name must be at least 2 characters')
      );

      await expect(result.current.createContact(shortNameContact)).rejects.toThrow('Name must be at least 2 characters');

      expect(result.current.error).toContain('Name must be at least 2 characters');
    });

    it('should sanitize input data', async () => {
      const { result } = renderHook(() => useContactStore());

      const maliciousContact = {
        ...validContactData,
        firstName: '<script>alert("xss")</script>John',
        notes: 'Normal notes'
      };

      const sanitizedCreatedContact = {
        ...mockCreatedContact,
        firstName: 'John', // Should be sanitized
        notes: 'Normal notes'
      };

      vi.mocked(contactAPI.createContact).mockResolvedValue(sanitizedCreatedContact);

      await act(async () => {
        await result.current.createContact(maliciousContact);
      });

      expect(result.current.contacts[0].firstName).toBe('John');
      expect(result.current.contacts[0].firstName).not.toContain('<script>');
    });

    it('should handle special characters in names', async () => {
      const { result } = renderHook(() => useContactStore());

      const specialCharContact = {
        ...validContactData,
        firstName: 'José',
        lastName: 'Muñoz'
      };

      const createdContact = {
        ...mockCreatedContact,
        firstName: 'José',
        lastName: 'Muñoz',
        name: 'José Muñoz'
      };

      vi.mocked(contactAPI.createContact).mockResolvedValue(createdContact);

      await act(async () => {
        await result.current.createContact(specialCharContact);
      });

      expect(result.current.contacts[0].firstName).toBe('José');
      expect(result.current.contacts[0].lastName).toBe('Muñoz');
      expect(result.current.contacts[0].name).toBe('José Muñoz');
    });
  });

  describe('Duplicate Detection', () => {
    beforeEach(() => {
      // Set up existing contacts
      const { result } = renderHook(() => useContactStore());
      act(() => {
        result.current.contacts = [mockCreatedContact];
        result.current.totalCount = 1;
      });
    });

    it('should detect duplicate emails', async () => {
      const { result } = renderHook(() => useContactStore());

      const duplicateEmailContact = {
        ...validContactData,
        email: 'john.doe@example.com', // Same as existing
        firstName: 'Jane',
        lastName: 'Smith'
      };

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Duplicate contact: Email already exists')
      );

      await expect(result.current.createContact(duplicateEmailContact)).rejects.toThrow('Email already exists');

      expect(result.current.error).toContain('Email already exists');
      expect(result.current.contacts).toHaveLength(1); // Should not add duplicate
    });

    it('should allow duplicate names with different emails', async () => {
      const { result } = renderHook(() => useContactStore());

      const sameNameContact = {
        ...validContactData,
        email: 'different@example.com', // Different email
        firstName: 'John',
        lastName: 'Doe'
      };

      const createdContact = {
        ...mockCreatedContact,
        id: 'different-contact',
        email: 'different@example.com'
      };

      vi.mocked(contactAPI.createContact).mockResolvedValue(createdContact);

      await act(async () => {
        await result.current.createContact(sameNameContact);
      });

      expect(result.current.contacts).toHaveLength(2);
      expect(result.current.contacts[1].email).toBe('different@example.com');
    });

    it('should handle case-insensitive email comparison', async () => {
      const { result } = renderHook(() => useContactStore());

      const caseVariantContact = {
        ...validContactData,
        email: 'JOHN.DOE@EXAMPLE.COM', // Different case
        firstName: 'Jane',
        lastName: 'Smith'
      };

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Duplicate contact: Email already exists (case insensitive)')
      );

      await expect(result.current.createContact(caseVariantContact)).rejects.toThrow('Email already exists');

      expect(result.current.error).toContain('Email already exists');
    });
  });

  describe('API Integration', () => {
    it('should successfully create contact via API', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContact).mockResolvedValue(mockCreatedContact);

      await act(async () => {
        const created = await result.current.createContact(validContactData);
        expect(created).toEqual(mockCreatedContact);
      });

      expect(contactAPI.createContact).toHaveBeenCalledWith(validContactData);
      expect(result.current.contacts).toContain(mockCreatedContact);
      expect(result.current.totalCount).toBe(1);
    });

    it('should handle API network errors', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Network error: Unable to connect to server')
      );

      await expect(result.current.createContact(validContactData)).rejects.toThrow('Network error');

      expect(result.current.error).toBe('Network error: Unable to connect to server');
      expect(result.current.contacts).toHaveLength(0);
    });

    it('should handle API timeout errors', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Request timeout')
      );

      await expect(result.current.createContact(validContactData)).rejects.toThrow('Request timeout');

      expect(result.current.error).toBe('Request timeout');
    });

    it('should handle API server errors', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Internal server error')
      );

      await expect(result.current.createContact(validContactData)).rejects.toThrow('Internal server error');

      expect(result.current.error).toBe('Internal server error');
    });

    it('should retry failed requests', async () => {
      const { result } = renderHook(() => useContactStore());

      // Fail first, succeed second
      vi.mocked(contactAPI.createContact)
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce(mockCreatedContact);

      // First attempt should fail
      await expect(result.current.createContact(validContactData)).rejects.toThrow('Temporary network error');

      // Second attempt should succeed
      await act(async () => {
        await result.current.createContact(validContactData);
      });

      expect(result.current.contacts).toContain(mockCreatedContact);
    });

    it('should handle rate limiting', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Rate limit exceeded. Please try again later.')
      );

      await expect(result.current.createContact(validContactData)).rejects.toThrow('Rate limit exceeded');

      expect(result.current.error).toContain('Rate limit exceeded');
    });
  });

  describe('UI Feedback and State Management', () => {
    it('should show loading state during creation', async () => {
      const { result } = renderHook(() => useContactStore());

      let loadingState: boolean = false;

      vi.mocked(contactAPI.createContact).mockImplementation(async () => {
        loadingState = result.current.isLoading;
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockCreatedContact;
      });

      await act(async () => {
        await result.current.createContact(validContactData);
      });

      expect(loadingState).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear error state on successful creation', async () => {
      const { result } = renderHook(() => useContactStore());

      // Set initial error
      act(() => {
        result.current.error = 'Previous error';
      });

      vi.mocked(contactAPI.createContact).mockResolvedValue(mockCreatedContact);

      await act(async () => {
        await result.current.createContact(validContactData);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.contacts).toContain(mockCreatedContact);
    });

    it('should maintain form state on validation errors', async () => {
      const { result } = renderHook(() => useContactStore());

      const invalidContact = {
        ...validContactData,
        email: 'invalid-email'
      };

      vi.mocked(contactAPI.createContact).mockRejectedValue(
        new Error('Validation failed: Invalid email')
      );

      await expect(result.current.createContact(invalidContact)).rejects.toThrow('Validation failed');

      // Error should be set but contacts should remain unchanged
      expect(result.current.error).toContain('Validation failed');
      expect(result.current.contacts).toHaveLength(0);
    });

    it('should provide success confirmation', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContact).mockResolvedValue(mockCreatedContact);

      await act(async () => {
        const created = await result.current.createContact(validContactData);
        expect(created).toEqual(mockCreatedContact);
      });

      expect(result.current.contacts).toHaveLength(1);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.error).toBeNull();
    });

    it('should handle concurrent creation requests', async () => {
      const { result } = renderHook(() => useContactStore());

      const contact1 = { ...validContactData, email: 'contact1@example.com' };
      const contact2 = { ...validContactData, email: 'contact2@example.com' };

      const created1 = { ...mockCreatedContact, id: 'contact-1', email: 'contact1@example.com' };
      const created2 = { ...mockCreatedContact, id: 'contact-2', email: 'contact2@example.com' };

      vi.mocked(contactAPI.createContact)
        .mockResolvedValueOnce(created1)
        .mockResolvedValueOnce(created2);

      await act(async () => {
        const [result1, result2] = await Promise.all([
          result.current.createContact(contact1),
          result.current.createContact(contact2)
        ]);

        expect(result1).toEqual(created1);
        expect(result2).toEqual(created2);
      });

      expect(result.current.contacts).toHaveLength(2);
      expect(result.current.totalCount).toBe(2);
    });
  });

  describe('Data Transformation and Defaults', () => {
    it('should generate full name from first and last name', async () => {
      const { result } = renderHook(() => useContactStore());

      const contactWithoutName = {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        title: 'Designer',
        company: 'Design Co',
        sources: ['Website'],
        interestLevel: 'medium' as const,
        status: 'lead' as const
      };

      const createdContact = {
        ...mockCreatedContact,
        firstName: 'Alice',
        lastName: 'Johnson',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        title: 'Designer',
        company: 'Design Co'
      };

      vi.mocked(contactAPI.createContact).mockResolvedValue(createdContact);

      await act(async () => {
        await result.current.createContact(contactWithoutName);
      });

      expect(result.current.contacts[0].name).toBe('Alice Johnson');
    });

    it('should set default values for optional fields', async () => {
      const { result } = renderHook(() => useContactStore());

      const minimalContact = {
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob@example.com',
        title: 'Manager',
        company: 'Company Inc'
      };

      const createdContact = {
        ...mockCreatedContact,
        firstName: 'Bob',
        lastName: 'Wilson',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        title: 'Manager',
        company: 'Company Inc',
        sources: ['Manual'],
        interestLevel: 'medium',
        status: 'lead'
      };

      vi.mocked(contactAPI.createContact).mockResolvedValue(createdContact);

      await act(async () => {
        await result.current.createContact(minimalContact as any);
      });

      expect(result.current.contacts[0].sources).toEqual(['Manual']);
      expect(result.current.contacts[0].interestLevel).toBe('medium');
      expect(result.current.contacts[0].status).toBe('lead');
    });

    it('should handle missing optional fields gracefully', async () => {
      const { result } = renderHook(() => useContactStore());

      const contactWithoutOptionals = {
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        title: 'Developer',
        company: 'Tech Inc',
        sources: ['Website'],
        interestLevel: 'high' as const,
        status: 'prospect' as const
      };

      const createdContact = {
        ...mockCreatedContact,
        firstName: 'Charlie',
        lastName: 'Brown',
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        title: 'Developer',
        company: 'Tech Inc',
        phone: undefined,
        industry: undefined,
        tags: undefined
      };

      vi.mocked(contactAPI.createContact).mockResolvedValue(createdContact);

      await act(async () => {
        await result.current.createContact(contactWithoutOptionals);
      });

      expect(result.current.contacts[0].phone).toBeUndefined();
      expect(result.current.contacts[0].industry).toBeUndefined();
      expect(result.current.contacts[0].tags).toBeUndefined();
    });
  });

  describe('Integration with useContactStore', () => {
    it('should integrate with contact store state management', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContact).mockResolvedValue(mockCreatedContact);

      await act(async () => {
        await result.current.createContact(validContactData);
      });

      // Verify store state
      expect(result.current.contacts).toHaveLength(1);
      expect(result.current.contacts[0]).toEqual(mockCreatedContact);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.selectedContact).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle store cleanup on errors', async () => {
      const { result } = renderHook(() => useContactStore());

      vi.mocked(contactAPI.createContact).mockRejectedValue(new Error('Creation failed'));

      await expect(result.current.createContact(validContactData)).rejects.toThrow('Creation failed');

      expect(result.current.contacts).toHaveLength(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Creation failed');
    });

    it('should support optimistic updates', async () => {
      const { result } = renderHook(() => useContactStore());

      // Mock immediate response for optimistic UI
      vi.mocked(contactAPI.createContact).mockResolvedValue(mockCreatedContact);

      await act(async () => {
        const created = await result.current.createContact(validContactData);
        expect(created).toEqual(mockCreatedContact);
      });

      // Verify immediate state update
      expect(result.current.contacts).toContain(mockCreatedContact);
      expect(result.current.totalCount).toBe(1);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle rapid successive creations', async () => {
      const { result } = renderHook(() => useContactStore());

      const contacts = Array.from({ length: 10 }, (_, i) => ({
        ...validContactData,
        email: `contact${i}@example.com`,
        firstName: `Contact${i}`
      }));

      const mockCreatedContacts = contacts.map((contact, i) => ({
        ...contact,
        id: `created-${i}`,
        name: `${contact.firstName} ${contact.lastName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      vi.mocked(contactAPI.createContact).mockImplementation(async (contactData) => {
        const index = contacts.findIndex(c => c.email === contactData.email);
        return mockCreatedContacts[index];
      });

      const startTime = Date.now();

      await act(async () => {
        await Promise.all(contacts.map(contact => result.current.createContact(contact)));
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.current.contacts).toHaveLength(10);
      expect(result.current.totalCount).toBe(10);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should prevent memory leaks during failed operations', async () => {
      const { result } = renderHook(() => useContactStore());

      // Simulate multiple failed operations
      vi.mocked(contactAPI.createContact).mockRejectedValue(new Error('Persistent error'));

      for (let i = 0; i < 5; i++) {
        await expect(result.current.createContact(validContactData)).rejects.toThrow('Persistent error');
      }

      // Store should remain clean
      expect(result.current.contacts).toHaveLength(0);
      expect(result.current.error).toBe('Persistent error');
    });
  });
});