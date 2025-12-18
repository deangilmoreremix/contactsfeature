import React from 'react';
import { Target } from 'lucide-react';

interface Strategy {
  name: string;
  description: string;
  confidence: number;
  rationale: string;
}

interface PlaybookStrategyProps {
  strategy: Strategy;
}

export const PlaybookStrategy: React.FC<PlaybookStrategyProps> = ({ strategy }) => {
  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
      <div className="flex items-start gap-3">
        <Target className="w-5 h-5 text-blue-600 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {strategy.name}
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            {strategy.description}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Confidence:</span>
              <span className="text-sm font-medium text-blue-600">
                {Math.round(strategy.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};