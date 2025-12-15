import React, { useState } from 'react';
import { executeDealAi } from '../../ai/deal/executeDealAi';

interface SDRButtonGroupProps {
  dealId: string;
  workspaceId: string;
  personaId?: string;
  contact?: any; // Optional contact for contact-based SDR
  onSequenceGenerated?: (sequence: any) => void;
}

interface SDRResult {
  task: string;
  sequence: any;
  generatedAt: Date;
}

export const SDRButtonGroup: React.FC<SDRButtonGroupProps> = ({ dealId, workspaceId, personaId, contact, onSequenceGenerated }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<SDRResult[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SDRResult | null>(null);

  const handleSDRTask = async (task: string, options: any = {}) => {
    setLoading(task);
    try {
      const result = await executeDealAi({
        task: task as any,
        dealId,
        workspaceId,
        options: {
          personaId,
          lengthDays: 7,
          channel: 'email',
          tone: 'friendly',
          ...options
        },
        contact
      });

      const sdrResult: SDRResult = {
        task,
        sequence: result,
        generatedAt: new Date()
      };

      setResults(prev => [sdrResult, ...prev]);
      setSelectedResult(sdrResult);
      setShowModal(true);

      if (onSequenceGenerated) onSequenceGenerated(result);
    } catch (error) {
      console.error('SDR generation failed:', error);
      // Show error notification
    } finally {
      setLoading(null);
    }
  };

  const getTaskLabel = (task: string) => {
    return task.replace('sdr_', '').replace('_', ' ').toUpperCase();
  };

  return (
    <>
      <div className="sdr-buttons">
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">GPT-5.2 THINKING</span>
            <span className="text-sm text-blue-700">AI-Powered SDR Sequences</span>
          </div>
          <p className="text-xs text-blue-600">Click any button to generate personalized SDR campaigns</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            'sdr_follow_up', 'sdr_enrich_contact', 'sdr_competitor',
            'sdr_objection_handler', 'sdr_high_intent', 'sdr_bump',
            'sdr_reactivation', 'sdr_winback', 'sdr_linkedin',
            'sdr_whatsapp', 'sdr_event', 'sdr_referral',
            'sdr_newsletter', 'sdr_cold_email'
          ].map((task) => (
            <button
              key={task}
              onClick={() => handleSDRTask(task)}
              disabled={loading !== null}
              className={`p-3 rounded-lg border transition-all ${
                loading === task
                  ? 'bg-blue-100 border-blue-300 cursor-not-allowed'
                  : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {loading === task ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm">Generating...</span>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-lg mb-1">
                    {task === 'sdr_follow_up' && '📧'}
                    {task === 'sdr_enrich_contact' && '🧠'}
                    {task === 'sdr_competitor' && '🎯'}
                    {task === 'sdr_objection_handler' && '⚠️'}
                    {task === 'sdr_high_intent' && '⚡'}
                    {task === 'sdr_bump' && '💬'}
                    {task === 'sdr_reactivation' && '🔄'}
                    {task === 'sdr_winback' && '🏆'}
                    {task === 'sdr_linkedin' && '💼'}
                    {task === 'sdr_whatsapp' && '📱'}
                    {task === 'sdr_event' && '📅'}
                    {task === 'sdr_referral' && '👥'}
                    {task === 'sdr_newsletter' && '📰'}
                    {task === 'sdr_cold_email' && '❄️'}
                  </div>
                  <div className="text-xs font-medium">{getTaskLabel(task)}</div>
                </div>
              )}
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-2">Recent SDR Generations</h4>
            <div className="space-y-1">
              {results.slice(0, 3).map((result, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedResult(result);
                    setShowModal(true);
                  }}
                  className="w-full text-left p-2 rounded bg-white hover:bg-gray-50 border text-xs"
                >
                  {getTaskLabel(result.task)} - {result.generatedAt.toLocaleTimeString()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{getTaskLabel(selectedResult.task)} Sequence</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">GPT-5.2 THINKING</span>
                <span className="text-sm text-blue-700">AI-Generated Campaign</span>
              </div>
              <p className="text-xs text-blue-600">
                Personalized {selectedResult.task.replace('sdr_', '').replace('_', ' ')} sequence based on contact data and deal context.
              </p>
            </div>

            {selectedResult.sequence?.sequence ? (
              <div className="space-y-4">
                {selectedResult.sequence.sequence.map((step: any, i: number) => (
                  <div key={i} className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-gray-100 text-xs rounded">Day {step.day_offset}</span>
                      <span className="px-2 py-1 bg-blue-100 text-xs rounded">{step.channel}</span>
                    </div>
                    <h4 className="font-medium mb-1">{step.subject}</h4>
                    <div
                      className="text-sm text-gray-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: step.body_html }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Sequence data not available</p>
                <pre className="text-xs mt-2 bg-gray-100 p-2 rounded">
                  {JSON.stringify(selectedResult.sequence, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Send Sequence
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};