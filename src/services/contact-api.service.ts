/**
 * Contact API Service
 * RESTful contact management with full CRUD operations
 */

import { httpClient } from './http-client.service';
import { validationService } from './validation.service';
import { cacheService } from './cache.service';
import { logger } from './logger.service';
import { Contact } from '../types/contact';
import apiConfig from '../config/api.config';

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
  private baseURL = apiConfig.contactsAPI.baseURL;
  
  // CRUD Operations
  async createContact(contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    // Validate input
    const sanitized = validationService.sanitizeContact(contactData);
    const validation = validationService.validateContact(sanitized);
    
    if (!validation.isValid) {
      const error = new Error('Contact validation failed');
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
            key: `contact_list_${JSON.stringify(filters)}`,
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
  async createContactsBatch(contacts: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Contact[]> {
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
      const error = new Error('Batch validation failed');
      logger.error('Batch contact validation failed', error, validationErrors);
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
      
      logger.info('Batch contact creation successful', { 
        count: createdContacts.length 
      });
      
      return createdContacts;
    } catch (error) {
      logger.error('Failed to create contacts batch', error as Error, { 
        count: validatedContacts.length 
      });
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
      
      logger.info('Batch contact update successful', { 
        count: updatedContacts.length 
      });
      
      return updatedContacts;
    } catch (error) {
      logger.error('Failed to update contacts batch', error as Error, { 
        count: updates.length 
      });
      throw error;
    }
  }
  
  // Analytics and Stats
  async getContactStats(filters: Partial<ContactFilters> = {}): Promise<ContactStats> {
    try {
      const response = await httpClient.get<ContactStats>(
        `${this.baseURL}/contacts/stats`,
        filters,
        {
          timeout: 15000,
          retries: 2,
          cache: {
            key: `contact_stats_${JSON.stringify(filters)}`,
            ttl: 600000, // 10 minutes
            tags: ['contact', 'stats'],
          },
        }
      );
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get contact stats', error as Error, { filters });
      throw error;
    }
  }
  
  // Export/Import Operations
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
      throw error;
    }
  }
  
  // Utility Methods
  async validateContactExists(contactId: string): Promise<boolean> {
    try {
      await this.getContact(contactId);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async getDuplicateContacts(): Promise<Contact[][]> {
    try {
      const response = await httpClient.get<Contact[][]>(
        `${this.baseURL}/contacts/duplicates`,
        undefined,
        {
          timeout: 30000,
          retries: 1,
        }
      );
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get duplicate contacts', error as Error);
      throw error;
    }
  }
  
  async mergeContacts(primaryId: string, duplicateIds: string[]): Promise<Contact> {
    try {
      const response = await httpClient.post<Contact>(
        `${this.baseURL}/contacts/${primaryId}/merge`,
        { duplicateIds },
        {
          timeout: 30000,
          retries: 1,
        }
      );
      
      const mergedContact = response.data;
      
      // Update cache
      cacheService.setContact(primaryId, mergedContact);
      
      // Remove duplicates from cache
      duplicateIds.forEach(id => {
        cacheService.invalidateContact(id);
      });
      
      // Invalidate lists
      cacheService.deleteByTag('list');
      
      logger.info('Contacts merged successfully', { 
        primaryId, 
        duplicateIds, 
        mergedContactId: mergedContact.id 
      });
      
      return mergedContact;
    } catch (error) {
      logger.error('Failed to merge contacts', error as Error, { 
        primaryId, 
        duplicateIds 
      });
      throw error;
    }
  }
}

export const contactAPI = new ContactAPIService();