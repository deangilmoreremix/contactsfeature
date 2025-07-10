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
  private baseURL: string;
  private supabaseKey: string | null = null;
  private isBackendAvailable = true;
  private isMockMode = import.meta.env.DEV || import.meta.env.VITE_ENV === 'development';
  
  constructor() {
    // For contact operations, use direct database access instead of Edge Functions
    // Edge Functions are more suitable for complex operations like AI enrichment
    this.baseURL = apiConfig.contactsAPI.baseURL;
    this.isMockMode = true; // Always use local storage for now
    
    console.log('Using local storage for contact management');
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
    return true; // Always use fallback (local storage) for now
  }
  
  // Initialize local storage with sample data if needed
  private initializeLocalStorage(): Contact[] {
    try {
      const stored = localStorage.getItem('contacts');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // If localStorage is corrupted, reset it
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
      const stored = localStorage.getItem('contacts');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // If localStorage is corrupted, reinitialize
    }
    return this.initializeLocalStorage();
  }
  
  // Save contacts to localStorage
  private saveLocalContacts(contacts: Contact[]): void {
    try {
      localStorage.setItem('contacts', JSON.stringify(contacts));
    } catch (e) {
      logger.error('Failed to save contacts to localStorage', e as Error);
    }
  }
  
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
    
    // Invalidate lists
    cacheService.deleteByTag('list');
    
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
  
  // List and Search Operations
  async getContacts(filters: ContactFilters = {}): Promise<ContactListResponse> {
    const cacheKey = JSON.stringify(filters);
    
    // Check cache
    const cached = cacheService.getContactList(filters);
    if (cached) {
      return cached;
    }
    
    // Local storage fallback
    logger.info('Using local storage for contacts list');
    let contacts = this.getLocalContacts();
    
    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      contacts = contacts.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.company.toLowerCase().includes(search)
      );
    }
    
    if (filters.interestLevel && filters.interestLevel !== 'all') {
      contacts = contacts.filter(c => c.interestLevel === filters.interestLevel);
    }
    
    if (filters.status && filters.status !== 'all') {
      contacts = contacts.filter(c => c.status === filters.status);
    }
    
    if (filters.hasAIScore !== undefined) {
      contacts = contacts.filter(c => 
        filters.hasAIScore ? !!c.aiScore : !c.aiScore
      );
    }
    
    // Apply sorting
    if (filters.sortBy) {
      contacts.sort((a: any, b: any) => {
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
    
    const paginatedContacts = contacts.slice(offset, offset + limit);
    
    const result: ContactListResponse = {
      contacts: paginatedContacts,
      total: contacts.length,
      limit,
      offset,
      hasMore: offset + paginatedContacts.length < contacts.length
    };
    
    // Cache individual contacts
    paginatedContacts.forEach(contact => {
      cacheService.setContact(contact.id, contact, 300000);
    });
    
    // Cache the list
    cacheService.setContactList(filters, result);
    
    return result;
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
}

export const contactAPI = new ContactAPIService();