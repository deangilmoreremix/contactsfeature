import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Wand2
} from 'lucide-react';
import type { UserProduct } from '../../types/userProduct';
import { gpt52ProductIntelligenceService, ProductSuggestion } from '../../services/gpt52ProductIntelligenceService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  timestamp: Date;
}

interface ProductAIAssistantProps {
  product?: Partial<UserProduct>;
  currentStep?: string;
  onApplySuggestion?: (field: string, value: any) => void;
  onClose?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function ProductAIAssistant({
  product,
  currentStep,
  onApplySuggestion,
  onClose,
  isMinimized = false,
  onToggleMinimize
}: ProductAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your AI Product Setup Assistant powered by GPT-5.2. I can help you:

- Suggest target industries and job titles
- Generate value propositions and pain points
- Optimize your product positioning
- Answer questions about prospecting strategy

What would you like help with?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationId = useRef(`conv_${Date.now()}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await gpt52ProductIntelligenceService.getConversationalAssistance(
        inputValue.trim(),
        {
          product: product as UserProduct | undefined,
          currentStep
        },
        conversationId.current
      );

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_resp`,
        role: 'assistant',
        content: response.response,
        suggestions: response.suggestions,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: 'I apologize, but I encountered an issue. Please try again or rephrase your question.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSuggestions = async () => {
    if (!product?.name) return;

    setIsLoadingSuggestions(true);
    try {
      const newSuggestions = await gpt52ProductIntelligenceService.generateProductSuggestions(
        product as UserProduct,
        conversationId.current
      );
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: ProductSuggestion) => {
    if (onApplySuggestion) {
      const fieldMap: Record<string, string> = {
        'target_industry': 'target_industries',
        'target_title': 'target_titles',
        'pain_point': 'pain_points_addressed',
        'value_proposition': 'value_propositions',
        'competitive_advantage': 'competitive_advantages',
        'use_case': 'use_cases'
      };

      const field = fieldMap[suggestion.type] || suggestion.type;
      onApplySuggestion(field, suggestion.content);

      setSuggestions(prev => prev.filter(s => s !== suggestion));
    }
  };

  const quickPrompts = [
    'Suggest target industries for my product',
    'What job titles should I target?',
    'Help me write value propositions',
    'What pain points does my product solve?'
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const getSuggestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'target_industry': 'Industry',
      'target_title': 'Job Title',
      'pain_point': 'Pain Point',
      'value_proposition': 'Value Prop',
      'competitive_advantage': 'Advantage',
      'ideal_customer_profile': 'ICP',
      'use_case': 'Use Case'
    };
    return labels[type] || type;
  };

  const getSuggestionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'target_industry': 'bg-blue-100 text-blue-700',
      'target_title': 'bg-emerald-100 text-emerald-700',
      'pain_point': 'bg-red-100 text-red-700',
      'value_proposition': 'bg-violet-100 text-violet-700',
      'competitive_advantage': 'bg-amber-100 text-amber-700',
      'ideal_customer_profile': 'bg-cyan-100 text-cyan-700',
      'use_case': 'bg-pink-100 text-pink-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (isMinimized) {
    return (
      <button
        onClick={onToggleMinimize}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full shadow-lg flex items-center justify-center hover:from-blue-700 hover:to-blue-800 transition-all z-50"
      >
        <Bot className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col h-[600px] max-h-[80vh]">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">AI Product Assistant</h3>
            <p className="text-blue-100 text-xs">Powered by GPT-5.2</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(suggestion)}
                      className="flex items-center gap-2 text-xs bg-white/90 text-gray-700 px-3 py-1.5 rounded-full hover:bg-white transition-colors"
                    >
                      <ArrowRight className="w-3 h-3" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Quick prompts:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt)}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {product?.name && (
        <div className="px-4 pb-2 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <Wand2 className="w-3 h-3" />
              AI Suggestions
            </span>
            <button
              onClick={generateSuggestions}
              disabled={isLoadingSuggestions}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
            >
              {isLoadingSuggestions ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Generate
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg group"
                >
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${getSuggestionTypeColor(suggestion.type)}`}>
                    {getSuggestionTypeLabel(suggestion.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">
                      {typeof suggestion.content === 'string'
                        ? suggestion.content
                        : JSON.stringify(suggestion.content).slice(0, 50)}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{suggestion.reasoning}</p>
                  </div>
                  <button
                    onClick={() => applySuggestion(suggestion)}
                    className="p-1 text-gray-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-all"
                    title="Apply suggestion"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
