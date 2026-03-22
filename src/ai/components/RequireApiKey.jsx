import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useApiKey as useApiKeyContext } from '../context/ApiKeyContext';

/**
 * RequireApiKey - Scoped API key gating component
 * 
 * Wraps AI-powered features and ONLY requires API keys when triggered.
 * Does NOT block rendering - only execution.
 * 
 * @param {Object} props
 * @param {string} props.provider - 'openai' or 'gemini'
 * @param {React.ReactNode} props.children - The AI feature to protect
 * @param {React.ReactNode} props.fallback - Optional custom fallback UI
 * @param {boolean} props.showLockIcon - Whether to show lock icon on hover/focus
 * @param {string} props.label - Custom label for the gated feature
 * 
 * @example
 * // Basic usage
 * <RequireApiKey provider="openai">
 *   <button onClick={generateImage}>Generate Image</button>
 * </RequireApiKey>
 * 
 * @example
 * // With custom fallback
 * <RequireApiKey 
 *   provider="gemini"
 *   label="Generate Video"
 *   fallback={<CustomGatedButton>Generate Video</CustomGatedButton>}
 * >
 *   <AIVideoGenerator />
 * </RequireApiKey>
 */
export function RequireApiKey({ 
  provider, 
  children, 
  fallback = null,
  showLockIcon = true,
  label = 'this feature'
}) {
  const { hasKey, openModal } = useApiKeyContext();
  const [isGated, setIsGated] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Check if key exists
  const keyExists = hasKey(provider);

  // Handle click - trigger modal if no key
  const handleClick = (e) => {
    if (!keyExists) {
      e.preventDefault();
      e.stopPropagation();
      
      // Open modal with the action that was attempted
      openModal(provider, () => {
        // This callback runs after key is saved
        console.log(`[RequireApiKey] API key provided for ${provider}, proceeding with action`);
      });
      
      setIsGated(true);
      return false;
    }
    
    // Key exists - allow click to propagate
    setIsGated(false);
    return true;
  };

  // Handle keyboard interaction
  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !keyExists) {
      e.preventDefault();
      handleClick(e);
    }
  };

  // Reset gated state when key becomes available
  useEffect(() => {
    if (keyExists) {
      setIsGated(false);
    }
  }, [keyExists]);

  // If key exists, render children normally (no gating)
  if (keyExists) {
    return <>{children}</>;
  }

  // If no key exists, show fallback or default gated UI
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {/* Wrapped children with click interceptor */}
      <div
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Requires ${provider} API key to use ${label}`}
        className={`
          relative cursor-pointer transition-all duration-200
          ${isHovered || isFocused ? 'opacity-75' : ''}
        `}
      >
        {/* Show lock overlay on hover/focus if enabled */}
        {showLockIcon && (isHovered || isFocused) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 rounded-lg">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-lg backdrop-blur-sm">
              <Lock className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                API Key Required
              </span>
            </div>
          </div>
        )}
        
        {children}
      </div>

      {/* Custom fallback (if provided) */}
      {fallback && (
        <div className="mt-2">
          {fallback}
        </div>
      )}
    </div>
  );
}

/**
 * RequireApiKey.Button - Pre-styled button variant
 * 
 * @example
 * <RequireApiKey.Button provider="openai" onClick={generateImage}>
 *   Generate Image
 * </RequireApiKey.Button>
 */
RequireApiKey.Button = function RequireApiKeyButton({ 
  provider, 
  onClick,
  children,
  className = '',
  ...props 
}) {
  const { hasKey, openModal } = useApiKeyContext();

  const handleClick = (e) => {
    if (!hasKey(provider)) {
      e.preventDefault();
      openModal(provider, () => {
        // Execute the original onClick after key is saved
        if (onClick) {
          onClick(e);
        }
      });
      return;
    }
    
    // Execute original onClick
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * RequireApiKey.IconButton - Icon-only variant
 * 
 * @example
 * <RequireApiKey.IconButton provider="gemini" onClick={analyzeImage}>
 *   <Sparkles className="w-5 h-5" />
 * </RequireApiKey.IconButton>
 */
RequireApiKey.IconButton = function RequireApiKeyIconButton({ 
  provider, 
  onClick,
  children,
  showTooltip = true,
  className = '',
  ...props 
}) {
  const { hasKey, openModal } = useApiKeyContext();

  const handleClick = (e) => {
    if (!hasKey(provider)) {
      e.preventDefault();
      e.stopPropagation();
      openModal(provider, () => {
        if (onClick) {
          onClick(e);
        }
      });
      return;
    }
    
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        className={className}
        {...props}
      >
        {children}
      </button>
      
      {!hasKey(provider) && showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          API Key Required
        </div>
      )}
    </div>
  );
};

export default RequireApiKey;
