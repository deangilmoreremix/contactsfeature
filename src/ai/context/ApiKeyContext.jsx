import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * ApiKeyContext - Global context for managing API keys across multiple AI applications
 * 
 * Storage structure (localStorage):
 * {
 *   openai: string | null,
 *   gemini: string | null
 * }
 * 
 * SECURITY: API keys are stored locally only. Do NOT log or expose keys.
 */

const STORAGE_KEY = 'ai-api-keys';

// Initial state
const initialState = {
  openai: null,
  gemini: null
};

const ApiKeyContext = createContext(null);

/**
 * ApiKeyProvider - Wraps the application to provide API key management
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.appName - Optional app name for tracking (e.g., "SmartCRM", "ImageStudio")
 * 
 * @example
 * <ApiKeyProvider appName="SmartCRM">
 *   <App />
 *   <ApiKeyModal />
 * </ApiKeyProvider>
 */
export function ApiKeyProvider({ children, appName }) {
  const [apiKeys, setApiKeys] = useState(initialState);
  const [modalState, setModalState] = useState({
    isOpen: false,
    provider: null, // 'openai' | 'gemini' | null
    returnAction: null // Callback to execute after key is saved
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load API keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setApiKeys({
          openai: parsed.openai || null,
          gemini: parsed.gemini || null
        });
      }
    } catch (error) {
      console.error('Failed to load API keys from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save API keys to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apiKeys));
      } catch (error) {
        console.error('Failed to save API keys to localStorage:', error);
      }
    }
  }, [apiKeys, isLoading]);

  /**
   * Save an API key for a specific provider
   * @param {string} provider - 'openai' or 'gemini'
   * @param {string} key - The API key
   */
  const saveKey = useCallback((provider, key) => {
    if (!key || typeof key !== 'string') {
      console.error('Invalid API key provided');
      return false;
    }

    // Security: Do NOT log the actual key
    const maskedKey = key.substring(0, 4) + '...' + key.substring(key.length - 4);
    console.log(`[ApiKeyContext] Saving ${provider} API key (${maskedKey})`);

    setApiKeys(prev => ({
      ...prev,
      [provider]: key.trim()
    }));

    return true;
  }, []);

  /**
   * Remove an API key for a specific provider
   * @param {string} provider - 'openai' or 'gemini'
   */
  const removeKey = useCallback((provider) => {
    console.log(`[ApiKeyContext] Removing ${provider} API key`);
    setApiKeys(prev => ({
      ...prev,
      [provider]: null
    }));
  }, []);

  /**
   * Check if a provider has a valid API key
   * @param {string} provider - 'openai' or 'gemini'
   * @returns {boolean}
   */
  const hasKey = useCallback((provider) => {
    return !!(apiKeys[provider] && apiKeys[provider].length > 0);
  }, [apiKeys]);

  /**
   * Open the API key modal
   * @param {string} provider - 'openai' or 'gemini'
   * @param {Function} returnAction - Optional callback to execute after key is saved
   */
  const openModal = useCallback((provider, returnAction = null) => {
    console.log(`[ApiKeyContext] Opening modal for ${provider}`);
    setModalState({
      isOpen: true,
      provider,
      returnAction
    });
  }, []);

  /**
   * Close the API key modal
   */
  const closeModal = useCallback(() => {
    console.log('[ApiKeyContext] Closing modal');
    setModalState({
      isOpen: false,
      provider: null,
      returnAction: null
    });
  }, []);

  /**
   * Execute the return action if it exists, then close modal
   */
  const handleModalSuccess = useCallback(() => {
    if (modalState.returnAction) {
      console.log('[ApiKeyContext] Executing return action');
      modalState.returnAction();
    }
    closeModal();
  }, [modalState.returnAction, closeModal]);

  const value = {
    // State
    apiKeys,
    modalState,
    isLoading,
    appName,
    
    // Actions
    saveKey,
    removeKey,
    hasKey,
    openModal,
    closeModal,
    handleModalSuccess
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
}

/**
 * Hook to access the ApiKeyContext
 * @returns {Object} The context value
 * @throws {Error} If used outside of ApiKeyProvider
 * 
 * @example
 * const { apiKeys, hasKey, openModal } = useApiKey();
 */
export function useApiKey() {
  const context = useContext(ApiKeyContext);
  
  if (!context) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  
  return context;
}

export default ApiKeyContext;
