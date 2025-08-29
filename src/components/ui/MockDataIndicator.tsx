import React from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { Contact } from '../../types/contact';

interface MockDataIndicatorProps {
  contact: Contact;
  className?: string;
}

export const MockDataIndicator: React.FC<MockDataIndicatorProps> = ({
  contact,
  className = ''
}) => {
  const isMockData = contact.isMockData ||
                    contact.dataSource === 'mock' ||
                    contact.createdBy === 'demo';

  if (!isMockData) return null;

  const getMockDataType = () => {
    if (contact.mockDataType) return contact.mockDataType;
    if (contact.createdBy === 'demo') return 'demo';
    if (contact.dataSource === 'mock') return 'sample';
    return 'example';
  };

  const getMockDataDescription = () => {
    const type = getMockDataType();
    switch (type) {
      case 'demo':
        return 'This is demo data for showcasing features.';
      case 'sample':
        return 'This is sample data for testing purposes.';
      case 'test':
        return 'This is test data for development.';
      default:
        return 'This contact contains example/mock data.';
    }
  };

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Info className="w-4 h-4 text-yellow-600 flex-shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium text-yellow-800">
            {getMockDataType().charAt(0).toUpperCase() + getMockDataType().slice(1)} Data
          </span>
          <p className="text-xs text-yellow-700 mt-1">
            {getMockDataDescription()}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            AI enrichment uses mock responses for this contact.
          </p>
        </div>
      </div>
    </div>
  );
};