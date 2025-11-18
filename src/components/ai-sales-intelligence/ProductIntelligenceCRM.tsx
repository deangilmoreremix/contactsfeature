import React from 'react';

interface ProductIntelligenceCRMProps {
  analysisResults: any;
  generatedContent: any;
  onComplete: () => void;
  onBack: () => void;
}

export const ProductIntelligenceCRM: React.FC<ProductIntelligenceCRMProps> = ({
  analysisResults,
  generatedContent,
  onComplete,
  onBack
}) => {
  return (
    <div className="p-8 text-center">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">CRM Integration</h3>
      <p className="text-gray-600 mb-6">CRM integration component - Coming Soon</p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Complete
        </button>
      </div>
    </div>
  );
};