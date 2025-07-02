/**
 * Contact API Service
 * RESTful contact management with full CRUD operations
 */

import { httpClient } from './http-client.service';
import { validationService } from './validation.service';
import { cacheService } from './cache.service';
import { logger } from './logger.service';
import { Contact } from '../types/contact';

export interface ContactFilters {
  search?: string;
  interestLevel?: string;
  status?: string;
  industry?: string;
  sources?: string[];
  tags?: string[];
  hasAIScore?: boolean;
  scoreRange?: { min: number; max: number };
  dateRange?: { start: string; end: string };
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactListResponse {
  contacts: Contact[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ContactStats {
  total: number;
  byStatus: Record<string, number>;
  byInterestLevel: Record<string, number>;
  byIndustry: Record<string, number>;
  withAIScore: number;
  averageScore: number;
}

class ContactAPIService {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  
  // CRUD Operations
  async createContact(contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    // Validate input
    const sanitized = validationService.sanitizeContact(contactData);
    const validation = validationService.validateContact(sanitized);
    
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors).flat().join(', ');
      const error = new Error(`Contact validation failed: ${errorMessage}`);
      logger.error('Contact validation failed', error, validation.errors);
      throw error;
    }
    
    try {
      const response = await httpClient.post<Contact>(
        `${this.baseURL}/contacts`,
        sanitized,
        {
          timeout: 15000,
          retries: 2,
        }
      );
      
      const contact = response.data;
      
      // Cache the new contact
      cacheService.setContact(contact.id, contact);
      
      // Invalidate contact lists
      cacheService.deleteByTag('list');
      
      logger.info('Contact created successfully', { contactId: contact.id });
      
      return contact;
    } catch (error) {
      logger.error('Failed to create contact', error as Error, contactData);
      
      // For development fallback if API is not available
      if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
        logger.warn('Using fallback contact creation in development mode');
        const fallbackContact: Contact = {
          ...sanitized as any,
          id: `local-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return fallbackContact;
      }
      
      throw error;
    }
  }
  
  async getContact(contactId: string): Promise<Contact> {
    // Check cache first
    const cached = cacheService.getContact(contactId);
    if (cached) {
      return cached;
    }
    
    try {
      const response = await httpClient.get<Contact>(
        `${this.baseURL}/contacts/${contactId}`,
        undefined,
        {
          timeout: 10000,
          retries: 2,
          cache: {
            key: `contact_${contactId}`,
            ttl: 300000, // 5 minutes
            tags: ['contact'],
          },
        }
      );
      
      const contact = response.data;
      
      // Cache the contact
      cacheService.setContact(contactId, contact);
      
      return contact;
    } catch (error) {
      logger.error('Failed to get contact', error as Error, { contactId });
      
      // Development fallback
      if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
        // Try to find contact in local storage as fallback in development
        try {
          const localContacts = localStorage.getItem('contacts');
          if (localContacts) {
            const contacts = JSON.parse(localContacts);
            const contact = contacts.find((c: Contact) => c.id === contactId);
            if (contact) {
              return contact;
            }
          }
        } catch (e) {
          // Ignore local storage errors
        }
      }
      
      throw error;
    }
  }
  
  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    // Validate updates
    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }
    
    const sanitized = validationService.sanitizeContact(updates);
    
    try {
      const response = await httpClient.patch<Contact>(
        `${this.baseURL}/contacts/${contactId}`,
        sanitized,
        {
          timeout: 15000,
          retries: 2,
        }
      );
      
      const contact = response.data;
      
      // Update cache
      cacheService.setContact(contactId, contact);
      
      // Invalidate lists that might contain this contact
      cacheService.deleteByTag('list');
      
      logger.info('Contact updated successfully', { contactId, updates: Object.keys(updates) });
      
      return contact;
    } catch (error) {
      logger.error('Failed to update contact', error as Error, { contactId, updates });
      
      // Development fallback
      if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
        try {
          // Get existing contact (from cache or fallback)
          let contact: Contact | null = null;
          try {
            contact = await this.getContact(contactId);
          } catch (e) {
            // If contact doesn't exist in cache or API, create a fallback
            contact = {
              id: contactId,
              firstName: 'Fallback',
              lastName: 'User',
              name: 'Fallback User',
              email: 'fallback@example.com',
              title: 'Unknown',
              company: 'Unknown Company',
              status: 'lead' as any,
              interestLevel: 'medium' as any,
              sources: [],
              avatarSrc: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          
          // Apply updates
          const updatedContact: Contact = {
            ...contact,
            ...sanitized as any,
            updatedAt: new Date().toISOString()
          };
          
          // Cache the updated contact
          cacheService.setContact(contactId, updatedContact);
          
          logger.warn('Using fallback contact update in development mode');
          return updatedContact;
        } catch (fallbackError) {
          logger.error('Fallback update failed', fallbackError as Error);
        }
      }
      
      throw error;
    }
  }
  
  async deleteContact(contactId: string): Promise<void> {
    try {
      await httpClient.delete(
        `${this.baseURL}/contacts/${contactId}`,
        {
          timeout: 10000,
          retries: 1,
        }
      );
      
      // Remove from cache
      cacheService.invalidateContact(contactId);
      
      logger.info('Contact deleted successfully', { contactId });
    } catch (error) {
      logger.error('Failed to delete contact', error as Error, { contactId });
      
      // Development fallback
      if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
        // Remove from cache anyway
        cacheService.invalidateContact(contactId);
        logger.warn('Using fallback contact deletion in development mode');
        return;
      }
      
      throw error;
    }
  }
  
  // List and Search Operations
  async getContacts(filters: ContactFilters = {}): Promise<ContactListResponse> {
    const cacheKey = JSON.stringify(filters);
    
    // Check cache
    const cached = cacheService.getContactList(filters);
    if (cached) {
      return cached;
    }
    
    try {
      const response = await httpClient.get<ContactListResponse>(
        `${this.baseURL}/contacts`,
        filters,
        {
          timeout: 20000,
          retries: 2,
          cache: {
            key: `contact_list_${cacheKey}`,
            ttl: 180000, // 3 minutes
            tags: ['contact', 'list'],
          },
        }
      );
      
      const result = response.data;
      
      // Cache individual contacts
      result.contacts.forEach(contact => {
        cacheService.setContact(contact.id, contact, 300000);
      });
      
      // Cache the list
      cacheService.setContactList(filters, result);
      
      return result;
    } catch (error) {
      logger.error('Failed to get contacts', error as Error, { filters });
      
      // Development fallback
      if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
        // Try to get contacts from local storage
        try {
          let contacts: Contact[] = [];
          const storedContacts = localStorage.getItem('contacts');
          
          if (storedContacts) {
            contacts = JSON.parse(storedContacts);
          } else {
            // Use sample fallback data
            contacts = [
              {
                id: '1',
                firstName: 'Jane',
                lastName: 'Doe',
                name: 'Jane Doe',
                email: 'jane.doe@microsoft.com',
                phone: '+1 425 882 8080',
                title: 'Marketing Director',
                company: 'Microsoft',
                industry: 'Technology',
                avatarSrc: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
                sources: ['LinkedIn', 'Email'],
                interestLevel: 'hot',
                status: 'prospect',
                lastConnected: '2024-01-15',
                aiScore: 85,
                tags: ['Enterprise', 'High Value'],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-15T14:30:00Z'
              },
              {
                id: '2',
                firstName: 'John',
                lastName: 'Smith',
                name: 'John Smith',
                email: 'john.smith@example.com',
                title: 'Developer',
                company: 'Tech Company',
                avatarSrc: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
                sources: ['Website'],
                interestLevel: 'medium',
                status: 'lead',
                createdAt: '2024-01-02T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z'
              }
            ];
            localStorage.setItem('contacts', JSON.stringify(contacts));
          }
          
          // Apply filters
          let filteredContacts = [...contacts];
          
          if (filters.search) {
            const search = filters.search.toLowerCase();
            filteredContacts = filteredContacts.filter(c => 
              c.name.toLowerCase().includes(search) ||
              c.email.toLowerCase().includes(search) ||
              c.company.toLowerCase().includes(search)
            );
          }
          
          if (filters.interestLevel && filters.interestLevel !== 'all') {
            filteredContacts = filteredContacts.filter(c => c.interestLevel === filters.interestLevel);
          }
          
          if (filters.status && filters.status !== 'all') {
            filteredContacts = filteredContacts.filter(c => c.status === filters.status);
          }
          
          if (filters.hasAIScore !== undefined) {
            filteredContacts = filteredContacts.filter(c => 
              filters.hasAIScore ? !!c.aiScore : !c.aiScore
            );
          }
          
          // Apply sorting
          if (filters.sortBy) {
            filteredContacts.sort((a: any, b: any) => {
              const aValue = a[filters.sortBy!];
              const bValue = b[filters.sortBy!];
              
              if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
              if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
              return 0;
            });
          }
          
          // Apply pagination
          const limit = filters.limit || 50;
          const offset = filters.offset || 0;
          
          const paginatedContacts = filteredContacts.slice(offset, offset + limit);
          
          const result: ContactListResponse = {
            contacts: paginatedContacts,
            total: filteredContacts.length,
            limit,
            offset,
            hasMore: offset + paginatedContacts.length < filteredContacts.length
          };
          
          logger.warn('Using fallback contacts in development mode');
          return result;
        } catch (fallbackError) {
          logger.error('Fallback contacts retrieval failed', fallbackError as Error);
        }
      }
      
      throw error;
    }
  }
  
  async searchContacts(query: string, filters: Partial<ContactFilters> = {}): Promise<ContactListResponse> {
    const searchFilters = {
      ...filters,
      search: query,
      limit: filters.limit || 50,
    };
    
    return this.getContacts(searchFilters);
  }
  
  // Batch Operations
  async createContactsBatch(contacts: Array<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Contact[]> {
    if (contacts.length === 0) {
      throw new Error('No contacts provided');
    }
    
    if (contacts.length > 100) {
      throw new Error('Batch size cannot exceed 100 contacts');
    }
    
    // Validate all contacts
    const validatedContacts: any[] = [];
    const validationErrors: string[] = [];
    
    contacts.forEach((contact, index) => {
      const sanitized = validationService.sanitizeContact(contact);
      const validation = validationService.validateContact(sanitized);
      
      if (validation.isValid) {
        validatedContacts.push(sanitized);
      } else {
        validationErrors.push(`Contact ${index + 1}: ${Object.values(validation.errors).flat().join(', ')}`);
      }
    });
    
    if (validationErrors.length > 0) {
      const error = new Error(`Batch validation failed: ${validationErrors.join('; ')}`);
      logger.error('Batch contact validation failed', error, { validationErrors });
      throw error;
    }
    
    try {
      const response = await httpClient.post<Contact[]>(
        `${this.baseURL}/contacts/batch`,
        { contacts: validatedContacts },
        {
          timeout: 60000, // 1 minute for batch operations
          retries: 1,
        }
      );
      
      const createdContacts = response.data;
      
      // Cache created contacts
      createdContacts.forEach(contact => {
        cacheService.setContact(contact.id, contact);
      });
      
      // Invalidate lists
      cacheService.deleteByTag('list');
      
      logger.info('Batch contact creation successful', { count: createdContacts.length });
      
      return createdContacts;
    } catch (error) {
      logger.error('Failed to create contacts batch', error as Error, { count: validatedContacts.length });
      
      // Development fallback
      if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
        logger.warn('Using fallback batch contact creation in development mode');
        
        const createdContacts: Contact[] = validatedContacts.map((contact, index) => ({
          ...contact,
          id: `batch-${Date.now()}-${index}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        
        // Store in local storage
        try {
          const storedContacts = localStorage.getItem('contacts');
          const existingContacts = storedContacts ? JSON.parse(storedContacts) : [];
          const allContacts = [...existingContacts, ...createdContacts];
          localStorage.setItem('contacts', JSON.stringify(allContacts));
        } catch (e) {
          // Ignore local storage errors
        }
        
        return createdContacts;
      }
      
      throw error;
    }
  }
  
  async updateContactsBatch(updates: Array<{ id: string; data: Partial<Contact> }>): Promise<Contact[]> {
    if (updates.length === 0) {
      throw new Error('No updates provided');
    }
    
    if (updates.length > 50) {
      throw new Error('Batch update size cannot exceed 50 contacts');
    }
    
    try {
      const response = await httpClient.patch<Contact[]>(
        `${this.baseURL}/contacts/batch`,
        { updates },
        {
          timeout: 45000,
          retries: 1,
        }
      );
      
      const updatedContacts = response.data;
      
      // Update cache
      updatedContacts.forEach(contact => {
        cacheService.setContact(contact.id, contact);
      });
      
      // Invalidate lists
      cacheService.deleteByTag('list');
      
      logger.info('Batch contact update successful', { count: updatedContacts.length });
      
      return updatedContacts;
    } catch (error) {
      logger.error('Failed to update contacts batch', error as Error, { count: updates.length });
      
      // Development fallback
      if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
        logger.warn('Using fallback batch contact update in development mode');
        
        const updatedContacts: Contact[] = [];
        
        for (const update of updates) {
          try {
            // Get the contact
            const contact = await this.getContact(update.id);
            // Apply updates
            const updatedContact: Contact = {
              ...contact,
              ...update.data,
              updatedAt: new Date().toISOString()
            };
            // Cache the updated contact
            cacheService.setContact(updatedContact.id, updatedContact);
            updatedContacts.push(updatedContact);
          } catch (e) {
            // Skip failed updates
          }
        }
        
        return updatedContacts;
      }
      
      throw error;
    }
  }
  
