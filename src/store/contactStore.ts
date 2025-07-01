import { create } from 'zustand';
import { Contact } from '../types/contact';

interface ContactStore {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  selectedContact: Contact | null;
  
  // Actions
  fetchContacts: () => Promise<void>;
  createContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  selectContact: (contact: Contact | null) => void;
  importContacts: (contacts: Contact[]) => Promise<void>;
}

// Sample data
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
    notes: 'Interested in enterprise solutions. Scheduled follow-up for next week.',
    aiScore: 85,
    tags: ['Enterprise', 'High Value'],
    isFavorite: false,
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/janedoe',
      website: 'https://microsoft.com'
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
    notes: 'Evaluating cost-effectiveness of our solutions.',
    aiScore: 65,
    tags: ['Finance', 'Cost-Conscious'],
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
    notes: 'Initial contact made. Waiting for response.',
    aiScore: 35,
    tags: ['Operations'],
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
    notes: 'Referred by John Smith. Very interested in our development tools.',
    aiScore: 90,
    tags: ['Developer', 'Referral'],
    isFavorite: true,
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-16T09:45:00Z'
  }
];

export const useContactStore = create<ContactStore>((set, get) => ({
  contacts: sampleContacts,
  isLoading: false,
  error: null,
  selectedContact: null,

  fetchContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real app, this would fetch from API
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch contacts', isLoading: false });
    }
  },

  createContact: async (contactData) => {
    const newContact: Contact = {
      ...contactData,
      id: Date.now().toString(),
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    set(state => ({
      contacts: [...state.contacts, newContact]
    }));
    
    return newContact;
  },

  updateContact: async (id, updates) => {
    const currentContact = get().contacts.find(c => c.id === id);
    if (!currentContact) {
      throw new Error('Contact not found');
    }

    const updatedContact = {
      ...currentContact,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    set(state => ({
      contacts: state.contacts.map(c => c.id === id ? updatedContact : c),
      selectedContact: state.selectedContact?.id === id ? updatedContact : state.selectedContact
    }));
    
    return updatedContact;
  },

  deleteContact: async (id) => {
    set(state => ({
      contacts: state.contacts.filter(c => c.id !== id),
      selectedContact: state.selectedContact?.id === id ? null : state.selectedContact
    }));
  },

  selectContact: (contact) => {
    set({ selectedContact: contact });
  },

  importContacts: async (newContacts) => {
    const contactsWithIds = newContacts.map(contact => ({
      ...contact,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    
    set(state => ({
      contacts: [...state.contacts, ...contactsWithIds]
    }));
  },
}));