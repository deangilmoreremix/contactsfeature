import React, { memo } from 'react';
import { FileText } from 'lucide-react';

interface CallScript {
  id: string;
  name: string;
  purpose: string;
  steps: string[];
  talkingPoints: string[];
}

interface CallScriptsProps {
  callState: 'idle' | 'calling' | 'connected' | 'completed';
  scripts: CallScript[];
  selectedScript: CallScript | null;
  showScripts: boolean;
  onToggleScripts: () => void;
  onSelectScript: (script: CallScript) => void;
}

export const CallScripts: React.FC<CallScriptsProps> = memo(({
  callState,
  scripts,
  selectedScript,
  showScripts,
  onToggleScripts,
  onSelectScript
}) => {
  if (callState !== 'idle' && callState !== 'connected') return null;

  return (
    <>
      {/* Script Selector */}
      {callState === 'idle' && (
        <div>
          <button
            onClick={onToggleScripts}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>{selectedScript ? `Using: ${selectedScript.name}` : 'Choose Call Script'}</span>
          </button>

          {showScripts && (
            <div className="mt-3 grid grid-cols-1 gap-3">
              {scripts.map((script) => (
                <button
                  key={script.id}
                  onClick={() => onSelectScript(script)}
                  className={`p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left ${
                    selectedScript?.id === script.id ? 'border-blue-300 bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{script.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{script.purpose}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Script Display */}
      {selectedScript && callState === 'connected' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">{selectedScript.name}</h4>

          <div className="space-y-3">
            <div>
              <h5 className="text-sm font-medium text-blue-800 mb-2">Call Steps:</h5>
              <ol className="text-sm text-blue-700 space-y-1">
                {selectedScript.steps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h5 className="text-sm font-medium text-blue-800 mb-2">Key Talking Points:</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                {selectedScript.talkingPoints.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