  // Export Operations
  async exportContacts(filters: ContactFilters = {}, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    try {
      const response = await httpClient.get<ArrayBuffer>(
        `${this.baseURL}/contacts/export`,
        { ...filters, format },
        {
          timeout: 120000, // 2 minutes for exports
          retries: 1,
          headers: {
            'Accept': format === 'csv' ? 'text/csv' : 'application/json',
          },
        }
      );
      
      const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
      return new Blob([response.data], { type: mimeType });
    } catch (error) {
      logger.error('Failed to export contacts', error as Error, { filters, format });
      
      // Development fallback
      if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'development') {
        logger.warn('Using fallback contact export in development mode');
        
        // Get contacts
        const result = await this.getContacts(filters);
        
        if (format === 'json') {
          const jsonString = JSON.stringify(result.contacts, null, 2);
          return new Blob([jsonString], { type: 'application/json' });
        } else {
          // CSV export
          const headers = [
            'id', 'firstName', 'lastName', 'email', 'phone', 'title', 
            'company', 'industry', 'interestLevel', 'status', 'aiScore'
          ];
          
          const rows = result.contacts.map(contact => {
            return headers.map(header => {
              const value = (contact as any)[header];
              // Handle values that might contain commas or quotes
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value !== undefined && value !== null ? value : '';
            }).join(',');
          });
          
          const csvContent = [headers.join(','), ...rows].join('\n');
          return new Blob([csvContent], { type: 'text/csv' });
        }
      }
      
      throw error;
    }
  }
}

export const contactAPI = new ContactAPIService();