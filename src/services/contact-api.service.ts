/**
 * Contact API Service
 * RESTful contact management with full CRUD operations
 *
 * This service provides a unified interface for contact operations,
 * supporting both Supabase database and localStorage fallbacks.
 * It includes caching, validation, encryption, and comprehensive error handling.
 *
 * @example
 * ```typescript
 * import { contactAPI } from './services/contact-api.service';
 *
 * // Create a contact
 * const contact = await contactAPI.createContact({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john@example.com',
 *   title: 'Developer',
 *   company: 'Tech Corp'
 * });
 *
 * // Search contacts
 * const results = await contactAPI.searchContacts('john');
 * ```
 */

import { httpClient } from './http-client.service';
import { validationService } from './validation.service';
import { cacheService } from './cache.service';
import { logger } from './logger.service';
import { supabase } from './supabaseClient';
import { encryptionService } from '../utils/encryption';
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
  private baseURL: string;
  private supabaseKey: string | null = null;
  private isBackendAvailable = true;
  private isMockMode = import.meta.env.DEV || import.meta.env.VITE_ENV === 'development';
  
  constructor() {
    // For contact operations, use direct database access instead of Edge Functions
    // Edge Functions are more suitable for complex operations like AI enrichment
    this.baseURL = apiConfig.contactsAPI.baseURL;
    this.supabaseKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];
    this.isMockMode = false; // Use Supabase instead of local storage

    console.log('Using Supabase for contact management');
  }
  
  // Get headers for Supabase requests
  private getSupabaseHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.supabaseKey) {
      headers['Authorization'] = `Bearer ${this.supabaseKey}`;
    }
    
    return headers;
  }
  
  // Check if we should use fallback mode
  private shouldUseFallback(): boolean {
    return !this.supabaseKey || this.isMockMode; // Use Supabase if key is available
  }
  
  // Initialize local storage with sample data if needed
  private initializeLocalStorage(): Contact[] {
    try {
      const stored = encryptionService.getDecryptedItem('contacts');
      if (stored) {
        return stored;
      }
    } catch (e) {
      // If localStorage is corrupted, reset it
      logger.warn('Failed to decrypt contacts from localStorage, resetting data');
    }

    // Default sample data
    const sampleContacts: Contact[] = [
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
      },
      {
        id: '3',
        firstName: 'Sarah',
        lastName: 'Johnson',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@salesforce.com',
        phone: '+1 415 901 7000',
        title: 'VP of Sales',
        company: 'Salesforce',
        industry: 'Technology',
        avatarSrc: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        sources: ['Conference', 'LinkedIn'],
        interestLevel: 'hot',
        status: 'qualified',
        lastConnected: '2024-01-20',
        aiScore: 92,
        tags: ['Enterprise', 'Decision Maker'],
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-20T09:15:00Z'
      },
      {
        id: '4',
        firstName: 'Michael',
        lastName: 'Chen',
        name: 'Michael Chen',
        email: 'michael.chen@startup.io',
        title: 'Founder & CEO',
        company: 'StartupIO',
        industry: 'Technology',
        avatarSrc: 'https://images.pexels.com/photos/834863/pexels-photo-834863.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        sources: ['Referral'],
        interestLevel: 'medium',
        status: 'lead',
        lastConnected: '2024-01-18',
        aiScore: 78,
        tags: ['Startup', 'Founder'],
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-18T16:45:00Z'
      },
      {
        id: '5',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@enterprise.com',
        phone: '+1 555 123 4567',
        title: 'Operations Manager',
        company: 'Enterprise Corp',
        industry: 'Manufacturing',
        avatarSrc: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        sources: ['Cold Email'],
        interestLevel: 'warm',
        status: 'prospect',
        lastConnected: '2024-01-22',
        aiScore: 65,
        tags: ['Manufacturing', 'Operations'],
        createdAt: '2024-01-08T00:00:00Z',
        updatedAt: '2024-01-22T11:30:00Z'
      },
      {
        id: '6',
        firstName: 'David',
        lastName: 'Kim',
        name: 'David Kim',
        email: 'david.kim@consulting.com',
        title: 'Senior Consultant',
        company: 'Strategy Consulting',
        industry: 'Consulting',
        avatarSrc: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        sources: ['LinkedIn'],
        interestLevel: 'cold',
        status: 'lead',
        lastConnected: '2024-01-10',
        tags: ['Consulting'],
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z'
      },
      {
        id: '7',
        firstName: 'Brooklyn',
        lastName: 'Martinez',
        name: 'Brooklyn Martinez',
        email: 'brooklyn@acmeretail.com',
        phone: '+1 555 987 6543',
        title: 'Retail Manager',
        company: 'ACME Retail',
        industry: 'Retail',
        avatarSrc: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        sources: ['Website', 'Email'],
        interestLevel: 'warm',
        status: 'prospect',
        lastConnected: '2024-01-25',
        aiScore: 73,
        tags: ['Retail', 'Manager'],
        createdAt: '2024-01-12T00:00:00Z',
        updatedAt: '2024-01-25T14:20:00Z'
      }
    ];
    
    localStorage.setItem('contacts', JSON.stringify(sampleContacts));
    return sampleContacts;
  }
  
  // Get all contacts from localStorage
  private getLocalContacts(): Contact[] {
    try {
      const stored = encryptionService.getDecryptedItem('contacts');
      if (stored) {
        return stored;
      }
    } catch (e) {
      // If localStorage is corrupted, reinitialize
      logger.warn('Failed to decrypt contacts from localStorage, reinitializing');
    }
    return this.initializeLocalStorage();
  }
  
  // Save contacts to localStorage
  private saveLocalContacts(contacts: Contact[]): void {
    try {
      encryptionService.setEncryptedItem('contacts', contacts);
    } catch (e) {
      logger.error('Failed to save encrypted contacts to localStorage', e as Error);
    }
  }
  
  /**
   * Create a new contact
   *
   * Validates input data, sanitizes it, and creates a new contact record.
   * Supports both Supabase database and localStorage fallback modes.
   *
   * @param contactData - Contact data without system-generated fields
   * @returns Promise resolving to the created contact
   * @throws {ContactError} When validation fails or creation fails
   *
   * @example
   * ```typescript
   * const contact = await contactAPI.createContact({
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   email: 'john@example.com',
   *   title: 'Developer',
   *   company: 'Tech Corp'
   * });
   * ```
   */
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

    if (this.shouldUseFallback()) {
      // Local storage fallback
      logger.info('Using local storage for contact creation');
      const contacts = this.getLocalContacts();
      const newContact: Contact = {
        ...sanitized as any,
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      contacts.push(newContact);
      this.saveLocalContacts(contacts);

      // Cache the new contact
      cacheService.setContact(newContact.id, newContact);

      return newContact;
    }

    try {
      // Use Supabase
      logger.info('Using Supabase for contact creation');
      const { data, error } = await supabase
        .from('contacts')
        .insert([sanitized])
        .select()
        .single();

      if (error) {
        logger.error('Supabase contact creation failed', error);
        throw error;
      }

      // Cache the new contact
      cacheService.setContact(data.id, data);

      return data;
    } catch (error) {
      logger.error('Contact creation failed', error as Error);
      throw error;
    }
  }
  
  async getContact(contactId: string): Promise<Contact> {
    // Check cache first
    const cached = cacheService.getContact(contactId);
    if (cached) {
      return cached;
    }
    
    // Local storage fallback
    logger.info('Using local storage for contact retrieval');
    const contacts = this.getLocalContacts();
    const contact = contacts.find(c => c.id === contactId);
    
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }
    
    // Cache the contact
    cacheService.setContact(contactId, contact);
    
    return contact;
  }
  
  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    // Validate updates
    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }
    
    const sanitized = validationService.sanitizeContact(updates);
    
    // Local storage fallback
    logger.info('Using local storage for contact update');
    const contacts = this.getLocalContacts();
    const contactIndex = contacts.findIndex(c => c.id === contactId);
    
    if (contactIndex === -1) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }
    
    // Apply updates
    const updatedContact: Contact = {
      ...contacts[contactIndex],
      ...sanitized as any,
      updatedAt: new Date().toISOString()
    };
    
    contacts[contactIndex] = updatedContact;
    this.saveLocalContacts(contacts);
    
    // Update cache
    cacheService.setContact(contactId, updatedContact);

    // Invalidate related cache entries
    cacheService.invalidateAllContacts();
    
    logger.info('Contact updated successfully', { contactId, updates: Object.keys(updates) });
    
    return updatedContact;
  }
  
  async deleteContact(contactId: string): Promise<void> {
    // Local storage fallback
    logger.info('Using local storage for contact deletion');
    const contacts = this.getLocalContacts();
    const filteredContacts = contacts.filter(c => c.id !== contactId);
    
    if (filteredContacts.length === contacts.length) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }
    
    this.saveLocalContacts(filteredContacts);
    
    // Remove from cache
    cacheService.invalidateContact(contactId);
    
    logger.info('Contact deleted successfully', { contactId });
  }
  
  /**
   * Retrieve contacts with optional filtering, sorting, and pagination
   *
   * Fetches contacts from cache first, then database or localStorage.
   * Supports complex filtering by search terms, status, industry, etc.
   *
   * @param filters - Optional filters for search, status, industry, etc.
   * @returns Promise resolving to paginated contact list with metadata
   *
   * @example
   * ```typescript
   * // Get all contacts
   * const allContacts = await contactAPI.getContacts();
   *
   * // Search with filters
   * const filtered = await contactAPI.getContacts({
   *   search: 'john',
   *   status: 'active',
   *   limit: 20,
   *   sortBy: 'name'
   * });
   * ```
   */
  async getContacts(filters: ContactFilters = {}): Promise<ContactListResponse> {
    // Check cache first
    const cached = cacheService.getContactList(filters);
    if (cached) {
      return cached;
    }

    if (this.shouldUseFallback()) {
      return this.getContactsFromLocalStorage(filters);
    }

    return this.getContactsFromSupabase(filters);
  }

  /**
   * Get contacts from local storage with filtering, sorting, and pagination
   */
  private async getContactsFromLocalStorage(filters: ContactFilters): Promise<ContactListResponse> {
    logger.info('Using local storage for contacts list');
    let contacts = this.getLocalContacts();

    // Apply all filters
    contacts = this.applyFilters(contacts, filters);

    // Apply sorting
    contacts = this.applySorting(contacts, filters);

    // Apply pagination
    const result = this.applyPagination(contacts, filters);

    // Cache results
    this.cacheContactsResult(result, filters);

    return result;
  }

  /**
   * Get contacts from Supabase with filtering, sorting, and pagination
   */
  private async getContactsFromSupabase(filters: ContactFilters): Promise<ContactListResponse> {
    try {
      logger.info('Using Supabase for contacts list');

      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' });

      // Apply filters to query
      query = this.applySupabaseFilters(query, filters);

      // Apply sorting
      query = this.applySupabaseSorting(query, filters);

      // Apply pagination
      const { limit, offset } = this.getPaginationParams(filters);
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Supabase contacts query failed', error);
        throw error;
      }

      const result: ContactListResponse = {
        contacts: data || [],
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + (data?.length || 0)
      };

      // Cache results
      this.cacheContactsResult(result, filters);

      return result;
    } catch (error) {
      logger.error('Contacts list failed', error as Error);
      throw error;
    }
  }


  private applyFilters(contacts: Contact[], filters: ContactFilters): Contact[] {
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

    return filteredContacts;
  }

  private applySorting(contacts: Contact[], filters: ContactFilters): Contact[] {
    if (!filters.sortBy) return contacts;

    return [...contacts].sort((a: any, b: any) => {
      const aValue = a[filters.sortBy!];
      const bValue = b[filters.sortBy!];

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private applyPagination(contacts: Contact[], filters: ContactFilters): ContactListResponse {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const paginatedContacts = contacts.slice(offset, offset + limit);

    return {
      contacts: paginatedContacts,
      total: contacts.length,
      limit,
      offset,
      hasMore: offset + paginatedContacts.length < contacts.length
    };
  }

  private applySupabaseFilters(query: any, filters: ContactFilters): any {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    if (filters.interestLevel && filters.interestLevel !== 'all') {
      query = query.eq('interestLevel', filters.interestLevel);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.hasAIScore !== undefined) {
      if (filters.hasAIScore) {
        query = query.not('aiScore', 'is', null);
      } else {
        query = query.is('aiScore', null);
      }
    }

    return query;
  }

  private applySupabaseSorting(query: any, filters: ContactFilters): any {
    if (filters.sortBy) {
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    return query;
  }

  private getPaginationParams(filters: ContactFilters): { limit: number; offset: number } {
    return {
      limit: filters.limit || 50,
      offset: filters.offset || 0
    };
  }

  private cacheContactsResult(result: ContactListResponse, filters: ContactFilters): void {
    // Cache individual contacts
    result.contacts.forEach(contact => {
      cacheService.setContact(contact.id, contact, 300000);
    });

    // Cache the list
    cacheService.setContactList(filters, result);
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

    if (this.shouldUseFallback()) {
      // Local storage fallback
      logger.info('Using local storage for batch contact creation');
      const existingContacts = this.getLocalContacts();

      const createdContacts: Contact[] = validatedContacts.map((contact, index) => ({
        ...contact,
        id: `batch-${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const allContacts = [...existingContacts, ...createdContacts];
      this.saveLocalContacts(allContacts);

      // Cache created contacts
      createdContacts.forEach(contact => {
        cacheService.setContact(contact.id, contact);
      });

      // Invalidate lists
      cacheService.deleteByTag('list');

      return createdContacts;
    }

    try {
      // Use Supabase
      logger.info('Using Supabase for batch contact creation');
      const { data, error } = await supabase
        .from('contacts')
        .insert(validatedContacts)
        .select();

      if (error) {
        logger.error('Supabase batch contact creation failed', error);
        throw error;
      }

      // Cache created contacts
      (data || []).forEach(contact => {
        cacheService.setContact(contact.id, contact);
      });

      // Invalidate all contact-related cache
      cacheService.invalidateAllContacts();

      return data || [];
    } catch (error) {
      logger.error('Batch contact creation failed', error as Error);
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
    
    // Local storage fallback
    logger.info('Using local storage for batch contact update');
    const contacts = this.getLocalContacts();
    const updatedContacts: Contact[] = [];
    
    for (const update of updates) {
      const contactIndex = contacts.findIndex(c => c.id === update.id);
      if (contactIndex !== -1) {
        // Apply updates
        const updatedContact: Contact = {
          ...contacts[contactIndex],
          ...update.data,
          updatedAt: new Date().toISOString()
        };
        
        contacts[contactIndex] = updatedContact;
        updatedContacts.push(updatedContact);
        
        // Update cache
        cacheService.setContact(updatedContact.id, updatedContact);
      }
    }
    
    this.saveLocalContacts(contacts);
    
    // Invalidate lists
    cacheService.deleteByTag('list');
    
    return updatedContacts;
  }
  
  // Export Operations
  async exportContacts(filters: ContactFilters = {}, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    if (this.shouldUseFallback()) {
      // Local storage fallback
      logger.info('Using local storage for contact export');

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

    try {
      // Use Supabase
      logger.info('Using Supabase for contact export');

      // Get all contacts matching filters (without pagination for export)
      const allFilters: ContactFilters = { ...filters };
      delete allFilters.limit;
      delete allFilters.offset;
      const result = await this.getContacts(allFilters);

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
    } catch (error) {
      logger.error('Contact export failed', error as Error);
      throw error;
    }
  }
}

export const contactAPI = new ContactAPIService();