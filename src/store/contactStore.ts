import { create } from 'zustand';
import { Contact } from '../types/contact';
import { contactAPI } from '../services/contact-api.service';
import { logger } from '../services/logger.service';

interface ContactStore {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  selectedContact: Contact | null;
  totalCount: number;
  hasMore: boolean;
  
  // Actions
  fetchContacts: (filters?: any) => Promise<void>;
  createContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  selectContact: (contact: Contact | null) => void;
  importContacts: (contacts: any[]) => Promise<void>;
  exportContacts: (format: 'csv' | 'json') => Promise<void>;
  searchContacts: (query: string) => Promise<void>;
}

// Enhanced sample contacts with more variety and data to showcase different UI states
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
    lastConnected: '2024-01-15 at 2:30 pm',
    notes: 'Interested in enterprise solutions. Scheduled follow-up for next week. Mentioned they are evaluating new CRM systems for their sales team, with a potential budget of $250K.',
    aiScore: 85,
    tags: ['Enterprise', 'High Value', 'Decision Maker'],
    isFavorite: true,
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/janedoe',
      twitter: 'https://twitter.com/janedoe',
      website: 'https://microsoft.com'
    },
    customFields: {
      'Budget Range': '$200K-$500K',
      'Company Size': '10,000+',
      'Decision Timeline': 'Q3 2025'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z'
  },
  {
    id: '2',
    firstName: 'Darlene',
    lastName: 'Robertson',
    name: 'Darlene Robertson',
    email: 'darlene.robertson@ford.com',
    phone: '+1 313 322 3000',
    title: 'Financial Manager',
    company: 'Ford',
    industry: 'Automotive',
    avatarSrc: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    sources: ['LinkedIn', 'Facebook'],
    interestLevel: 'medium',
    status: 'lead',
    lastConnected: '2024-01-12 at 4:15 pm',
    notes: 'Evaluating cost-effectiveness of our solutions. Initial discovery call went well, but will need approval from CFO.',
    aiScore: 65,
    tags: ['Finance', 'Cost-Conscious', 'Mid-Market'],
    isFavorite: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-12T16:15:00Z'
  },
  {
    id: '3',
    firstName: 'Wade',
    lastName: 'Warren',
    name: 'Wade Warren',
    email: 'wade.warren@zenith.com',
    phone: '+1 555 0123',
    title: 'Operations Manager',
    company: 'Zenith',
    industry: 'Manufacturing',
    avatarSrc: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    sources: ['Website', 'Typeform'],
    interestLevel: 'low',
    status: 'lead',
    lastConnected: '2024-01-08 at 11:00 am',
    notes: 'Initial contact made. Waiting for response to our product overview email.',
    aiScore: 35,
    tags: ['Operations', 'Manufacturing'],
    isFavorite: false,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-08T11:00:00Z'
  },
  {
    id: '4',
    firstName: 'Jonah',
    lastName: 'Jude',
    name: 'Jonah Jude',
    email: 'jonah.jude@binarybytes.com',
    phone: '+1 555 0456',
    title: 'Web Developer',
    company: 'Binary Bytes',
    industry: 'Technology',
    avatarSrc: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    sources: ['Referral'],
    interestLevel: 'hot',
    status: 'prospect',
    lastConnected: '2024-01-16 at 9:45 am',
    notes: 'Referred by John Smith. Very interested in our development tools. Demo scheduled for next week.',
    aiScore: 90,
    tags: ['Developer', 'Referral', 'Technical'],
    isFavorite: true,
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-16T09:45:00Z'
  },
  {
    id: '5',
    firstName: 'Esther',
    lastName: 'Howard',
    name: 'Esther Howard',
    email: 'esther.howard@globalhealth.org',
    phone: '+1 555 8942',
    title: 'Director of Procurement',
    company: 'Global Health Initiative',
    industry: 'Healthcare',
    avatarSrc: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    sources: ['Website', 'Email'],
    interestLevel: 'medium',
    status: 'customer',
    lastConnected: '2024-01-20 at 3:20 pm',
    notes: 'Current customer looking to expand implementation to additional departments.',
    aiScore: 75,
    tags: ['Healthcare', 'Expansion', 'Existing Customer'],
    isFavorite: false,
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/estherhoward',
      website: 'https://globalhealth.org'
    },
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-20T15:20:00Z'
  },
  {
    id: '6',
    firstName: 'Cameron',
    lastName: 'Williamson',
    name: 'Cameron Williamson',
    email: 'c.williamson@zynctech.co',
    phone: '+1 555 3421',
    title: 'CTO',
    company: 'ZyncTech',
    industry: 'Technology',
    avatarSrc: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    sources: ['LinkedIn', 'Cold Call'],
    interestLevel: 'hot',
    status: 'lead',
    lastConnected: '2024-01-22 at 10:15 am',
    notes: 'Technical decision maker with budget authority. Very interested in our API integration capabilities.',
    aiScore: 92,
    tags: ['C-Level', 'Technical', 'Decision Maker', 'High Value'],
    isFavorite: true,
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/cameronwilliamson',
      twitter: 'https://twitter.com/cwilliamson',
      website: 'https://zynctech.co'
    },
    customFields: {
      'Tech Stack': 'React, Node.js, AWS',
      'Team Size': '45 developers'
    },
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-01-22T10:15:00Z'
  },
  {
    id: '7',
    firstName: 'Brooklyn',
    lastName: 'Simmons',
    name: 'Brooklyn Simmons',
    email: 'brooklyn@acmeretail.com',
    phone: '+1 555 6723',
    title: 'Retail Operations Manager',
    company: 'ACME Retail',
    industry: 'Retail',
    avatarSrc: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    sources: ['Trade Show', 'Email'],
    interestLevel: 'cold',
    status: 'churned',
    lastConnected: '2023-12-15 at 1:30 pm',
    notes: 'Former customer who switched to a competitor. Cited pricing as main reason.',
    aiScore: 15,
    tags: ['Former Customer', 'Churned', 'Price Sensitive'],
    isFavorite: false,
    createdAt: '2023-06-10T00:00:00Z',
    updatedAt: '2023-12-15T13:30:00Z'
  },
  {
    id: '8',
    firstName: 'Robert',
    lastName: 'Chen',
    name: 'Robert Chen',
    email: 'robert.chen@innovatecorp.com',
    phone: '+1 555 9834',
    title: 'VP of Sales',
    company: 'Innovate Corp',
    industry: 'SaaS',
    avatarSrc: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    sources: ['Webinar', 'LinkedIn'],
    interestLevel: 'medium',
    status: 'prospect',
    lastConnected: '2024-01-19 at 4:45 pm',
    notes: 'Attended our sales automation webinar. Looking for a solution to implement in Q2.',
    aiScore: 72,
    tags: ['Sales', 'Decision Maker', 'Webinar Attendee'],
    isFavorite: false,
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/robertchen',
      twitter: 'https://twitter.com/rchen'
    },
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-19T16:45:00Z'
  },
  {
    id: '9',
    firstName: 'Leslie',
    lastName: 'Alexander',
    name: 'Leslie Alexander',
    email: 'leslie.alexander@edutech.edu',
    phone: '+1 555 2367',
    title: 'Head of IT',
    company: 'EduTech University',
    industry: 'Education',
    avatarSrc: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    sources: ['Email', 'Referral'],
    interestLevel: 'hot',
    status: 'prospect',
    lastConnected: '2024-01-21 at 2:00 pm',
    notes: 'Looking to overhaul their student information system. Budget of $150K approved.',
    aiScore: 88,
    tags: ['Education', 'IT Decision Maker', 'Enterprise'],
    isFavorite: true,
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/lesliealexander',
      website: 'https://edutech.edu'
    },
    customFields: {
      'Current System': 'Legacy Oracle solution',
      'Implementation Timeline': 'Summer 2025',
      'User Count': '15,000 students, 2,000 staff'
    },
    createdAt: '2024-01-09T00:00:00Z',
    updatedAt: '2024-01-21T14:00:00Z'
  },
  {
    id: '10',
    firstName: 'Dianne',
    lastName: 'Russell',
    name: 'Dianne Russell',
    email: 'dianne.russell@medicalscience.org',
    phone: '+1 555 4592',
    title: 'Research Director',
    company: 'Medical Science Foundation',
    industry: 'Healthcare',
    avatarSrc: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    sources: ['Conference', 'Website'],
    interestLevel: 'low',
    status: 'lead',
    lastConnected: '2024-01-14 at 10:30 am',
    notes: 'Met at Healthcare Innovation Conference. Interested in data analysis tools, but no immediate need.',
    aiScore: 45,
    tags: ['Healthcare', 'Research', 'Long-term Prospect'],
    isFavorite: false,
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/diannerussell'
    },
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-14T10:30:00Z'
  }
];

