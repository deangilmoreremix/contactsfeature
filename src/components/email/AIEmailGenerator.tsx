import React, { useState } from 'react';
import { useEmailAI } from '../../hooks/useEmailAI';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { Mail, Sparkles, Settings, Save, CheckCircle, AlertCircle, Loader2, Copy, ExternalLink } from 'lucide-react';

interface AIEmailGeneratorProps {
  contact: Contact;
  onSave?: (subject: string, body: string) => void;
  className?: string;
}

export const AIEmailGenerator: React.FC<AIEmailGeneratorProps> = ({
  contact,
  onSave,
  className = ''
}) => {
  const { generateEmail, isGenerating, emailComposition, error } = useEmailAI();
  
  const [emailPurpose, setEmailPurpose] = useState('introduction');
  const [emailTone, setEmailTone] = useState('professional');
  const [emailLength, setEmailLength] = useState('medium');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState<'subject' | 'body' | 'both' | null>(null);

  const handleGenerateEmail = async () => {
    try {
      await generateEmail(contact, emailPurpose, emailTone, emailLength, includeSignature);
    } catch (error) {
      console.error('Failed to generate email:', error);
    }
  };

  const handleCopy = (type: 'subject' | 'body' | 'both') => {
    if (!emailComposition) return;
    
    let textToCopy = '';
    
    if (type === 'subject') {
      textToCopy = emailComposition.subject;
    } else if (type === 'body') {
      textToCopy = emailComposition.body;
    } else {
      textToCopy = `Subject: ${emailComposition.subject}\n\n${emailComposition.body}`;
    }
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(err => console.error('Failed to copy text:', err));
  };

  const handleSave = () => {
    if (onSave && emailComposition) {
      onSave(emailComposition.subject, emailComposition.body);
    }
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Mail className="w-5 h-5 mr-2 text-blue-500" />
          AI Email Generator
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
        {/* Email Purpose Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Purpose
          </label>
          <select
            value={emailPurpose}
            onChange={(e) => setEmailPurpose(e.target.value)}
            disabled={isGenerating}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="introduction">Introduction</option>
            <option value="follow-up">Follow-up</option>
            <option value="proposal">Proposal</option>
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
                {['professional', 'friendly', 'formal', 'direct'].map((tone) => (
                  <label 
                    key={tone} 
                    className={`
                      flex items-center p-2 border rounded-md cursor-pointer
                      ${emailTone === tone 
                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={tone}
                      checked={emailTone === tone}
                      onChange={() => setEmailTone(tone)}
                      className="sr-only"
                    />
                    <span className="capitalize">{tone}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Email Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['short', 'medium', 'long'].map((length) => (
                  <label 
                    key={length} 
                    className={`
                      flex items-center justify-center p-2 border rounded-md cursor-pointer
                      ${emailLength === length 
                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="length"
                      value={length}
                      checked={emailLength === length}
                      onChange={() => setEmailLength(length)}
                      className="sr-only"
                    />
                    <span className="capitalize">{length}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Include Signature */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="signature"
                checked={includeSignature}
                onChange={() => setIncludeSignature(!includeSignature)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="signature" className="ml-2 text-sm text-gray-700">
                Include signature
              </label>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <ModernButton
          variant="primary"
          onClick={handleGenerateEmail}
          loading={isGenerating}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Email...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate {emailComposition ? 'New' : ''} Email</span>
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

        {/* Email Preview */}
        {emailComposition && (
          <div className="mt-4 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Generated Email
            </h4>

            {/* Email Subject */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-700">Subject</h5>
                <button
                  onClick={() => handleCopy('subject')}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  {copied === 'subject' ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-gray-900 font-medium">{emailComposition.subject}</p>
            </div>

            {/* Email Body */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-700">Body</h5>
                <button
                  onClick={() => handleCopy('body')}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  {copied === 'body' ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="whitespace-pre-line text-gray-700">
                {emailComposition.body}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-gray-500 flex items-center">
                <Sparkles className="w-3 h-3 mr-1 text-purple-500" />
                <span>Generated by AI using {emailComposition.model}</span>
                {emailComposition.confidence && (
                  <span className="ml-1">
                    ({emailComposition.confidence}% confidence)
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <ModernButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy('both')}
                  className="flex items-center space-x-1"
                >
                  {copied === 'both' ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy All</span>
                    </>
                  )}
                </ModernButton>
                {onSave && (
                  <ModernButton
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    className="flex items-center space-x-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </ModernButton>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};