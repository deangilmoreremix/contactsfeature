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
    <div className="p-8 text-center bg-white">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Ready to Integrate</h3>
      <p className="text-gray-700 mb-6">
        All analysis and content has been generated. Click complete to save everything to your CRM.
      </p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium transition-colors shadow-lg"
        >
          ✓ Complete & Save
        </button>
      </div>
    </div>
  );
};