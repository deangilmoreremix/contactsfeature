import React, { useState } from 'react';
import { Brain, Zap, MessageSquare, Settings, Play } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';
import { GlassCard } from '../ui/GlassCard';
import { gpt51ResponsesService } from '../../services/gpt51ResponsesService';

interface GPT51ControlsProps {
  onResult?: (result: string) => void;
  className?: string;
}

export const GPT51Controls: React.FC<GPT51ControlsProps> = ({
  onResult,
  className = ''
}) => {
  const [reasoningEffort, setReasoningEffort] = useState<'none' | 'low' | 'medium' | 'high'>('medium');
  const [verbosity, setVerbosity] = useState<'low' | 'medium' | 'high'>('medium');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');

  const reasoningOptions = [
    { value: 'none' as const, label: 'None', description: 'Fast responses, minimal reasoning', icon: Zap },
    { value: 'low' as const, label: 'Low', description: 'Quick reasoning for simple tasks', icon: Brain },
    { value: 'medium' as const, label: 'Medium', description: 'Balanced reasoning and speed', icon: Settings },
    { value: 'high' as const, label: 'High', description: 'Deep reasoning for complex tasks', icon: MessageSquare }
  ];

  const verbosityOptions = [
    { value: 'low' as const, label: 'Concise', description: 'Short, direct responses' },
    { value: 'medium' as const, label: 'Balanced', description: 'Detailed but focused' },
    { value: 'high' as const, label: 'Comprehensive', description: 'Thorough explanations' }
  ];

  const handleTestGPT51 = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      const response = await gpt51ResponsesService.createResponse({
        model: 'gpt-5.1',
        input: input.trim(),
        reasoning: { effort: reasoningEffort },
        text: { verbosity },
        max_output_tokens: 1000
      });

      const output = response.output_text;
      setResult(output);

      if (onResult) {
        onResult(output);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const examplePrompts = [
    "Explain quantum computing in simple terms",
    "Write a haiku about artificial intelligence",
    "Debug this JavaScript code: function sum(a, b) { return a - b; }",
    "Create a sales strategy for a SaaS product targeting small businesses"
  ];

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">GPT-5.1 Controls</h3>
            <p className="text-sm text-gray-600">Test the latest AI reasoning and verbosity controls</p>
          </div>
        </div>

        {/* Reasoning Effort Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Reasoning Effort
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {reasoningOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setReasoningEffort(option.value)}
                  className={`p-3 border rounded-lg transition-all ${
                    reasoningEffort === option.value
                      ? 'border-purple-300 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mx-auto mb-2" />
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Verbosity Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Response Verbosity
          </label>
          <div className="flex space-x-3">
            {verbosityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setVerbosity(option.value)}
                className={`flex-1 p-3 border rounded-lg transition-all ${
                  verbosity === option.value
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Prompt
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your prompt to test GPT-5.1..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
          />

          {/* Example Prompts */}
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInput(prompt)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded-md transition-colors"
                >
                  {prompt.length > 30 ? `${prompt.substring(0, 30)}...` : prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <ModernButton
          onClick={handleTestGPT51}
          loading={isProcessing}
          disabled={!input.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Play className="w-4 h-4 mr-2" />
          {isProcessing ? 'Processing...' : 'Test GPT-5.1'}
        </ModernButton>

        {/* Result */}
        {result && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response
            </label>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">{result}</pre>
            </div>
          </div>
        )}

        {/* Settings Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <strong>Current Settings:</strong> Reasoning: {reasoningEffort} | Verbosity: {verbosity} | Model: gpt-5.1
          <br />
          <strong>Note:</strong> These controls demonstrate GPT-5.1's new reasoning and verbosity parameters for optimized AI responses.
        </div>
      </div>
    </GlassCard>
  );
};