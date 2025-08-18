import React, { useEffect, useState } from 'react';
import App from './App'; // Your existing Bolt app
// Import ContactsModal if it's exported separately
// import ContactsModal from './ContactsModal';

export interface ContactsAppProps {
  onContactSelect?: (contact: any) => void;
  onContactCreate?: (contact: any) => void;
  onContactUpdate?: (contact: any) => void;
  onContactDelete?: (contactId: string) => void;
  initialContacts?: any[];
  theme?: 'light' | 'dark';
}

const ContactsApp: React.FC<ContactsAppProps> = ({
  onContactSelect,
  onContactCreate,
  onContactUpdate,
  onContactDelete,
  initialContacts,
  theme = 'light'
}) => {
  const [contacts, setContacts] = useState(initialContacts || []);

  // Sync initial contacts when they change
  useEffect(() => {
    if (initialContacts) {
      setContacts(initialContacts);
    }
  }, [initialContacts]);

  // Handle contact operations and notify parent
  const handleContactOperation = (type: string, contact: any) => {
    switch (type) {
      case 'select':
        onContactSelect?.(contact);
        break;
      case 'create':
        setContacts(prev => [...prev, contact]);
        onContactCreate?.(contact);
        break;
      case 'update':
        setContacts(prev => 
          prev.map(c => c.id === contact.id ? contact : c)
        );
        onContactUpdate?.(contact);
        break;
      case 'delete':
        setContacts(prev => prev.filter(c => c.id !== contact.id));
        onContactDelete?.(contact.id);
        break;
    }
  };

  return (
    <div className={`contacts-remote-wrapper ${theme === 'dark' ? 'dark' : ''}`}>
      <style>{`
        .contacts-remote-wrapper {
          width: 100%;
          height: 100%;
          min-height: 500px;
        }
        .contacts-remote-wrapper.dark {
          background-color: #1f2937;
          color: white;
        }
      `}</style>
      
      {/* Use your existing Bolt App component */}
      <App 
        // Pass any props your App component needs
        // You might need to modify your App.tsx to accept these props
        contacts={contacts}
        onContactAction={handleContactOperation}
        theme={theme}
      />
    </div>
  );
};

export default ContactsApp;