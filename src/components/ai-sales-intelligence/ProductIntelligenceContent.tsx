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
    <div className="p-8 text-center bg-white">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Generated Content</h3>
      <p className="text-gray-700 mb-6">Sales content and playbooks have been generated successfully!</p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onCRMIntegration}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium transition-colors shadow-lg"
        >
          Integrate with CRM →
        </button>
      </div>
    </div>
  );
};