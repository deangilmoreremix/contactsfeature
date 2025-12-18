import React from 'react';
import { TrendingUp } from 'lucide-react';

interface Risk {
  risk: string;
  probability: number;
  impact: string;
  mitigation: string;
}

interface SuccessIndicator {
  metric: string;
  target: string;
  current: string;
  status: 'on_track' | 'at_risk' | 'behind';
}

interface CompetitivePositioning {
  strengths: string[];
  weaknesses: string[];
  differentiation: string[];
  winThemes: string[];
}

interface PlaybookRisksProps {
  riskMitigation: Risk[];
  successIndicators: SuccessIndicator[];
  competitivePositioning: CompetitivePositioning;
}

export const PlaybookRisks: React.FC<PlaybookRisksProps> = ({
  riskMitigation,
  successIndicators,
  competitivePositioning
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-50';
      case 'at_risk': return 'text-yellow-600 bg-yellow-50';
      case 'behind': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <>
      {/* Success Indicators */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Success Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {successIndicators.map((indicator, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {indicator.metric}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(indicator.status)}`}>
                  {indicator.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Current: {indicator.current}</span>
                <span className="text-xs text-gray-600">Target: {indicator.target}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Mitigation */}
      {riskMitigation.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Mitigation</h3>
          <div className="space-y-3">
            {riskMitigation.map((risk, index) => (
              <div key={index} className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-yellow-600 mt-1" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {risk.risk}
                    </h4>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-xs text-gray-600">
                        Probability: {Math.round(risk.probability * 100)}%
                      </span>
                      <span className="text-xs text-gray-600">
                        Impact: {risk.impact}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Positioning */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Competitive Positioning</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Our Strengths</h4>
            <ul className="space-y-1">
              {competitivePositioning.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-sm text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Win Themes</h4>
            <ul className="space-y-1">
              {competitivePositioning.winThemes.map((theme, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-sm text-gray-700">{theme}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};