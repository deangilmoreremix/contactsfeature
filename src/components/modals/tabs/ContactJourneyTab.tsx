import React, { memo } from 'react';
import { Contact } from '../../../types';
import { ContactJourneyTimeline } from '../../contacts/ContactJourneyTimeline';

interface ContactJourneyTabProps {
  contact: Contact;
}

export const ContactJourneyTab: React.FC<ContactJourneyTabProps> = memo(({
  contact
}) => {
  return (
    <div className="p-6">
      <ContactJourneyTimeline contact={contact} />
    </div>
  );
});