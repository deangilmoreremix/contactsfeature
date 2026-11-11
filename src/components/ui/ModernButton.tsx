import React from 'react';
import { Loader2 } from 'lucide-react';

interface ModernButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'glass' | 'outline' | 'ghost' | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  onClick?: (() => void) | ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
  className?: string | undefined;
  type?: 'button' | 'submit' | 'reset' | string | undefined;
  style?: React.CSSProperties | undefined;
  icon?: React.ElementType | undefined;
  title?: string | undefined;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  style,
  icon: Icon,
  title
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'glass':
        return 'bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 dark:bg-gray-800/40 dark:border-gray-600/50 dark:hover:bg-gray-700/50';
      case 'secondary':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600';
      case 'outline':
        return 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600';
      case 'ghost':
        return 'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700';
      case 'primary':
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      case 'md':
      default:
        return 'px-4 py-2 text-base';
    }
  };

  return (
    <button
      type={type as 'button' | 'submit' | 'reset'}
      style={style}
      title={title}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement> | undefined}
      disabled={disabled || loading}
      className={`
        ${getVariantClass()}
        ${getSizeClass()}
        rounded-lg font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};