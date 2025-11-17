import React, { memo } from 'react';
import { Contact } from '../../types';

interface ContactInfoProps {
  contact: Contact;
  showTitle?: boolean;
  showCompany?: boolean;
  className?: string;
}

export const ContactInfo: React.FC<ContactInfoProps> = memo(({
  contact,
  showTitle = true,
  showCompany = true,
  className = ''
}) => {
  return (
    <div className={`text-center ${className}`}>
      <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {contact.name}
      </h3>
      {showTitle && (
        <p className="text-gray-600 dark:text-gray-300 text-sm">{contact.title}</p>
      )}
      {showCompany && (
        <p className="text-gray-500 dark:text-gray-400 text-xs">{contact.company}</p>
      )}
    </div>
  );
});

ContactInfo.displayName = 'ContactInfo';