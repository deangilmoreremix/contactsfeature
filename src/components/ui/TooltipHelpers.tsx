import React from 'react';
import { SmartTooltip } from './SmartTooltip';
import { ModernButton } from './ModernButton';
import { Info } from 'lucide-react';

interface WithTooltipProps {
  featureId: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const WithTooltip: React.FC<WithTooltipProps> = ({
  featureId,
  children,
  position,
  delay
}) => {
  return (
    <SmartTooltip
      featureId={featureId}
      position={position}
      delay={delay}
    >
      {children}
    </SmartTooltip>
  );
};

interface FeatureButtonProps {
  featureId: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<any>;
  className?: string;
}

export const FeatureButton: React.FC<FeatureButtonProps> = ({
  featureId,
  label,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = ''
}) => {
  return (
    <SmartTooltip featureId={featureId}>
      <ModernButton
        variant={variant}
        size={size}
        onClick={onClick}
        disabled={disabled}
        className={className}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </ModernButton>
    </SmartTooltip>
  );
};

interface TooltipIconProps {
  featureId: string;
  size?: number;
  className?: string;
}

export const TooltipIcon: React.FC<TooltipIconProps> = ({
  featureId,
  size = 16,
  className = ''
}) => {
  return (
    <SmartTooltip featureId={featureId} position="top" delay={200}>
      <button
        className={`inline-flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors ${className}`}
        aria-label="More information"
      >
        <Info size={size} />
      </button>
    </SmartTooltip>
  );
};

interface TooltipWrapperProps {
  featureId: string;
  children: React.ReactElement;
  showIcon?: boolean;
  iconPosition?: 'before' | 'after';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({
  featureId,
  children,
  showIcon = false,
  iconPosition = 'after',
  position = 'top'
}) => {
  if (!showIcon) {
    return (
      <SmartTooltip featureId={featureId} position={position}>
        {children}
      </SmartTooltip>
    );
  }

  return (
    <div className="inline-flex items-center space-x-2">
      {iconPosition === 'before' && <TooltipIcon featureId={featureId} />}

      <SmartTooltip featureId={featureId} position={position}>
        {children}
      </SmartTooltip>

      {iconPosition === 'after' && <TooltipIcon featureId={featureId} />}
    </div>
  );
};

export { SmartTooltip };
