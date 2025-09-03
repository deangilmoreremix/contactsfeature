import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { MessageSquare, Brain, Loader2, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';

export const InteractiveObjectionHandler: React.FC = () => {
  const [objection, setObjection] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateResponse = () => {
    setIsProcessing(true);
    setResponse(null);
    setError(null);

    setTimeout(() => {
      let generatedResponse: any = {};
      const lowerObjection = objection.toLowerCase();

      if (lowerObjection.includes('price') || lowerObjection.includes('expensive')) {
        generatedResponse = {
          response: 'I understand budget is important. Many of our clients initially have similar concerns. However, when they look at the long-term ROI and the value our solution brings, they find it\'s a strategic investment. Could I walk you through a quick ROI calculation based on your specific needs?',
          strategy: 'Reframe value, focus on ROI, offer to quantify.',
          followUp: 'Offer ROI calculator or case study.'
        };
      } else if (lowerObjection.includes('time') || lowerObjection.includes('busy')) {
        generatedResponse = {
          response: 'I completely understand you\'re busy. I\'ll be brief. What\'s the single most important thing you\'re looking to achieve in the next 30 days? Perhaps we can focus on how our solution helps with that.',
          strategy: 'Acknowledge, pivot to urgency, focus on immediate value.',
          followUp: 'Offer a very short meeting or send a concise summary.'
        };
      } else if (lowerObjection.includes('current solution') || lowerObjection.includes('happy')) {
        generatedResponse = {
          response: 'That\'s great to hear! Many of our clients were also satisfied with their previous solutions until they discovered how much more efficient and effective they could be. What aspects of your current solution do you value most, and where do you see room for improvement?',
          strategy: 'Validate, then probe for hidden pain points or areas for improvement.',
          followUp: 'Suggest a comparative analysis or a deeper dive into specific features.'
        };
      } else if (lowerObjection.includes('competitor')) {
        generatedResponse = {
          response: 'It\'s wise to evaluate all options. What specifically about [Competitor Name] caught your attention? We often find that while competitors may offer X, our unique approach to Y provides a more comprehensive solution for Z.',
          strategy: 'Acknowledge, differentiate, and highlight unique value.',
          followUp: 'Offer a competitive comparison sheet or a demo focusing on differentiators.'
        };
      } else {
        generatedResponse = {
          response: 'Thank you for sharing that concern. Could you elaborate a bit more on what you mean by that?',
          strategy: 'Clarify, empathize, and probe for more information.',
          followUp: 'Ask open-ended questions to understand the root cause.'
        };
      }
      setResponse(generatedResponse);
      setIsProcessing(false);
    }, 1800);
  };

  return (
    <GlassCard className="p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter a Sales Objection
          </label>
          <textarea
            value={objection}
            onChange={(e) => setObjection(e.target.value)}
            placeholder="e.g., 'Your price is too high', 'I'm too busy right now', 'We're happy with our current solution'"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            disabled={isProcessing}
          />
        </div>

        <ModernButton
          variant="primary"
          onClick={handleGenerateResponse}
          loading={isProcessing}
          disabled={isProcessing || objection.trim() === ''}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Objection...</span>
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              <span>Get AI Response</span>
            </>
          )}
        </ModernButton>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {response && (
          <div className="mt-4 space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              AI-Generated Response
            </h4>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                Suggested Response:
              </h5>
              <p className="text-sm text-gray-700 whitespace-pre-line">{response.response}</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2 text-blue-600" />
                Strategy & Follow-up:
              </h5>
              <p className="text-sm text-blue-800">**Strategy:** {response.strategy}</p>
              <p className="text-sm text-blue-800">**Follow-up:** {response.followUp}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};