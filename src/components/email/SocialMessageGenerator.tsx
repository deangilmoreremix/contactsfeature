import React, { useState } from 'react';
import { useEmailAI } from '../../hooks/useEmailAI';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { 
  MessageSquare, 
  Linkedin, 
  Twitter, 
  Phone, 
  Globe, 
  Copy, 
  CheckCircle, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  Settings 
} from 'lucide-react';

interface SocialMessageGeneratorProps {
  contact: Contact;
  className?: string;
}

export const SocialMessageGenerator: React.FC<SocialMessageGeneratorProps> = ({
  contact,
  className = ''
}) => {
  const { generatePersonalizedMessage, isGenerating, personalizedMessage, error } = useEmailAI();
  
  const [platform, setPlatform] = useState('linkedin');
  const [purpose, setPurpose] = useState('introduction');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateMessage = async () => {
    try {
      await generatePersonalizedMessage(contact, platform, purpose, tone, length);
    } catch (error) {
      console.error('Failed to generate message:', error);
    }
  };

  const handleCopy = () => {
    if (!personalizedMessage) return;
    
    navigator.clipboard.writeText(personalizedMessage.message)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy text:', err));
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin': return Linkedin;
      case 'twitter': return Twitter;
      case 'sms': return Phone;
      case 'whatsapp': return MessageSquare;
      default: return Globe;
    }
  };

  // Get platform color
  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'linkedin': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'twitter': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'sms': return 'bg-green-100 text-green-700 border-green-200';
      case 'whatsapp': return 'bg-green-100 text-green-700 border-green-200';
      case 'email': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get character limit text
  const getCharacterLimitText = () => {
    if (!personalizedMessage) return '';
    
    const { characterCount, characterLimit } = personalizedMessage;
    return `${characterCount}/${characterLimit.max} characters`;
  };

  // Get character limit indicator color
  const getCharacterLimitColor = () => {
    if (!personalizedMessage) return '';
    
    const { characterCount, characterLimit } = personalizedMessage;
    const percentage = (characterCount / characterLimit.max) * 100;
    
    if (percentage > 90) return 'text-red-500';
    if (percentage > 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
          Social Message Generator
        </h3>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center space-x-1"
        >
          <Settings className="w-4 h-4" />
          <span>{showOptions ? 'Hide Options' : 'Show Options'}</span>
        </ModernButton>
      </div>

      <div className="space-y-4">
        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platform
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {['linkedin', 'twitter', 'sms', 'whatsapp', 'email'].map((plt) => {
              const Icon = getPlatformIcon(plt);
              return (
                <label 
                  key={plt} 
                  className={`
                    flex flex-col items-center p-3 border rounded-md cursor-pointer
                    ${platform === plt 
                      ? getPlatformColor(plt)
                      : 'border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="platform"
                    value={plt}
                    checked={platform === plt}
                    onChange={() => setPlatform(plt)}
                    disabled={isGenerating}
                    className="sr-only"
                  />
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs capitalize">{plt}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Message Purpose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purpose
          </label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            disabled={isGenerating}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="introduction">Introduction</option>
            <option value="follow-up">Follow-up</option>
            <option value="meeting-request">Meeting Request</option>
            <option value="thank-you">Thank You</option>
            <option value="check-in">Check-in</option>
          </select>
        </div>

        {/* Advanced Options */}
        {showOptions && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {/* Tone Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['professional', 'friendly', 'formal', 'direct'].map((t) => (
                  <label 
                    key={t} 
                    className={`
                      flex items-center p-2 border rounded-md cursor-pointer
                      ${tone === t 
                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={t}
                      checked={tone === t}
                      onChange={() => setTone(t)}
                      disabled={isGenerating}
                      className="sr-only"
                    />
                    <span className="capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['short', 'medium', 'long'].map((l) => (
                  <label 
                    key={l} 
                    className={`
                      flex items-center justify-center p-2 border rounded-md cursor-pointer
                      ${length === l 
                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="length"
                      value={l}
                      checked={length === l}
                      onChange={() => setLength(l)}
                      disabled={isGenerating}
                      className="sr-only"
                    />
                    <span className="capitalize">{l}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <ModernButton
          variant="primary"
          onClick={handleGenerateMessage}
          loading={isGenerating}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Message...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate {personalizedMessage ? 'New' : ''} Message</span>
            </>
          )}
        </ModernButton>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Message Preview */}
        {personalizedMessage && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Generated Message
              </h4>
              <span className={`text-xs ${getCharacterLimitColor()}`}>
                {getCharacterLimitText()}
              </span>
            </div>

            {/* Message Body */}
            <div className={`p-4 border rounded-lg ${getPlatformColor(personalizedMessage.platform)}`}>
              <div className="flex items-center mb-3">
                {(() => {
                  const Icon = getPlatformIcon(personalizedMessage.platform);
                  return <Icon className="w-4 h-4 mr-2" />;
                })()}
                <span className="text-sm font-medium capitalize">{personalizedMessage.platform}</span>
              </div>
              <div className="whitespace-pre-line text-gray-700">
                {personalizedMessage.message}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-gray-500 flex items-center">
                <Sparkles className="w-3 h-3 mr-1 text-indigo-500" />
                <span>Generated by AI using {personalizedMessage.model}</span>
                {personalizedMessage.confidence && (
                  <span className="ml-1">
                    ({personalizedMessage.confidence}% confidence)
                  </span>
                )}
              </div>
              <ModernButton
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center space-x-1"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Message</span>
                  </>
                )}
              </ModernButton>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};