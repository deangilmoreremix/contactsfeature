import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Maximize2 } from 'lucide-react';

interface FloatingFeatureImageProps {
  src: string;
  alt: string;
  title: string;
  description: string;
  floatAnimation: 'gentle' | 'diagonal' | 'wave' | 'bounce' | 'medium';
  glowColor: string;
  delay?: number;
  onClick?: () => void;
}

export const FloatingFeatureImage: React.FC<FloatingFeatureImageProps> = ({
  src,
  alt,
  title,
  description,
  floatAnimation,
  glowColor,
  delay = 0,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;

    setMousePosition({ x, y });
  };

  const getFloatClass = () => {
    switch (floatAnimation) {
      case 'gentle':
        return 'animate-float-gentle';
      case 'diagonal':
        return 'animate-float-diagonal';
      case 'wave':
        return 'animate-float-wave';
      case 'bounce':
        return 'animate-float-bounce';
      case 'medium':
        return 'animate-float-medium';
      default:
        return 'animate-float-gentle';
    }
  };

  const getHoverTransform = () => {
    if (!isHovered) return '';
    const tiltX = mousePosition.y * 10;
    const tiltY = mousePosition.x * -10;
    return `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.05)`;
  };

  const getGlowStyle = () => {
    if (!isHovered) return {};
    return {
      boxShadow: `0 0 40px ${glowColor}, 0 0 80px ${glowColor}40, 0 20px 60px rgba(0, 0, 0, 0.3)`
    };
  };

  return (
    <div
      ref={imageRef}
      className={clsx(
        'floating-feature-image relative rounded-2xl overflow-hidden cursor-pointer group',
        !isHovered && getFloatClass(),
        'animate-fade-in-up'
      )}
      style={{
        animationDelay: `${delay}ms`,
        transform: getHoverTransform(),
        ...getGlowStyle()
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer opacity-30" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        className={clsx(
          'w-full h-full object-contain transition-all duration-500',
          isHovered && 'scale-110 brightness-110'
        )}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
      />

      <div
        className={clsx(
          'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-500'
        )}
      >
        <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          <h3 className="text-white text-xl font-bold mb-2 flex items-center space-x-2">
            <span>{title}</span>
            <Maximize2 className="w-5 h-5 opacity-70" />
          </h3>
          <p className="text-white/90 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div
        className={clsx(
          'absolute inset-0 border-4 rounded-2xl transition-all duration-500',
          isHovered ? 'border-opacity-100 animate-glow-pulse' : 'border-opacity-0'
        )}
        style={{ borderColor: glowColor }}
      />

      <div
        className={clsx(
          'absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full',
          'transform transition-all duration-500',
          isHovered ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'
        )}
      >
        <span className="text-xs font-semibold text-gray-800">Click to expand</span>
      </div>

      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-64 h-64 bg-white/10 rounded-full blur-3xl"
            style={{
              left: `${(mousePosition.x + 1) * 50}%`,
              top: `${(mousePosition.y + 1) * 50}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>
      )}
    </div>
  );
};
