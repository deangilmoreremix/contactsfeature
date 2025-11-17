import React, { memo, useState } from 'react';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { Contact } from '../../types';
import { Loader2, User } from 'lucide-react';

interface ContactAvatarProps {
  contact: Contact;
  size?: 'sm' | 'md' | 'lg';
  showLoadingIndicator?: boolean;
  isAnalyzing?: boolean;
}

// Status mapping for AvatarWithStatus component
const getStatusForAvatar = (contactStatus: string): "active" | "pending" | "inactive" | "error" | "success" | "warning" => {
  switch (contactStatus) {
    case 'active':
    case 'customer':
      return 'active';
    case 'lead':
    case 'prospect':
      return 'pending';
    case 'inactive':
    case 'churned':
      return 'inactive';
    default:
      return 'pending';
  }
};

// Generate initials from contact name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

// Generate consistent background color based on name
const getBackgroundColor = (name: string): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'
  ] as const;
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

export const ContactAvatar: React.FC<ContactAvatarProps> = memo(({
  contact,
  size = 'lg',
  showLoadingIndicator = true,
  isAnalyzing = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!contact.avatarSrc);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Use actual avatar if available and not errored, otherwise show fallback
  const shouldShowImage = contact.avatarSrc && !imageError;

  return (
    <div className="relative inline-block">
      {shouldShowImage ? (
        <>
          <img
            src={contact.avatarSrc}
            alt={contact.name}
            onError={handleImageError}
            onLoad={handleImageLoad}
            className={`
              rounded-full object-cover border-2 border-white shadow-md
              ${size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'}
            `}
          />
          {/* Status indicator for image avatar */}
          <div className="absolute -bottom-1 -right-1">
            <div className={`
              w-3 h-3 rounded-full border-2 border-white
              ${getStatusForAvatar(contact.status) === 'active' ? 'bg-green-500' :
                getStatusForAvatar(contact.status) === 'pending' ? 'bg-yellow-500' :
                getStatusForAvatar(contact.status) === 'inactive' ? 'bg-gray-500' :
                'bg-blue-500'}
            `} />
          </div>
          {/* Image Loading Indicator */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
        </>
      ) : (
        // Fallback avatar with initials
        <div className={`
          relative rounded-full flex items-center justify-center text-white font-semibold border-2 border-white shadow-sm
          ${size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-sm'}
          ${getBackgroundColor(contact.name)}
        `}>
          {getInitials(contact.name) || <User className="w-4 h-4" />}
          {/* Status indicator for fallback avatar */}
          <div className={`
            absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white
            ${getStatusForAvatar(contact.status) === 'active' ? 'bg-green-500' :
              getStatusForAvatar(contact.status) === 'pending' ? 'bg-yellow-500' :
              getStatusForAvatar(contact.status) === 'inactive' ? 'bg-gray-500' :
              'bg-blue-500'}
          `} />
        </div>
      )}

      {/* Analysis Loading Indicator */}
      {showLoadingIndicator && isAnalyzing && (
        <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
});

ContactAvatar.displayName = 'ContactAvatar';