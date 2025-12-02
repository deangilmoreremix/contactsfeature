import React, { useState } from 'react';
import { AgentConfig } from '../../types/agent';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { X, Play, Loader2, Info } from 'lucide-react';

interface AgentModalProps {
  agent: AgentConfig;
  onExecute: (input?: Record<string, any>) => void;
  onClose: () => void;
  loading: boolean;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  agent,
  onExecute,
  onClose,
  loading
}) => {
  const [inputData, setInputData] = useState<Record<string, any>>({});

  const handleInputChange = (key: string, value: any) => {
    setInputData(prev => ({ ...prev, [key]: value }));
  };

  const handleExecute = () => {
    onExecute(Object.keys(inputData).length > 0 ? inputData : undefined);
  };

  const renderInputField = (key: string, schema: any) => {
    const fieldType = schema.type;
    const required = agent.input_schema?.['required']?.includes(key) || false;

    switch (fieldType) {
      case 'string':
        if (schema.enum) {
          return (
            <select
              value={inputData[key] || ''}
              onChange={(e) => handleInputChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={required}
            >
              <option value="">Select {key}...</option>
              {schema.enum.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          );
        }
        return (
          <input
            type="text"
            value={inputData[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={schema.description || `Enter ${key}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={inputData[key] || ''}
            onChange={(e) => handleInputChange(key, parseFloat(e.target.value))}
            placeholder={schema.description || `Enter ${key}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={required}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={inputData[key] || false}
              onChange={(e) => handleInputChange(key, e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm text-gray-700">
              {schema.description || key}
            </label>
          </div>
        );

      default:
        return (
          <textarea
            value={inputData[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={schema.description || `Enter ${key}`}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={required}
          />
        );
    }
  };

  const hasInputs = agent.input_schema && Object.keys(agent.input_schema['properties'] || {}).length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <GlassCard className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {agent.name.toLowerCase().includes('sdr') ? '🎯' :
               agent.name.toLowerCase().includes('dialer') ? '📞' :
               agent.name.toLowerCase().includes('signals') ? '📊' :
               agent.name.toLowerCase().includes('lead') ? '👥' :
               agent.name.toLowerCase().includes('meetings') ? '📅' :
               agent.name.toLowerCase().includes('journeys') ? '🚀' :
               agent.name.toLowerCase().includes('crm') ? '⚙️' :
               agent.name.toLowerCase().includes('ae') ? '💼' :
               agent.name.toLowerCase().includes('builder') ? '🔧' :
               agent.name.toLowerCase().includes('voice') ? '🎤' :
               agent.name.toLowerCase().includes('social') ? '💬' : '🤖'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
              <p className="text-sm text-gray-600">{agent.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Agent Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">About this agent:</div>
                <div>{agent.description}</div>
                {agent.recommended_ui_placement && (
                  <div className="mt-2 text-xs text-blue-600">
                    Recommended for: {agent.recommended_ui_placement}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Input Parameters */}
          {hasInputs && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Parameters</h4>
              <div className="space-y-4">
                {Object.entries(agent.input_schema?.['properties'] || {}).map(([key, schema]: [string, any]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {key}
                      {agent.input_schema?.['required']?.includes(key) && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {renderInputField(key, schema)}
                    {schema.description && (
                      <p className="text-xs text-gray-500 mt-1">{schema.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasInputs && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-800">
                This agent doesn't require any input parameters. Click Execute to run it.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <ModernButton
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </ModernButton>
            <ModernButton
              variant="primary"
              onClick={handleExecute}
              className="flex-1"
              loading={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Agent
                </>
              )}
            </ModernButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};