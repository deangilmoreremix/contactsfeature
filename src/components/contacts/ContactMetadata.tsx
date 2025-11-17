import React, { memo } from 'react';
import { Contact } from '../../types';
import { INTEREST_COLORS, INTEREST_LABELS, SOURCE_COLORS } from '../../utils/constants';
import { formatLastConnected } from '../../utils/dateUtils';

interface ContactMetadataProps {
  contact: Contact;
  showInterestLevel?: boolean;
  showSources?: boolean;
  className?: string;
}

export const ContactMetadata: React.FC<ContactMetadataProps> = memo(({
  contact,
  showInterestLevel = true,
  showSources = true,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Interest Level */}
      {showInterestLevel && (
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${INTEREST_COLORS[contact.interestLevel as keyof typeof INTEREST_COLORS] || INTEREST_COLORS.cold} animate-pulse`} />
          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
            {INTEREST_LABELS[contact.interestLevel as keyof typeof INTEREST_LABELS] || INTEREST_LABELS.cold}
          </span>
        </div>
      )}

      {/* Sources */}
      {showSources && contact.sources && contact.sources.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Source</p>
          <div className="flex justify-center flex-wrap gap-1">
            {contact.sources.map((source, index) => (
              <span
                key={index}
                className={`
                  ${SOURCE_COLORS[source as keyof typeof SOURCE_COLORS] || 'bg-gray-600'}
                  text-white text-xs px-2 py-1 rounded-md font-medium hover:scale-110 transition-transform cursor-pointer
                `}
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interest Level Dots */}
      {showInterestLevel && (
        <div className="flex items-center justify-center space-x-1">
          {Array.from({ length: 5 }, (_, i) => {
            const isActive =
              (contact.interestLevel === 'hot' && i < 5) ||
              (contact.interestLevel === 'medium' && i < 3) ||
              (contact.interestLevel === 'low' && i < 2) ||
              (contact.interestLevel === 'cold' && i < 1);

            return (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? `${INTEREST_COLORS[contact.interestLevel as keyof typeof INTEREST_COLORS] || INTEREST_COLORS.cold} shadow-lg`
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

ContactMetadata.displayName = 'ContactMetadata';