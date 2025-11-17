import React, { useState, useCallback, useRef } from 'react';

interface UseHoverPreviewOptions {
  delay?: number;
  hideDelay?: number;
  disabled?: boolean;
}

interface UseHoverPreviewResult {
  isHovered: boolean;
  showPreview: boolean;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handleFocus: () => void;
  handleBlur: () => void;
}

/**
 * Custom hook for managing hover preview functionality with configurable delays
 * Supports both mouse and keyboard interactions for accessibility
 */
export const useHoverPreview = (options: UseHoverPreviewOptions = {}): UseHoverPreviewResult => {
  const { delay = 300, hideDelay = 150, disabled = false } = options;

  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = undefined;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;

    clearTimeouts();
    setIsHovered(true);

    showTimeoutRef.current = setTimeout(() => {
      setShowPreview(true);
    }, delay);
  }, [delay, disabled, clearTimeouts]);

  const handleMouseLeave = useCallback(() => {
    if (disabled) return;

    setIsHovered(false);

    hideTimeoutRef.current = setTimeout(() => {
      setShowPreview(false);
    }, hideDelay);
  }, [hideDelay, disabled]);

  const handleFocus = useCallback(() => {
    if (disabled) return;

    clearTimeouts();
    setIsHovered(true);
    setShowPreview(true);
  }, [disabled, clearTimeouts]);

  const handleBlur = useCallback(() => {
    if (disabled) return;

    setIsHovered(false);
    setShowPreview(false);
  }, [disabled]);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);

  return {
    isHovered,
    showPreview,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur
  };
};