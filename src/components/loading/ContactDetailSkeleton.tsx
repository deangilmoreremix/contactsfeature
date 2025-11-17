import React, { memo } from 'react';
import clsx from 'clsx';

interface ContactDetailSkeletonProps {
  variant?: 'full' | 'sidebar' | 'content';
  className?: string;
}

const ContactDetailSkeletonComponent: React.FC<ContactDetailSkeletonProps> = ({
  variant = 'full',
  className
}) => {
  if (variant === 'sidebar') {
    return <ContactSidebarSkeleton className={className} />;
  }

  if (variant === 'content') {
    return <ContactContentSkeleton className={className} />;
  }

  return (
    <div className={clsx('flex h-full', className)}>
      <ContactSidebarSkeleton className="w-80 border-r border-gray-200" />
      <ContactContentSkeleton className="flex-1" />
    </div>
  );
};

const ContactSidebarSkeleton: React.FC<{ className?: string | undefined }> = ({ className }) => (
  <div className={clsx('bg-white border-r border-gray-200 flex flex-col h-full', className)}>
    {/* Header */}
    <div className="flex items-center justify-between p-4 border-b border-gray-100">
      <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
      <div className="flex space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>

    {/* Avatar Section */}
    <div className="p-5 text-center border-b border-gray-100">
      <div className="relative inline-block mb-4">
        <div className="w-24 h-24 bg-gray-200 rounded-full animate-pulse" />
        <div className="absolute -top-1 -right-1 w-7 h-7 bg-gray-200 rounded-full animate-pulse" />
        <div className="absolute -top-1 -left-1 w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-1 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-24 mx-auto animate-pulse" />
    </div>

    {/* AI Tools Section */}
    <div className="p-4 border-b border-gray-100">
      <div className="h-5 bg-gray-200 rounded w-24 mb-3 animate-pulse" />
      <div className="space-y-2">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>

    {/* Quick Actions */}
    <div className="p-4 border-b border-gray-100">
      <div className="h-5 bg-gray-200 rounded w-28 mb-3 animate-pulse" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>

    {/* Contact Info */}
    <div className="p-4 flex-1">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ContactContentSkeleton: React.FC<{ className?: string | undefined }> = ({ className }) => (
  <div className={clsx('flex flex-col h-full', className)}>
    {/* Tab Navigation */}
    <div className="border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center justify-between p-5">
        <div className="flex space-x-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse" />
          ))}
        </div>
        <div className="flex space-x-3">
          <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-lg w-36 animate-pulse" />
        </div>
      </div>
    </div>

    {/* Content Area */}
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      {/* Overview Tab Content */}
      <div className="space-y-6">
        {/* AI Enhancement Notice */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-64 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Social Profiles */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ContactDetailSkeleton = memo(ContactDetailSkeletonComponent);
ContactDetailSkeleton.displayName = 'ContactDetailSkeleton';