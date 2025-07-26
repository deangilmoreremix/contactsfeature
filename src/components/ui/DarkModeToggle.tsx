import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';

interface DarkModeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ 
  className = '', 
  showLabel = false,
  size = 'md' 
}) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-1.5 w-8 h-8';
      case 'lg':
        return 'p-3 w-12 h-12';
      default:
        return 'p-2 w-10 h-10';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        ${getSizeClasses()}
        relative rounded-lg transition-all duration-300 ease-in-out
        bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
        border border-gray-200 dark:border-gray-600
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800
        group
        ${className}
      `}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      aria-pressed={isDarkMode}
      role="switch"
    >
      {/* Sun Icon (Light Mode) */}
      <Sun 
        className={`
          ${getIconSize()} 
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          text-yellow-500 transition-all duration-300 ease-in-out
          ${isDarkMode 
            ? 'opacity-0 rotate-90 scale-50' 
            : 'opacity-100 rotate-0 scale-100'
          }
        `}
      />
      
      {/* Moon Icon (Dark Mode) */}
      <Moon 
        className={`
          ${getIconSize()} 
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          text-blue-400 transition-all duration-300 ease-in-out
          ${isDarkMode 
            ? 'opacity-100 rotate-0 scale-100' 
            : 'opacity-0 -rotate-90 scale-50'
          }
        `}
      />
      
      {/* Label */}
      {showLabel && (
        <span className="sr-only">
          {isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        </span>
      )}
      
      {/* Tooltip */}
      <div className="
        absolute -top-12 left-1/2 transform -translate-x-1/2
        bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800
        px-2 py-1 rounded text-xs font-medium
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        pointer-events-none whitespace-nowrap z-50
      ">
        {isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        <div className="
          absolute top-full left-1/2 transform -translate-x-1/2
          border-4 border-transparent border-t-gray-800 dark:border-t-gray-200
        "></div>
      </div>
    </button>
  );
};