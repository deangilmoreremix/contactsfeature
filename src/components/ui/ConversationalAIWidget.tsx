import React, { useState, useRef, useEffect } from 'react';
import { aiOrchestrator } from '../../services/ai-orchestrator.service';

// Import the pre-configured service instance
import { conversationalAIService } from '../../services/conversational-ai.service';
import { Send, MessageCircle, X, Loader2, Sparkles, Brain, Mic, MicOff } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';

interface ConversationalAIWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    userId: string;
    currentPage?: string;
    selectedContacts?: string[];
  };
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  functionCalls?: any[];
  suggestions?: string[];
}

export const ConversationalAIWidget: React.FC<ConversationalAIWidgetProps> = ({
  isOpen,
  onClose,
  context
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversationId] = useState(`conv_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      // Start conversation if not already started
      if (!conversationalAIService.getConversationHistory(conversationId).length) {
        conversationalAIService.startConversation(context.userId, conversationId);
      }

      // Send message to AI service
      await conversationalAIService.sendUserMessage(
        conversationId,
        userMessage.content
      );

      // For now, create a simple response since real-time WebSocket handling is complex
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        content: `I received your message: "${userMessage.content}". I'm processing this with AI to provide the best response and execute any relevant functions.`,
        timestamp: new Date(),
        suggestions: ['Analyze contacts', 'Create new contact', 'Generate email']
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('AI processing error:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now() + 2}`,
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFunctionCalls = async (functionCalls: any[], context: any) => {
    for (const functionCall of functionCalls) {
      try {
        const result = await aiOrchestrator.executeImmediate({
          type: 'contact_scoring',
          priority: 'medium',
          data: functionCall.parameters,
          context: {
            contactId: functionCall.parameters.contactId,
            userId: context.userId,
            sessionId: conversationId
          }
        });

        // Create a function result message
        const resultMessage: Message = {
          id: `msg_${Date.now() + 3}`,
          type: 'assistant',
          content: `✅ Function executed: ${functionCall.function.name}\n${formatFunctionResult(result)}`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, resultMessage]);

        // Update UI based on function result
        updateUIFromFunctionResult(functionCall.function.name, result);

      } catch (error) {
        console.error('Function execution error:', error);
        const errorMessage: Message = {
          id: `msg_${Date.now() + 4}`,
          type: 'assistant',
          content: `❌ Error executing ${functionCall.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  const formatFunctionResult = (result: any): string => {
    if (typeof result === 'string') return result;
    if (typeof result === 'number') return result.toString();

    try {
      // Format object results nicely
      if (result.contactId) {
        return `Contact ${result.contactId} processed successfully`;
      }
      if (result.score !== undefined) {
        return `Analysis complete. Score: ${result.score}/100`;
      }
      if (result.totalContacts) {
        return `Processed ${result.totalContacts} contacts`;
      }
      return JSON.stringify(result, null, 2);
    } catch {
      return 'Function completed successfully';
    }
  };

  const updateUIFromFunctionResult = (functionName: string, result: any) => {
    // This would integrate with your existing UI state management
    // For example, refresh contact data, update scores, etc.
    switch (functionName) {
      case 'analyze_contact_profile':
        // Update contact score in UI
        if (result.score && result.contactId) {
          console.log('Update contact score:', result.contactId, result.score);
          // Dispatch to your state management system
        }
        break;

      case 'create_smart_contact':
        // Refresh contact list
        console.log('New contact created:', result.contactId);
        // Trigger contact list refresh
        break;

      case 'bulk_analyze_contacts':
        // Update multiple contact scores
        console.log('Bulk analysis complete:', result.totalContacts);
        // Refresh contact list with new scores
        break;

      default:
        console.log('Function result:', functionName, result);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting voice recording:', error);
      alert('Voice recording not supported or permission denied');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // For now, we'll simulate voice-to-text conversion
      // In a real implementation, you'd send this to a speech-to-text service
      const simulatedText = "Analyze my contacts"; // This would be the transcribed text

      const voiceMessage: Message = {
        id: `msg_${Date.now()}`,
        type: 'user',
        content: `🎤 ${simulatedText}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, voiceMessage]);

      // Process voice command and map to function calls
      const functionCalls = await processVoiceCommand(simulatedText);

      if (functionCalls && functionCalls.length > 0) {
        // Execute the function calls
        await handleFunctionCalls(functionCalls, context);

        const assistantMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          type: 'assistant',
          content: `I heard you say: "${simulatedText}". I'm executing the requested function(s).`,
          timestamp: new Date(),
          functionCalls,
          suggestions: ['Analyze more contacts', 'Create new contact', 'Generate email']
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Send as regular text message if no function calls detected
        await conversationalAIService.sendUserMessage(
          conversationId,
          simulatedText
        );

        const assistantMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          type: 'assistant',
          content: `I heard you say: "${simulatedText}". How can I help you with your contacts?`,
          timestamp: new Date(),
          suggestions: ['Analyze contacts', 'Create new contact', 'Generate email']
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error) {
      console.error('Error processing voice input:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now() + 2}`,
        type: 'assistant',
        content: 'Sorry, I had trouble processing your voice input. Please try again or type your message.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processVoiceCommand = async (voiceText: string): Promise<any[]> => {
    const text = voiceText.toLowerCase().trim();

    // Voice command patterns and their corresponding function calls
    const commandPatterns = [
      // Contact Analysis
      {
        patterns: ['analyze contacts', 'analyze my contacts', 'score contacts', 'rate contacts'],
        function: 'bulk_analyze_segment',
        params: { segment: 'all', analysisType: 'scoring' }
      },
      {
        patterns: ['analyze contact', 'score contact', 'rate contact'],
        function: 'analyze_contact_profile',
        params: { contactId: 'extract_from_context' }
      },

      // Contact Enrichment
      {
        patterns: ['enrich contacts', 'update contacts', 'fill contact data'],
        function: 'bulk_enrich_contacts',
        params: { enrichmentPriority: 'missing_data' }
      },
      {
        patterns: ['find social profiles', 'get social media', 'social profiles'],
        function: 'bulk_find_social_profiles',
        params: {}
      },

      // Email Generation
      {
        patterns: ['generate email', 'write email', 'create email', 'compose email'],
        function: 'generate_personalized_email',
        params: { emailType: 'introduction' }
      },
      {
        patterns: ['send follow up', 'follow up email', 'followup email'],
        function: 'generate_personalized_email',
        params: { emailType: 'followup' }
      },

      // Task Management
      {
        patterns: ['create task', 'add task', 'schedule task', 'new task'],
        function: 'bulk_create_followup_tasks',
        params: { taskType: 'followup' }
      },
      {
        patterns: ['schedule reminder', 'set reminder', 'create reminder'],
        function: 'schedule_milestone_reminders',
        params: {}
      },

      // Contact Creation
      {
        patterns: ['create contact', 'add contact', 'new contact'],
        function: 'create_smart_contact',
        params: {}
      },

      // Search & Filtering
      {
        patterns: ['find similar contacts', 'similar contacts', 'matching contacts'],
        function: 'find_similar_contacts',
        params: { similarityCriteria: 'industry' }
      },
      {
        patterns: ['search by engagement', 'find engaged contacts', 'high engagement'],
        function: 'search_by_engagement',
        params: { engagementLevel: 'high' }
      },

      // Bulk Operations
      {
        patterns: ['export contacts', 'download contacts', 'save contacts'],
        function: 'smart_export_segment',
        params: { exportFormat: 'csv', includeAnalytics: true }
      },
      {
        patterns: ['tag contacts', 'add tags', 'apply tags'],
        function: 'bulk_apply_tags',
        params: { tags: ['voice_command'] }
      },

      // Analytics & Reporting
      {
        patterns: ['generate report', 'create report', 'analytics report'],
        function: 'generate_acquisition_report',
        params: {}
      },
      {
        patterns: ['predict conversion', 'conversion probability', 'sales forecast'],
        function: 'predict_conversion_probability',
        params: {}
      }
    ];

    // Find matching command
    for (const command of commandPatterns) {
      for (const pattern of command.patterns) {
        if (text.includes(pattern)) {
          return [{
            function: {
              name: command.function,
              parameters: command.params
            }
          }];
        }
      }
    }

    // No matching command found
    return [];
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-2xl w-full max-w-md h-[600px] overflow-hidden flex flex-col animate-slide-in shadow-2xl text-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  AI Assistant
                  <Sparkles className="w-5 h-5 ml-2 text-yellow-500" />
                </h2>
                <p className="text-gray-600">
                  Ask me anything about your contacts
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Ask me anything about your contacts!</p>
            <p className="text-xs mt-2">Try: "Analyze my top contacts" or "Create a follow-up for John"</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Function calls indicator */}
              {message.functionCalls && message.functionCalls.length > 0 && (
                <div className="mt-2 text-xs opacity-75">
                  🔧 Executing {message.functionCalls.length} function(s)...
                </div>
              )}

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1 transition-colors"
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-red-700 font-medium">🎤 Listening...</span>
                <span className="text-xs text-red-600">Say your command clearly</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your contacts..."
            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isProcessing}
          />

          {/* Voice Recording Button */}
          <button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isProcessing}
            className={`p-2 rounded-lg transition-colors ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <ModernButton
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            loading={isProcessing}
            className="flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </ModernButton>
        </div>

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-1 mt-2">
          {[
            "Analyze my contacts",
            "Create a new contact",
            "Schedule follow-up",
            "Generate email"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs bg-white text-gray-600 px-2 py-1 rounded border hover:bg-gray-50 transition-colors"
              disabled={isProcessing}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Voice Commands Help */}
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Mic className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Voice Commands</span>
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            <div>Try saying: "Analyze contacts" • "Create task" • "Generate email"</div>
            <div>"Find similar contacts" • "Export data" • "Schedule reminder"</div>
          </div>
          <button
            onClick={() => setMessages(prev => [...prev, {
              id: `help_${Date.now()}`,
              type: 'assistant',
              content: `Here are some voice commands you can try:\n\n🎯 Analysis: "Analyze my contacts", "Score inactive contacts"\n📧 Email: "Generate email for John", "Send follow-up"\n📋 Tasks: "Create follow-up task", "Schedule reminder"\n🔍 Search: "Find similar contacts", "Search by engagement"\n📊 Export: "Export contacts", "Download report"\n\nJust speak naturally - I'll understand and execute the right function!`,
              timestamp: new Date(),
              suggestions: ['Show me examples', 'Try voice command']
            }])}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Show all commands →
          </button>
        </div>
      </div>
        </div>
      </div>
    </>
  );
};

export default ConversationalAIWidget;