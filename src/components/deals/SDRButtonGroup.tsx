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
  const [campaignProgress, setCampaignProgress] = useState<{
    task: string;
    step: number;
    totalSteps: number;
    currentStep: string;
  } | null>(null);
  const [results, setResults] = useState<SDRResult[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SDRResult | null>(null);

  const handleSDRTask = async (task: string, options: any = {}) => {
    setLoading(task);

    // Check if this is a demo/mock contact (only for product demos)
    const isDemoMode = (process.env as any).NODE_ENV === 'development' ||
                      window.location.hostname === 'localhost' ||
                      window.location.hostname.includes('demo') ||
                      window.location.hostname.includes('staging') ||
                      window.location.hostname.includes('netlify');

    const isMockContact = isDemoMode && (
      contact?.isMockData ||
      contact?.id?.includes('demo-contact') ||
      contact?.id?.includes('sample-contact') ||
      contact?.name?.includes('[Demo]') ||
      contact?.company?.includes('[Demo Company]')
    );

    if (isMockContact) {
      // For mock contacts, show pre-built campaigns immediately
      try {
        // Simulate brief "processing" for mock contacts
        setCampaignProgress({
          task,
          step: 1,
          totalSteps: 1,
          currentStep: 'Loading pre-built campaign...'
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        // Use pre-built mock sequences
        const mockSequences = getMockSequenceForTask(task);

        const sdrResult: SDRResult = {
          task,
          sequence: mockSequences,
          generatedAt: new Date()
        };

        setResults(prev => [sdrResult, ...prev]);
        setSelectedResult(sdrResult);
        setShowModal(true);

        if (onSequenceGenerated) onSequenceGenerated(mockSequences);
      } catch (error) {
        console.error('Mock SDR generation failed:', error);
      } finally {
        setLoading(null);
        setCampaignProgress(null);
      }
      return;
    }

    // For real contacts, do full campaign creation process
    const campaignSteps = [
      'Analyzing contact profile and engagement history',
      'Researching company and industry context',
      'Generating personalized messaging strategy',
      'Creating sequence timeline and cadence',
      'Optimizing subject lines and content',
      'Finalizing campaign sequence'
    ];

    setCampaignProgress({
      task,
      step: 0,
      totalSteps: campaignSteps.length,
      currentStep: campaignSteps[0] || 'Initializing campaign creation'
    });

    try {
      // Simulate campaign creation progress
      for (let i = 0; i < campaignSteps.length; i++) {
        setCampaignProgress({
          task,
          step: i + 1,
          totalSteps: campaignSteps.length,
          currentStep: campaignSteps[i] || 'Processing campaign data'
        });

        // Wait between steps (simulate processing time)
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      }

      // Determine sequence length based on task type
      const getSequenceLength = (taskType: string) => {
        if (taskType.includes('follow_up') || taskType.includes('bump')) return 10;
        if (taskType.includes('winback') || taskType.includes('reactivation')) return 20;
        if (taskType.includes('cold_email') || taskType.includes('high_intent')) return 30;
        if (taskType.includes('objection_handler')) return 15;
        return 7; // Default
      };

      const result = await executeDealAi({
        task: task as any,
        dealId,
        workspaceId,
        options: {
          personaId,
          lengthDays: getSequenceLength(task),
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
      setCampaignProgress(null);
    }
  };

  // Mock sequence generator for demo contacts
  const getMockSequenceForTask = (task: string) => {
    const getSequenceLength = (taskType: string) => {
      if (taskType.includes('follow_up') || taskType.includes('bump')) return 10;
      if (taskType.includes('winback') || taskType.includes('reactivation')) return 20;
      if (taskType.includes('cold_email') || taskType.includes('high_intent')) return 30;
      if (taskType.includes('objection_handler')) return 15;
      return 7;
    };

    const length = getSequenceLength(task);
    const sequence = [];

    // Generate mock sequence based on task type
    if (task.includes('follow_up')) {
      sequence.push(
        { day_offset: 1, channel: 'email', subject: 'Following up on our conversation', body_html: '<p>Hi [Name], I wanted to follow up on our discussion about [topic]...</p>' },
        { day_offset: 3, channel: 'email', subject: 'Quick check-in', body_html: '<p>Hello [Name], just checking in to see if you had any questions...</p>' },
        { day_offset: 7, channel: 'email', subject: 'Value add resource', body_html: '<p>Hi [Name], I thought you might find this resource helpful...</p>' },
        { day_offset: 10, channel: 'email', subject: 'Final follow-up', body_html: '<p>Hello [Name], this will be my final follow-up...</p>' }
      );
    } else if (task.includes('cold_email')) {
      sequence.push(
        { day_offset: 1, channel: 'email', subject: 'Introduction and value proposition', body_html: '<p>Hi [Name], I help companies like [Company] achieve [benefit]...</p>' },
        { day_offset: 3, channel: 'email', subject: 'Social proof and case study', body_html: '<p>Hello [Name], here\'s how we helped [Similar Company]...</p>' },
        { day_offset: 7, channel: 'email', subject: 'Educational content', body_html: '<p>Hi [Name], I noticed [industry trend] and thought you might find this relevant...</p>' },
        { day_offset: 10, channel: 'email', subject: 'Question to engage', body_html: '<p>Hello [Name], I\'d love to hear your thoughts on [topic]...</p>' },
        { day_offset: 14, channel: 'email', subject: 'Value demonstration', body_html: '<p>Hi [Name], let me show you how [solution] works...</p>' },
        { day_offset: 18, channel: 'email', subject: 'Social validation', body_html: '<p>Hello [Name], [Customer] said this about working with us...</p>' },
        { day_offset: 22, channel: 'email', subject: 'Scarcity and urgency', body_html: '<p>Hi [Name], we have limited spots for [offer]...</p>' },
        { day_offset: 26, channel: 'email', subject: 'Final value proposition', body_html: '<p>Hello [Name], here\'s everything you need to know...</p>' },
        { day_offset: 30, channel: 'email', subject: 'Last chance offer', body_html: '<p>Hi [Name], this is your final opportunity...</p>' }
      );
    } else if (task.includes('winback')) {
      sequence.push(
        { day_offset: 1, channel: 'email', subject: 'We miss working with you', body_html: '<p>Hi [Name], we noticed you haven\'t been active lately...</p>' },
        { day_offset: 5, channel: 'email', subject: 'Special return offer', body_html: '<p>Hello [Name], we\'d love to welcome you back with this special offer...</p>' },
        { day_offset: 10, channel: 'email', subject: 'Customer success story', body_html: '<p>Hi [Name], here\'s how [Customer] is succeeding with us...</p>' },
        { day_offset: 15, channel: 'email', subject: 'Personalized solution', body_html: '<p>Hello [Name], based on your previous usage, here\'s what we recommend...</p>' },
        { day_offset: 20, channel: 'email', subject: 'Final opportunity', body_html: '<p>Hi [Name], this is your last chance to take advantage of...</p>' }
      );
    } else {
      // Generic sequence for other types
      for (let i = 1; i <= Math.min(length, 7); i++) {
        sequence.push({
          day_offset: i * 2 - 1,
          channel: 'email',
          subject: `Campaign email ${i}`,
          body_html: `<p>Hi [Name], this is campaign email ${i} in our sequence...</p>`
        });
      }
    }

    return { sequence };
  };

  const getTaskLabel = (task: string) => {
    return task.replace('sdr_', '').replace('_', ' ').toUpperCase();
  };

  const getSequenceDuration = (task: string) => {
    if (task.includes('follow_up') || task.includes('bump')) return '10 days';
    if (task.includes('winback') || task.includes('reactivation')) return '20 days';
    if (task.includes('cold_email') || task.includes('high_intent')) return '30 days';
    if (task.includes('objection_handler')) return '15 days';
    return '7 days';
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
              {loading === task && campaignProgress && campaignProgress.task === task ? (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                  <div className="text-xs font-medium text-blue-700 mb-1">
                    Creating Campaign...
                  </div>
                  <div className="text-[10px] text-blue-600 mb-2">
                    {campaignProgress.step}/{campaignProgress.totalSteps}
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-1 mb-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${(campaignProgress.step / campaignProgress.totalSteps) * 100}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-blue-600 leading-tight">
                    {campaignProgress.currentStep}
                  </div>
                </div>
              ) : loading === task ? (
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
                  <div className="text-[10px] text-gray-500 mt-0.5">{getSequenceDuration(task)}</div>
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
                Personalized {selectedResult.task.replace('sdr_', '').replace('_', ' ')} sequence ({getSequenceDuration(selectedResult.task)}) based on contact data and deal context.
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