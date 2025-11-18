import React from 'react';

interface ProductIntelligenceResultsProps {
  results: any;
  onGenerateContent: () => void;
  onBack: () => void;
}

export const ProductIntelligenceResults: React.FC<ProductIntelligenceResultsProps> = ({
  results,
  onGenerateContent,
  onBack
}) => {
  return (
    <div className="p-8 text-center">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Analysis Results</h3>
      <p className="text-gray-600 mb-6">Results display component - Coming Soon</p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Back
        </button>
        <button
          onClick={onGenerateContent}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Generate Content
        </button>
      </div>
    </div>
  );
};