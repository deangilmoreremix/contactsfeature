import React from 'react';

interface StatusIndicatorProps {
  status: 'active' | 'pending' | 'inactive' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  label?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  size = 'md', 
  pulse = false,
  label 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
      case 'success':
        return 'bg-green-500';
      case 'pending':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'inactive':
      default:
        return 'bg-gray-400';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      case 'md':
      default:
        return 'w-3 h-3';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          ${getSizeClass()} 
          ${getStatusColor()} 
          rounded-full
          ${pulse ? 'animate-pulse' : ''}
        `}
      />
      {label && (
        <span className="text-sm text-gray-600 font-medium">{label}</span>
      )}
    </div>
  );
};