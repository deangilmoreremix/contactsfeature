import React, { memo } from 'react';
import { Contact } from '../../../types';
import { AutomationPanel } from '../../contacts/AutomationPanel';

interface ContactAutomationTabProps {
  contact: Contact;
}

export const ContactAutomationTab: React.FC<ContactAutomationTabProps> = memo(({
  contact
}) => {
  return (
    <div className="p-6">
      <AutomationPanel contact={contact} />
    </div>
  );
});