import React, { memo } from 'react';
import { Contact } from '../../../types';
import { ContactEmailPanel } from '../../contacts/ContactEmailPanel';

interface ContactEmailTabProps {
  contact: Contact;
}

export const ContactEmailTab: React.FC<ContactEmailTabProps> = memo(({
  contact
}) => {
  return (
    <div className="p-6">
      <ContactEmailPanel contact={contact} />
    </div>
  );
});