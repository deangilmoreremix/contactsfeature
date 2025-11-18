import React, { memo } from 'react';
import { Contact } from '../../../types';
import { ContactAnalytics } from '../../contacts/ContactAnalytics';

interface ContactAnalyticsTabProps {
  contact: Contact;
}

export const ContactAnalyticsTab: React.FC<ContactAnalyticsTabProps> = memo(({
  contact
}) => {
  return (
    <div className="p-6">
      <ContactAnalytics contact={contact} />
    </div>
  );
});