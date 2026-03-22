import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useApiKey } from '../hooks/useApiKey';

/**
 * ApiKeyModal - Premium SaaS modal for connecting AI API keys
 * 
 * Features:
 * - Tabbed interface for OpenAI/Gemini
 * - Password-style input with show/hide toggle
 * - Input validation
 * - Success/error states
 * - Trust messaging
 * - Dark mode support
 * - Smooth animations
 * 
 * @example
 * // In your App component:
 * <ApiKeyProvider>
 *   <App />
 *   <ApiKeyModal />
 * </ApiKeyProvider>
 */
export function ApiKeyModal() {
  const { 
    modalState, 
    closeModal, 
    saveKey, 
    handleModalSuccess,
    validateKeyFormat,
    hasKey,
    getMaskedKey
  } = useApiKey();

  const [activeTab, setActiveTab] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (modalState.isOpen) {
      // Set active tab based on provider
      setActiveTab(modalState.provider || 'openai');
      
      // If key already exists, show masked version
      const provider = modalState.provider || 'openai';
      const existingKey = getMaskedKey(provider);
      if (existingKey) {
        setApiKey(existingKey);
      } else {
        setApiKey('');
      }
      
      setError(null);
      setSuccess(false);
      setShowKey(false);
    }
  }, [modalState.isOpen, modalState.provider, getMaskedKey]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setApiKey(getMaskedKey(tab) || '');
    setError(null);
    setSuccess(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate input
    if (!apiKey || apiKey.trim() === '') {
      setError('Please enter an API key');
      return;
    }

    // Check if it's a masked key (existing key being shown)
    if (apiKey.startsWith('sk-...') || apiKey.startsWith('AIza')) {
      // User hasn't changed the masked key, treat as "keep existing"
      handleModalSuccess();
      return;
    }

    // Validate key format
    const validation = validateKeyFormat(activeTab, apiKey);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    // Save the key
    setIsLoading(true);
    
    try {
      const saved = saveKey(activeTab, apiKey);
      
      if (saved) {
        setSuccess(true);
        // Small delay to show success state before closing
        setTimeout(() => {
          handleModalSuccess();
        }, 800);
      } else {
        setError('Failed to save API key. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    closeModal();
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Don't render if modal is closed
  if (!modalState.isOpen) {
    return null;
  }

  const providerLinks = {
    openai: 'https://platform.openai.com/api-keys',
    gemini: 'https://makersuite.google.com/app/apikey'
  };

  const providerDescriptions = {
    openai: 'Connect your OpenAI API key to power GPT-based AI features.',
    gemini: 'Connect your Google Gemini API key to power Gemini-based AI features.'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-scaleIn overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Connect Your AI Engine
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Unlock AI-powered features
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleTabChange('openai')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'openai'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            OpenAI
            {activeTab === 'openai' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('gemini')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'gemini'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Gemini
            {activeTab === 'gemini' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Provider Description */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            {providerDescriptions[activeTab]}
          </p>

          {/* API Key Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError(null);
                }}
                placeholder={activeTab === 'openai' ? 'sk-...' : 'AIza...'}
                className={`w-full px-4 py-3 pr-12 rounded-xl border ${
                  error 
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showKey ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 mb-4 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 mb-4 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              API key saved successfully!
            </div>
          )}

          {/* Get API Key Link */}
          <div className="mb-6">
            <a
              href={providerLinks[activeTab]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Get your {activeTab === 'openai' ? 'OpenAI' : 'Gemini'} API key
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Trust Message */}
          <div className="flex items-start gap-2 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your API key is stored locally on your device and never shared with our servers.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || success}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                'Save & Continue'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default ApiKeyModal;
