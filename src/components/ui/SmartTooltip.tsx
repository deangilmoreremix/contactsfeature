import React, { useState, useRef, useEffect } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingArrow,
  arrow as arrowMiddleware,
} from '@floating-ui/react';
import { GlassCard } from './GlassCard';
import { tooltipService, TooltipConfiguration } from '../../services/tooltipService';

interface SmartTooltipProps {
  content?: React.ReactNode;
  featureId?: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'focus' | 'click';
  delay?: number;
  className?: string;
  showArrow?: boolean;
  maxWidth?: string;
}

export const SmartTooltip: React.FC<SmartTooltipProps> = ({
  content: providedContent,
  featureId,
  children,
  position: providedPosition,
  trigger = 'hover',
  delay: providedDelay,
  className = '',
  showArrow: providedShowArrow,
  maxWidth: providedMaxWidth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipConfig, setTooltipConfig] = useState<TooltipConfiguration | null>(null);
  const arrowRef = useRef(null);

  // Load tooltip configuration from service if featureId is provided
  useEffect(() => {
    if (featureId) {
      const config = tooltipService.getTooltip(featureId);
      setTooltipConfig(config);
    }
  }, [featureId]);

  // Determine final values - featureId config takes precedence over props
  const content = React.useMemo(() => {
    if (providedContent) return providedContent;

    if (tooltipConfig) {
      return (
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{tooltipConfig.tooltip_title}</h4>
            <p className="text-gray-700 text-xs mt-1 leading-relaxed">{tooltipConfig.tooltip_description}</p>
          </div>

          {tooltipConfig.tooltip_features && tooltipConfig.tooltip_features.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-800 text-xs mb-2">Features:</h5>
              <ul className="space-y-1">
                {tooltipConfig.tooltip_features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-600 text-xs">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    return null;
  }, [providedContent, tooltipConfig]);

  const position = tooltipConfig?.position_preference || providedPosition || 'top';
  const delay = tooltipConfig?.delay_ms || providedDelay || 300;
  const showArrow = tooltipConfig?.show_arrow ?? providedShowArrow ?? true;
  const maxWidth = tooltipConfig?.max_width || providedMaxWidth || '320px';

  // Don't render tooltip if no content is available
  if (!content) {
    return children;
  }

  const {
    refs,
    floatingStyles,
    context,
    middlewareData: { arrow: { x: arrowX, y: arrowY } = {} },
  } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: position,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      arrowMiddleware({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    delay: { open: delay, close: 100 },
    enabled: trigger === 'hover',
  });

  const focus = useFocus(context, {
    enabled: trigger === 'focus',
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // Clone the child element and add the ref and props
  const childWithRef = React.cloneElement(children, {
    ref: refs.setReference,
    ...getReferenceProps(),
  });

  return (
    <>
      {childWithRef}

      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50"
        >
          {/* Tooltip Content */}
          <div
            className={`
              relative
              bg-white/95 backdrop-blur-md
              border border-white/30
              rounded-xl
              shadow-xl
              text-gray-900
              animate-slide-in
              ${className}
            `}
            style={{ maxWidth }}
          >
            {/* Arrow */}
            {showArrow && (
              <FloatingArrow
                ref={arrowRef}
                context={context}
                className="fill-white/95 stroke-white/30 stroke-1"
                style={{
                  transform: `translate(${arrowX || 0}px, ${arrowY || 0}px)`,
                }}
              />
            )}

            {/* Content */}
            <div className="p-4">
              {content}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Specialized tooltip for AI buttons with consistent styling
interface AITooltipProps extends Omit<SmartTooltipProps, 'content'> {
  title: string;
  description: string;
  features?: string[];
  usage?: string;
  processingTime?: string;
  variant?: 'primary' | 'secondary' | 'accent';
}

export const AITooltip: React.FC<AITooltipProps> = ({
  title,
  description,
  features = [],
  usage,
  processingTime,
  variant = 'primary',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-blue-50/95 to-purple-50/95 border-blue-200/50';
      case 'secondary':
        return 'bg-gradient-to-r from-teal-50/95 to-cyan-50/95 border-teal-200/50';
      case 'accent':
        return 'bg-gradient-to-r from-orange-50/95 to-yellow-50/95 border-orange-200/50';
      default:
        return 'bg-white/95 border-white/30';
    }
  };

  const content = (
    <div className="space-y-3">
      {/* Title */}
      <div>
        <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
        <p className="text-gray-700 text-xs mt-1 leading-relaxed">{description}</p>
      </div>

      {/* Features */}
      {features.length > 0 && (
        <div>
          <h5 className="font-medium text-gray-800 text-xs mb-2">Features:</h5>
          <ul className="space-y-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-gray-600 text-xs">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Usage */}
      {usage && (
        <div>
          <h5 className="font-medium text-gray-800 text-xs mb-1">Usage:</h5>
          <p className="text-gray-600 text-xs">{usage}</p>
        </div>
      )}

      {/* Processing Time */}
      {processingTime && (
        <div className="flex items-center space-x-2 pt-2 border-t border-gray-200/50">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-gray-500 text-xs">{processingTime}</span>
        </div>
      )}
    </div>
  );

  return (
    <SmartTooltip
      {...props}
      content={content}
      className={getVariantStyles()}
    />
  );
};