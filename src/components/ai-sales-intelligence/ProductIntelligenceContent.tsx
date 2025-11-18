import React from 'react';

interface ProductIntelligenceContentProps {
  content: any;
  onCRMIntegration: () => void;
  onBack: () => void;
}

export const ProductIntelligenceContent: React.FC<ProductIntelligenceContentProps> = ({
  content,
  onCRMIntegration,
  onBack
}) => {
  return (
    <div className="p-8 text-center">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Generated Content</h3>
      <p className="text-gray-600 mb-6">Content display component - Coming Soon</p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Back
        </button>
        <button
          onClick={onCRMIntegration}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          CRM Integration
        </button>
      </div>
    </div>
  );
};