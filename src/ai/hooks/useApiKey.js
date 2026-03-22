import { useState, useCallback } from 'react';
import { useApiKey as useApiKeyContext } from '../context/ApiKeyContext';

/**
 * useApiKey - Enhanced hook for API key management
 * 
 * Provides additional functionality beyond the context hook,
 * including the requireKey function for gating AI features.
 * 
 * @returns {Object} API key utilities
 * 
 * @example
 * const { 
 *   apiKeys, 
 *   hasKey, 
 *   requireKey, 
 *   openModal,
 *   saveKey,
 *   removeKey
 * } = useApiKey();
 */
export function useApiKey() {
  const context = useApiKeyContext();
  
  // Local state for pending action queue
  const [pendingActions, setPendingActions] = useState([]);

  /**
   * Check if an API key exists and optionally trigger modal if missing
   * 
   * @param {string} provider - 'openai' or 'gemini'
   * @param {Function} action - Optional callback to execute if key exists
   * @returns {Promise<boolean>} - True if key exists and action was executed, false otherwise
   */
  const requireKey = useCallback(async (provider, action = null) => {
    // Check if key exists
    if (context.hasKey(provider)) {
      console.log(`[useApiKey] ${provider} key exists, executing action`);
      if (action && typeof action === 'function') {
        await action();
      }
      return true;
    }

    // Key doesn't exist - open modal with pending action
    console.log(`[useApiKey] ${provider} key missing, opening modal`);
    
    context.openModal(provider, action);
    return false;
  }, [context]);

  /**
   * Queue an action to be executed after API key is saved
   * Useful for complex multi-step workflows
   * 
   * @param {Function} action - The action to queue
   */
  const queueAction = useCallback((action) => {
    setPendingActions(prev => [...prev, action]);
  }, []);

  /**
   * Execute all queued actions and clear the queue
   */
  const executeQueuedActions = useCallback(async () => {
    const actions = [...pendingActions];
    setPendingActions([]);
    
    for (const action of actions) {
      if (typeof action === 'function') {
        await action();
      }
    }
  }, [pendingActions]);

  /**
   * Get a masked version of the API key for display
   * 
   * @param {string} provider - 'openai' or 'gemini'
   * @returns {string} Masked key (e.g., "sk-...abcd")
   */
  const getMaskedKey = useCallback((provider) => {
    const key = context.apiKeys[provider];
    if (!key) return null;
    
    // Mask all but first 4 and last 4 characters
    if (key.length <= 8) {
      return '****';
    }
    
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  }, [context.apiKeys]);

  /**
   * Validate an API key format (basic validation)
   * Note: This does NOT make an API call - just format checking
   * 
   * @param {string} provider - 'openai' or 'gemini'
   * @param {string} key - The key to validate
   * @returns {Object} Validation result
   */
  const validateKeyFormat = useCallback((provider, key) => {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'Key is required' };
    }

    const trimmedKey = key.trim();

    if (provider === 'openai') {
      // OpenAI keys typically start with 'sk-'
      if (!trimmedKey.startsWith('sk-')) {
        return { 
          valid: false, 
          error: 'OpenAI keys should start with "sk-"' 
        };
      }
      if (trimmedKey.length < 20) {
        return { 
          valid: false, 
          error: 'OpenAI key appears to be too short' 
        };
      }
    }

    if (provider === 'gemini') {
      // Gemini keys typically don't have a specific prefix but are longer
      if (trimmedKey.length < 20) {
        return { 
          valid: false, 
          error: 'Gemini API key appears to be too short' 
        };
      }
    }

    return { valid: true, error: null };
  }, []);

  /**
   * Test if an API key works by making a minimal API call
   * This is optional and can be implemented based on needs
   * 
   * @param {string} provider - 'openai' or 'gemini'
   * @returns {Promise<Object>} Test result
   */
  const testApiKey = useCallback(async (provider) => {
    const key = context.apiKeys[provider];
    if (!key) {
      return { success: false, error: 'No API key found' };
    }

    try {
      // Placeholder for actual API test
      // In production, this would make a minimal API call
      console.log(`[useApiKey] Testing ${provider} API key...`);
      
      // Simulate API test delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [context.apiKeys]);

  return {
    // From context
    ...context,
    
    // Enhanced functionality
    requireKey,
    queueAction,
    executeQueuedActions,
    getMaskedKey,
    validateKeyFormat,
    testApiKey,
    
    // Convenience
    hasOpenAIKey: context.hasKey('openai'),
    hasGeminiKey: context.hasKey('gemini'),
    openAIKey: context.apiKeys.openai,
    geminiKey: context.apiKeys.gemini
  };
}

export default useApiKey;
