import React, { memo } from 'react';
import { Contact } from '../../../types';
import { AIInsightsPanel } from '../../contacts/AIInsightsPanel';

interface ContactAIInsightsTabProps {
  contact: Contact;
}

export const ContactAIInsightsTab: React.FC<ContactAIInsightsTabProps> = memo(({
  contact
}) => {
  return (
    <div className="p-6">
      <AIInsightsPanel contact={contact} />
    </div>
  );
});