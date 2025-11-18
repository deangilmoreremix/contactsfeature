import React, { memo } from 'react';
import { Contact } from '../../../types';
import { CommunicationHub } from '../../contacts/CommunicationHub';

interface ContactCommunicationTabProps {
  contact: Contact;
}

export const ContactCommunicationTab: React.FC<ContactCommunicationTabProps> = memo(({
  contact
}) => {
  return (
    <div className="p-6">
      <CommunicationHub contact={contact} />
    </div>
  );
});