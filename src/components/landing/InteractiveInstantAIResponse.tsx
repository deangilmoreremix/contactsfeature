import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Zap, Sparkles, Loader2, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

export const InteractiveInstantAIResponse: React.FC = () => {
  const [userMessage, setUserMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateResponse = () => {
    setIsGenerating(true);
    setAiResponse(null);
    setError(null);

    setTimeout(() => {
      let generatedResponse = '';
      const lowerMessage = userMessage.toLowerCase();

      if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        generatedResponse = 'Hello! How can I assist you today?';
      } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
        generatedResponse = 'Our pricing varies based on your specific needs and chosen features. Would you like me to provide a custom quote or a general pricing overview?';
      } else if (lowerMessage.includes('demo') || lowerMessage.includes('show me')) {
        generatedResponse = 'Absolutely! I can help you schedule a demo. What days and times work best for you next week?';
      } else if (lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
        generatedResponse = 'I apologize for any inconvenience you\'re experiencing. Could you please describe the problem in more detail so I can assist you effectively?';
      } else if (lowerMessage.includes('thank you') || lowerMessage.includes('thanks')) {
        generatedResponse = 'You\'re very welcome! I\'m glad I could help. Is there anything else you need assistance with?';
      } else {
        generatedResponse = 'I understand. How else can I help you with this or your work today?';
      }
      setAiResponse(generatedResponse);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <GlassCard className="p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Message
          </label>
          <textarea
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder="e.g., 'Hi, what's your pricing?', 'Can I get a demo?', 'I have a problem with my account.'"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            disabled={isGenerating}
          />
        </div>

        <ModernButton
          variant="primary"
          onClick={handleGenerateResponse}
          loading={isGenerating}
          disabled={isGenerating || userMessage.trim() === ''}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-600 to-red-600"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Response...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Get Instant AI Response</span>
            </>
          )}
        </ModernButton>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {aiResponse && (
          <div className="mt-4 space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              AI's Suggested Response
            </h4>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                Response:
              </h5>
              <p className="text-sm text-gray-700 whitespace-pre-line">{aiResponse}</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};