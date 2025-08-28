import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange: (avatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  contactName?: string;
  contactId?: string;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarChange,
  size = 'md',
  contactName = '',
  contactId
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'w-8 h-8';
      case 'lg': return 'w-16 h-16';
      case 'xl': return 'w-20 h-20';
      case 'md':
      default: return 'w-12 h-12';
    }
  };

  const processImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas not available'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Set canvas size to desired output size
        const size = 150; // Output size for avatar
        canvas.width = size;
        canvas.height = size;

        // Calculate cropping area (square from center)
        const minDimension = Math.min(img.width, img.height);
        const x = (img.width - minDimension) / 2;
        const y = (img.height - minDimension) / 2;

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.clip();

        // Draw and crop image to fit circle
        ctx.drawImage(
          img,
          x, y, minDimension, minDimension, // Source rectangle
          0, 0, size, size // Destination rectangle
        );

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to process image'));
          }
        }, 'image/png', 0.9);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadToSupabase = async (processedImageUrl: string): Promise<string> => {
    try {
      // Convert blob URL to actual blob
      const response = await fetch(processedImageUrl);
      const blob = await response.blob();

      // Generate unique filename
      const fileName = `avatar_${contactId || 'temp'}_${Date.now()}.png`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Process image (crop to circle)
      const processedUrl = await processImage(file);
      setPreviewUrl(processedUrl);

      // Upload to Supabase
      const publicUrl = await uploadToSupabase(processedUrl);

      // Update parent component
      onAvatarChange(publicUrl);

      // Clean up preview URL
      URL.revokeObjectURL(processedUrl);
      setPreviewUrl(null);
      setShowUploadOptions(false);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAIFindImage = async () => {
    setIsUploading(true);
    try {
      // This would call your existing AI image finding service
      const aiImageUrl = await findAIImage(contactName);
      onAvatarChange(aiImageUrl);
      setShowUploadOptions(false);
    } catch (error) {
      console.error('AI image search failed:', error);
      alert('Failed to find AI image. Please try uploading manually.');
    } finally {
      setIsUploading(false);
    }
  };

  const findAIImage = async (name: string): Promise<string> => {
    // Placeholder - integrate with your existing AI service
    // This should call your aiEnrichmentService.findContactImage
    return 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
  };

  const resetAvatar = () => {
    onAvatarChange('');
    setShowUploadOptions(false);
  };

  return (
    <div className="relative inline-block">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Avatar Display */}
      <div className="relative">
        <img
          src={previewUrl || currentAvatar || '/default-avatar.png'}
          alt="Avatar"
          className={`${getSizeClass()} rounded-full object-cover border-2 border-white shadow-md`}
        />

        {/* Upload Button */}
        <button
          onClick={() => setShowUploadOptions(!showUploadOptions)}
          className="absolute -bottom-1 -right-1 p-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg"
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
          ) : (
            <Camera className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Upload Options Modal */}
      {showUploadOptions && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-[200px]">
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </button>

            <button
              onClick={handleAIFindImage}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              disabled={isUploading}
            >
              <Camera className="w-4 h-4" />
              <span>Find AI Image</span>
            </button>

            {currentAvatar && (
              <button
                onClick={resetAvatar}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Avatar</span>
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Click outside to close */}
      {showUploadOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUploadOptions(false)}
        />
      )}
    </div>
  );
};