import React from 'react';
import { Building2, Users, DollarSign, TrendingUp, Target, CheckCircle, ExternalLink } from 'lucide-react';

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
    <div className="p-8 space-y-6 bg-white">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Analysis Complete!</h3>
        <p className="text-gray-700">
          AI has analyzed the business and generated comprehensive intelligence
        </p>
      </div>

      {/* Company Info */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-gray-900 mb-2">{results.company.name}</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-700 font-medium">Industry:</span>
                <span className="text-gray-900 ml-2">{results.company.industry}</span>
              </div>
              <div>
                <span className="text-gray-700 font-medium">Size:</span>
                <span className="text-gray-900 ml-2">{results.company.size}</span>
              </div>
              <div>
                <span className="text-gray-700 font-medium">Founded:</span>
                <span className="text-gray-900 ml-2">{results.company.founded}</span>
              </div>
              <div>
                <span className="text-gray-700 font-medium">Location:</span>
                <span className="text-gray-900 ml-2">{results.company.location}</span>
              </div>
            </div>
            {results.company.website && (
              <a
                href={results.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-3 text-blue-700 hover:text-blue-800 font-medium"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Visit Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
              Contacts
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{results.contacts?.length || 0}</div>
          <div className="text-sm text-gray-700">Key decision makers identified</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
              Revenue
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{results.financial?.revenue || 'N/A'}</div>
          <div className="text-sm text-gray-700">Estimated annual revenue</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded">
              Confidence
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{results.confidence}%</div>
          <div className="text-sm text-gray-700">Analysis accuracy score</div>
        </div>
      </div>

      {/* Product Info */}
      {results.product && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-3">Product Intelligence</h4>
          <div className="space-y-3">
            <div>
              <span className="text-gray-700 font-medium">Product:</span>
              <span className="text-gray-900 ml-2">{results.product.name}</span>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Category:</span>
              <span className="text-gray-900 ml-2">{results.product.category}</span>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Target Market:</span>
              <span className="text-gray-900 ml-2">{results.product.targetMarket}</span>
            </div>
            {results.product.features && (
              <div>
                <span className="text-gray-700 font-medium block mb-2">Key Features:</span>
                <div className="flex flex-wrap gap-2">
                  {results.product.features.map((feature: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-white border border-purple-300 text-purple-900 rounded-full text-sm">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Market Info */}
      {results.market && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
            Market Intelligence
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-700 font-medium">Market Size:</span>
              <span className="text-gray-900 ml-2">{results.market.size}</span>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Growth Rate:</span>
              <span className="text-gray-900 ml-2">{results.market.growth}</span>
            </div>
          </div>
          {results.market.trends && (
            <div className="mt-4">
              <span className="text-gray-700 font-medium block mb-2">Market Trends:</span>
              <div className="flex flex-wrap gap-2">
                {results.market.trends.map((trend: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm">
                    {trend}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onGenerateContent}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-colors shadow-lg"
        >
          Generate Sales Content →
        </button>
      </div>
    </div>
  );
};
