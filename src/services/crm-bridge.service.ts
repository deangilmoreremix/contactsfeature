/**
 * CRM Integration Bridge for Remote Contacts Module
 * Handles communication between the remote module and parent CRM application
 */

import { logger } from './logger.service';
import type { Contact } from '../types';

interface ContactStoreActions {
  setContacts: (contacts: Contact[]) => void;
  addContactLocally: (contact: Contact) => void;
  updateContactLocally: (contact: Contact) => void;
  deleteContactLocally: (id: string) => void;
}

interface CRMModuleInfo {
  name: string;
  version: string;
  capabilities: string[];
}

interface CRMMessage {
  type: string;
  data: any;
}

class CRMBridge {
  private parentOrigin: string;
  private isConnected: boolean = false;
  private contactStore: ContactStoreActions | null = null;
  private messageQueue: CRMMessage[] = [];

  constructor() {
    // Determine parent origin - support multiple environments
    this.parentOrigin = this.determineParentOrigin();
    this.setupMessageListener();
    this.notifyReady();
    
    logger.info('CRM Bridge initialized', { parentOrigin: this.parentOrigin });
  }

  private determineParentOrigin(): string {
    // Check for ancestor origins first (most reliable)
    if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
      return window.location.ancestorOrigins[0];
    }

    // Fallback to environment-based detection
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000'; // Local development
    }
    
    if (hostname.includes('netlify.app')) {
      return 'https://your-crm-domain.replit.app'; // Production
    }
    
    // Default fallback
    return 'https://your-crm-domain.replit.app';
  }

  setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Verify parent origin for security
      if (!this.isValidOrigin(event.origin)) {
        logger.warn('Rejected message from invalid origin', { origin: event.origin });
        return;
      }

      const { type, data } = event.data;
      logger.info('Remote module received message', { type, data });

      switch (type) {
        case 'CRM_INIT':
          this.handleCRMInit(data);
          break;
        case 'CONTACTS_SYNC':
          this.handleContactsSync(data.contacts);
          break;
        case 'LOCAL_CONTACT_CREATED':
          this.handleLocalContactCreated(data);
          break;
        case 'LOCAL_CONTACT_UPDATED':
          this.handleLocalContactUpdated(data);
          break;
        case 'LOCAL_CONTACT_DELETED':
          this.handleLocalContactDeleted(data);
          break;
        case 'CRM_PING':
          this.handlePing();
          break;
        default:
          logger.warn('Unknown message type received', { type });
      }
    });

    logger.info('Message listener setup complete');
  }

  isValidOrigin(origin: string): boolean {
    const allowedOrigins = [
      'https://your-crm-domain.replit.app',
      'http://localhost:5000',
      'http://localhost:3000',
      'http://localhost:5173', // Vite dev server
      'https://taupe-sprinkles-83c9ee.netlify.app', // Current deployment
      // Add more allowed origins as needed
    ];
    
    return allowedOrigins.includes(origin);
  }

  notifyReady(): void {
    const moduleInfo: CRMModuleInfo = {
      name: 'Smart CRM Remote Contacts',
      version: '1.0.0',
      capabilities: ['create', 'read', 'update', 'delete', 'ai-analysis', 'bulk-operations']
    };

    this.sendToCRM('REMOTE_READY', { moduleInfo });
    logger.info('Notified CRM that remote module is ready', { moduleInfo });
  }

  handleCRMInit(data: any): void {
    logger.info('CRM initialized', { data });
    this.isConnected = true;
    
    // Load CRM contacts into the remote module
    if (data.contacts && Array.isArray(data.contacts)) {
      this.loadContactsFromCRM(data.contacts);
    }

    // Process any queued messages
    this.processMessageQueue();
  }

  handleContactsSync(contacts: Contact[]): void {
    logger.info('Syncing contacts from CRM', { count: contacts.length });
    this.loadContactsFromCRM(contacts);
  }

  handlePing(): void {
    this.sendToCRM('REMOTE_PONG', { 
      timestamp: new Date().toISOString(),
      isConnected: this.isConnected 
    });
  }

  // Contact management methods - integrate with Zustand store
  loadContactsFromCRM(contacts: Contact[]): void {
    if (this.contactStore) {
      // Convert CRM format to internal format if needed
      const formattedContacts = contacts.map(this.formatCRMContact);
      this.contactStore.setContacts(formattedContacts);
      logger.info('Loaded contacts from CRM', { count: formattedContacts.length });
    } else {
      logger.warn('Contact store not initialized, queueing contacts');
      this.messageQueue.push({ type: 'LOAD_CONTACTS', data: contacts });
    }
  }

  handleLocalContactCreated(contact: Contact): void {
    if (this.contactStore) {
      const formattedContact = this.formatCRMContact(contact);
      this.contactStore.addContactLocally(formattedContact);
      logger.info('Added contact from CRM', { contactId: contact.id });
    }
  }

  handleLocalContactUpdated(contact: Contact): void {
    if (this.contactStore) {
      const formattedContact = this.formatCRMContact(contact);
      this.contactStore.updateContactLocally(formattedContact);
      logger.info('Updated contact from CRM', { contactId: contact.id });
    }
  }

  handleLocalContactDeleted(data: { id: string }): void {
    if (this.contactStore) {
      this.contactStore.deleteContactLocally(data.id);
      logger.info('Deleted contact from CRM', { contactId: data.id });
    }
  }

  // Methods called by the remote module when contacts change
  notifyContactCreated(contact: Contact): void {
    const crmFormatContact = this.formatContactForCRM(contact);
    this.sendToCRM('CONTACT_CREATED', crmFormatContact);
    logger.info('Notified CRM of contact creation', { contactId: contact.id });
  }

  notifyContactUpdated(contact: Contact): void {
    const crmFormatContact = this.formatContactForCRM(contact);
    this.sendToCRM('CONTACT_UPDATED', crmFormatContact);
    logger.info('Notified CRM of contact update', { contactId: contact.id });
  }

  notifyContactDeleted(contactId: string): void {
    this.sendToCRM('CONTACT_DELETED', { id: contactId });
    logger.info('Notified CRM of contact deletion', { contactId });
  }

  requestCRMContacts(): void {
    this.sendToCRM('REQUEST_CONTACTS', {});
    logger.info('Requested contacts from CRM');
  }

  // Utility methods
  sendToCRM(type: string, data: any): void {
    if (window.parent && window.parent !== window) {
      const message = { type, data };
      
      if (this.isConnected || type === 'REMOTE_READY' || type === 'REMOTE_PONG') {
        window.parent.postMessage(message, this.parentOrigin);
        logger.info('Sent message to CRM', { type, dataKeys: Object.keys(data) });
      } else {
        // Queue messages if not connected yet
        this.messageQueue.push(message);
        logger.info('Queued message for CRM', { type });
      }
    } else {
      logger.warn('Cannot send message to CRM - no parent window', { type });
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        if (message.type === 'LOAD_CONTACTS' && this.contactStore) {
          this.loadContactsFromCRM(message.data);
        } else {
          this.sendToCRM(message.type, message.data);
        }
      }
    }
    logger.info('Processed message queue', { processedCount: this.messageQueue.length });
  }

  // Format conversion methods
  private formatCRMContact(crmContact: any): Contact {
    // Convert CRM contact format to internal Contact format
    return {
      id: crmContact.id || '',
      firstName: crmContact.firstName || crmContact.name?.split(' ')[0] || '',
      lastName: crmContact.lastName || crmContact.name?.split(' ').slice(1).join(' ') || '',
      name: crmContact.name || `${crmContact.firstName || ''} ${crmContact.lastName || ''}`.trim(),
      email: crmContact.email || '',
      phone: crmContact.phone,
      title: crmContact.position || crmContact.title || '',
      company: crmContact.company || '',
      industry: crmContact.industry,
      avatarSrc: crmContact.avatarSrc || crmContact.avatar || 
        'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      sources: crmContact.sources || ['CRM Import'],
      interestLevel: crmContact.interestLevel || 'medium',
      status: crmContact.status || 'lead',
      lastConnected: crmContact.lastConnected,
      notes: crmContact.notes,
      aiScore: crmContact.aiScore,
      tags: crmContact.tags || [],
      isFavorite: crmContact.isFavorite || false,
      socialProfiles: crmContact.socialProfiles,
      customFields: crmContact.customFields,
      createdAt: crmContact.createdAt || new Date().toISOString(),
      updatedAt: crmContact.updatedAt || new Date().toISOString()
    };
  }

  private formatContactForCRM(contact: Contact): any {
    // Convert internal Contact format to CRM format
    return {
      id: contact.id,
      name: contact.name,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      position: contact.title, // CRM uses 'position' instead of 'title'
      company: contact.company,
      industry: contact.industry,
      avatar: contact.avatarSrc,
      sources: contact.sources,
      interestLevel: contact.interestLevel,
      status: contact.status,
      lastConnected: contact.lastConnected,
      notes: contact.notes,
      aiScore: contact.aiScore,
      tags: contact.tags,
      isFavorite: contact.isFavorite,
      socialProfiles: contact.socialProfiles,
      customFields: contact.customFields,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    };
  }

  // Initialization method for Zustand store
  setContactStore(store: ContactStoreActions): void {
    this.contactStore = store;
    logger.info('Contact store registered with CRM Bridge');
    
    // Process any queued operations
    this.processMessageQueue();
  }

  // Connection status methods
  getConnectionStatus(): {
    isConnected: boolean;
    parentOrigin: string;
    queueLength: number;
  } {
    return {
      isConnected: this.isConnected,
      parentOrigin: this.parentOrigin,
      queueLength: this.messageQueue.length
    };
  }

  // Destroy method for cleanup
  destroy(): void {
    // Remove event listeners and clean up
    this.isConnected = false;
    this.contactStore = null;
    this.messageQueue = [];
    logger.info('CRM Bridge destroyed');
  }
}

// Create and export singleton instance
export const crmBridge = new CRMBridge();

// Export types for use in other components
export type { CRMModuleInfo, CRMMessage };