export const useContactStore = create<ContactStore>((set, get) => ({
  contacts: sampleContacts, // Initialize with sample contacts
  isLoading: false,
  error: null,
  selectedContact: null,
  totalCount: sampleContacts.length, // Set initial count
  hasMore: false,

  fetchContacts: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await contactAPI.getContacts(filters);
      
      set({
        contacts: response.contacts,
        isLoading: false,
        totalCount: response.total,
        hasMore: response.hasMore
      });
      
      logger.info('Contacts fetched successfully', { count: response.contacts.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contacts';
      set({ error: errorMessage, isLoading: false });
      logger.error('Failed to fetch contacts', error as Error);
      
      // Keep sample contacts if API fails
      if (get().contacts.length === 0) {
        set({
          contacts: sampleContacts,
          totalCount: sampleContacts.length
        });
      }
    }
  },

  createContact: async (contactData) => {
    set({ isLoading: true, error: null });
    
    try {
      const contact = await contactAPI.createContact(contactData);
      
      set(state => ({
        contacts: [contact, ...state.contacts],
        isLoading: false,
        totalCount: state.totalCount + 1
      }));
      
      logger.info('Contact created successfully', { contactId: contact.id });
      return contact;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create contact';
      set({ error: errorMessage, isLoading: false });
      logger.error('Failed to create contact', error as Error);
      throw error;
    }
  },

  updateContact: async (id, updates) => {
    try {
      const contact = await contactAPI.updateContact(id, updates);
      
      set(state => ({
        contacts: state.contacts.map(c => c.id === id ? contact : c),
        selectedContact: state.selectedContact?.id === id ? contact : state.selectedContact
      }));
      
      logger.info('Contact updated successfully', { contactId: id });
      return contact;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update contact';
      logger.error('Failed to update contact', error as Error);
      throw new Error(errorMessage);
    }
  },

  deleteContact: async (id) => {
    try {
      await contactAPI.deleteContact(id);
      
      set(state => ({
        contacts: state.contacts.filter(c => c.id !== id),
        totalCount: Math.max(0, state.totalCount - 1),
        selectedContact: state.selectedContact?.id === id ? null : state.selectedContact
      }));
      
      logger.info('Contact deleted successfully', { contactId: id });
    } catch (error) {
      logger.error('Failed to delete contact', error as Error);
      throw error;
    }
  },

  selectContact: (contact) => {
    set({ selectedContact: contact });
  },

  importContacts: async (newContacts) => {
    set({ isLoading: true, error: null });
    
    try {
      // Format contacts properly for API
      const formattedContacts = newContacts.map(contact => ({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        email: contact.email || '',
        phone: contact.phone,
        title: contact.title || '',
        company: contact.company || '',
        industry: contact.industry,
        sources: contact.sources || ['Manual Import'],
        interestLevel: contact.interestLevel || 'medium',
        status: contact.status || 'lead',
        notes: contact.notes,
        tags: contact.tags
      }));
      
      const createdContacts = await contactAPI.createContactsBatch(formattedContacts);
      
      set(state => ({
        contacts: [...state.contacts, ...createdContacts],
        isLoading: false,
        totalCount: state.totalCount + createdContacts.length
      }));
      
      logger.info('Contacts imported successfully', { count: createdContacts.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import contacts';
      set({ error: errorMessage, isLoading: false });
      logger.error('Failed to import contacts', error as Error);
      throw error;
    }
  },

  exportContacts: async (format: 'csv' | 'json' = 'csv') => {
    try {
      // Get current filters from state (implement if needed)
      const filters = {};
      
      const blob = await contactAPI.exportContacts(filters, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contacts_export_${new Date().toISOString().slice(0, 10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      logger.info('Contacts exported successfully', { format });
    } catch (error) {
      logger.error('Failed to export contacts', error as Error);
      throw error;
    }
  },

  searchContacts: async (query: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await contactAPI.searchContacts(query);
      
      set({
        contacts: response.contacts,
        isLoading: false,
        totalCount: response.total,
        hasMore: response.hasMore
      });
      
      logger.info('Contacts search completed', { query, resultCount: response.contacts.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search contacts';
      set({ error: errorMessage, isLoading: false });
      logger.error('Failed to search contacts', error as Error);
      
      // If API search fails, do a client-side search on the sample contacts
      if (query) {
        const lowerQuery = query.toLowerCase();
        const filteredContacts = sampleContacts.filter(contact => 
          contact.name.toLowerCase().includes(lowerQuery) ||
          contact.email.toLowerCase().includes(lowerQuery) ||
          contact.company.toLowerCase().includes(lowerQuery) ||
          (contact.title && contact.title.toLowerCase().includes(lowerQuery)) ||
          (contact.industry && contact.industry.toLowerCase().includes(lowerQuery))
        );
        
        set({
          contacts: filteredContacts,
          totalCount: filteredContacts.length,
          hasMore: false
        });
      }
    }
  }
}));