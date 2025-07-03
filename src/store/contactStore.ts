import { create } from 'zustand';
import { Contact } from '../types/contact';
import { logger } from '../services/logger.service';

interface ContactStore {
  contacts: Contact[];
  filteredContacts: Contact[];
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
  selectedContacts: Set<string>;
  filters: {
    status: string[];
    source: string[];
    leadScore: number[];
  };
  
  // Actions
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => void;
  setSearchTerm: (term: string) => void;
  setFilters: (filters: any) => void;
  toggleContactSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  filterContacts: () => void;
  loadContacts: () => Promise<void>;
  clearError: () => void;
}

// Generate sample contacts
const generateSampleContacts = (): Contact[] => {
  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'Robert', 'Jennifer'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const companies = ['TechCorp', 'InnovateLab', 'FutureSoft', 'DataDyne', 'CloudBase', 'NexGen', 'SmartSys', 'ProTech'];
  const positions = ['CEO', 'CTO', 'Marketing Manager', 'Sales Director', 'Product Manager', 'Developer', 'Designer', 'Analyst'];
  const statuses: Array<'lead' | 'prospect' | 'customer' | 'inactive'> = ['lead', 'prospect', 'customer', 'inactive'];
  const sources = ['Website', 'LinkedIn', 'Referral', 'Cold Call', 'Email Campaign', 'Trade Show', 'Social Media'];

  return Array.from({ length: 15 }, (_, index) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    
    return {
      id: (index + 1).toString(),
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase()}.com`,
      phone: `+1-555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      company,
      position: positions[Math.floor(Math.random() * positions.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      lead_score: Math.floor(Math.random() * 100),
      engagement_score: Math.floor(Math.random() * 100),
      last_contacted: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      social_profiles: {
        linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        twitter: Math.random() > 0.5 ? `@${firstName.toLowerCase()}${lastName.toLowerCase()}` : undefined
      },
      custom_fields: {},
      tags: [],
      notes: `Initial contact made. ${Math.random() > 0.5 ? 'Interested in our services.' : 'Requires follow-up.'}`,
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      activity_log: [],
      next_send_date: Math.random() > 0.7 ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null
    };
  });
};

export const useContactStore = create<ContactStore>((set, get) => ({
  contacts: [],
  filteredContacts: [],
  searchTerm: '',
  isLoading: false,
  error: null,
  selectedContacts: new Set(),
  filters: {
    status: [],
    source: [],
    leadScore: [0, 100]
  },

  setContacts: (contacts) => {
    set({ contacts });
    get().filterContacts();
  },

  addContact: (contact) => {
    set((state) => {
      const newContacts = [...state.contacts, contact];
      return { contacts: newContacts };
    });
    get().filterContacts();
    logger.info('Contact added successfully', { contactId: contact.id });
  },

  updateContact: async (id, updates) => {
    try {
      const state = get();
      const contactIndex = state.contacts.findIndex(c => c.id === id);
      
      if (contactIndex === -1) {
        const errorMessage = `Contact with ID ${id} not found`;
        logger.error('Failed to update contact', { contactId: id, error: errorMessage });
        throw new Error(errorMessage);
      }

      const updatedContact = { 
        ...state.contacts[contactIndex], 
        ...updates, 
        updated_at: new Date().toISOString() 
      };

      const newContacts = [...state.contacts];
      newContacts[contactIndex] = updatedContact;

      set({ contacts: newContacts });
      get().filterContacts();
      
      logger.info('Contact updated successfully', { 
        contactId: id, 
        updatedFields: Object.keys(updates) 
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred while updating contact';
      logger.error('Failed to update contact', { 
        contactId: id, 
        error: errorMessage,
        updates 
      });
      set({ error: errorMessage });
      throw error;
    }
  },

  deleteContact: (id) => {
    try {
      const state = get();
      const contactExists = state.contacts.some(c => c.id === id);
      
      if (!contactExists) {
        const errorMessage = `Contact with ID ${id} not found`;
        logger.error('Failed to delete contact', { contactId: id, error: errorMessage });
        throw new Error(errorMessage);
      }

      set((state) => ({
        contacts: state.contacts.filter(c => c.id !== id),
        selectedContacts: new Set([...state.selectedContacts].filter(selectedId => selectedId !== id))
      }));
      get().filterContacts();
      logger.info('Contact deleted successfully', { contactId: id });
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred while deleting contact';
      logger.error('Failed to delete contact', { contactId: id, error: errorMessage });
      set({ error: errorMessage });
    }
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    get().filterContacts();
  },

  setFilters: (filters) => {
    set({ filters });
    get().filterContacts();
  },

  toggleContactSelection: (id) => {
    set((state) => {
      const newSelection = new Set(state.selectedContacts);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selectedContacts: newSelection };
    });
  },

  clearSelection: () => {
    set({ selectedContacts: new Set() });
  },

  selectAll: () => {
    const { filteredContacts } = get();
    set({ selectedContacts: new Set(filteredContacts.map(c => c.id)) });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  filterContacts: () => {
    const { contacts, searchTerm, filters } = get();
    
    let filtered = contacts;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.first_name.toLowerCase().includes(term) ||
        contact.last_name.toLowerCase().includes(term) ||
        contact.email.toLowerCase().includes(term) ||
        (contact.company || '').toLowerCase().includes(term) ||
        (contact.position || '').toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(contact => filters.status.includes(contact.status));
    }

    // Apply source filter
    if (filters.source.length > 0) {
      filtered = filtered.filter(contact => 
        contact.source && filters.source.includes(contact.source)
      );
    }

    // Apply lead score filter
    if (filters.leadScore.length === 2) {
      const [min, max] = filters.leadScore;
      filtered = filtered.filter(contact => 
        contact.lead_score >= min && contact.lead_score <= max
      );
    }

    set({ filteredContacts: filtered });
  },

  loadContacts: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const sampleContacts = generateSampleContacts();
      
      set({ 
        contacts: sampleContacts,
        isLoading: false 
      });
      
      get().filterContacts();
      logger.info('Contacts loaded successfully', { count: sampleContacts.length });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load contacts';
      logger.error('Failed to load contacts', { error: errorMessage });
      set({ 
        error: errorMessage,
        isLoading: false 
      });
    }
  }
}));

// Export individual functions for easier imports
export const {
  setContacts,
  addContact,
  updateContact,
  deleteContact,
  setSearchTerm,
  setFilters,
  toggleContactSelection,
  clearSelection,
  selectAll,
  setLoading,
  setError,
  clearError,
  filterContacts,
  loadContacts
} = useContactStore.getState();