import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick,
  hover = true 
}) => {
  return (
    <div
      className={`
        bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg
        ${hover ? 'hover:bg-white/90 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};