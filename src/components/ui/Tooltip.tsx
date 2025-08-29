import React, { useState, useRef, cloneElement, useEffect } from 'react';
import { usePopper } from 'react-popper';
import { tooltipConfig } from '../../config/tour.config';

interface TooltipProps {
  children: React.ReactElement;
  content?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay?: number;
  disabled?: boolean;
  className?: string;
  tooltipId?: keyof typeof tooltipConfig;
  trigger?: 'hover' | 'click' | 'focus';
  offset?: [number, number];
  arrow?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 200,
  disabled = false,
  className = '',
  tooltipId,
  trigger = 'hover',
  offset = [0, 8],
  arrow = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Get tooltip content from config if tooltipId is provided
  const tooltipContent = tooltipId ? tooltipConfig[tooltipId] : content;

  // Configure Popper
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: position === 'auto' ? 'auto' : position,
    modifiers: [
      {
        name: 'offset',
        options: {
          offset,
        },
      },
      {
        name: 'arrow',
        options: {
          element: arrowElement,
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 8,
        },
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top', 'bottom', 'left', 'right'],
        },
      },
    ],
  });

  const showTooltip = () => {
    if (disabled || !tooltipContent) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (trigger === 'hover') {
      showTooltip();
    }
    // Call original onMouseEnter if it exists
    if (children.props.onMouseEnter) {
      children.props.onMouseEnter(e);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (trigger === 'hover') {
      hideTooltip();
    }
    // Call original onMouseLeave if it exists
    if (children.props.onMouseLeave) {
      children.props.onMouseLeave(e);
    }
  };

  const handleFocus = (e: React.FocusEvent) => {
    if (trigger === 'focus') {
      showTooltip();
    }
    // Call original onFocus if it exists
    if (children.props.onFocus) {
      children.props.onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (trigger === 'focus') {
      hideTooltip();
    }
    // Call original onBlur if it exists
    if (children.props.onBlur) {
      children.props.onBlur(e);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (trigger === 'click') {
      if (isVisible) {
        hideTooltip();
      } else {
        showTooltip();
      }
    }
    // Call original onClick if it exists
    if (children.props.onClick) {
      children.props.onClick(e);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (disabled || !tooltipContent) {
    return children;
  }

  // Clone the child element and add event handlers
  const enhancedChild = cloneElement(children, {
    ref: (node: HTMLElement) => {
      setReferenceElement(node);
      // Handle existing refs
      if (typeof children.ref === 'function') {
        children.ref(node);
      } else if (children.ref) {
        children.ref.current = node;
      }
    },
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onClick: handleClick,
    className: `${children.props.className || ''} ${className}`.trim(),
  });

  return (
    <>
      {enhancedChild}
      
      {isVisible && (
        <div
          ref={setPopperElement}
          style={styles.popper}
          {...attributes.popper}
          className="z-50 max-w-xs tooltip pointer-events-none"
          role="tooltip"
          aria-label={tooltipContent}
        >
          <div className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-xl border border-gray-700">
            {tooltipContent}
          </div>
          
          {arrow && (
            <div
              ref={setArrowElement}
              style={styles.arrow}
              className="absolute w-2 h-2 bg-gray-900 transform rotate-45 border border-gray-700"
            />
          )}
        </div>
      )}
    </>
  );
};