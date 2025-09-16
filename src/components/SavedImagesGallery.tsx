import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { ModernButton } from './ui/ModernButton';
import { imageStorageService, type SavedImage } from '../services/imageStorage.service';
import {
  X,
  Download,
  Trash2,
  Eye,
  Calendar,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface SavedImagesGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SavedImagesGallery: React.FC<SavedImagesGalleryProps> = ({
  isOpen,
  onClose
}) => {
  const [images, setImages] = useState<SavedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SavedImage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen]);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const savedImages = await imageStorageService.getUserImages(50);
      setImages(savedImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    setDeletingId(imageId);
    try {
      const success = await imageStorageService.deleteSavedImage(imageId);
      if (success) {
        setImages(prev => prev.filter(img => img.id !== imageId));
        if (selectedImage?.id === imageId) {
          setSelectedImage(null);
        }
      } else {
        alert('Failed to delete image');
      }
    } catch (err) {
      alert('Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadImage = (image: SavedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.original_filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] overflow-hidden flex">
        {/* Main Gallery */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Saved Images</h2>
              <p className="text-gray-600 mt-1">
                {images.length} image{images.length !== 1 ? 's' : ''} saved
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-gray-600">Loading your images...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <ModernButton onClick={loadImages} variant="outline">
                    Try Again
                  </ModernButton>
                </div>
              </div>
            ) : images.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-500 mb-2">No saved images yet</h3>
                  <p className="text-gray-400 mb-6">Generate and save some images to see them here</p>
                  <ModernButton onClick={onClose} variant="primary">
                    Generate Images
                  </ModernButton>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6 overflow-y-auto">
                {images.map((image) => (
                  <GlassCard
                    key={image.id}
                    className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300"
                    onClick={() => setSelectedImage(image)}
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={image.thumbnail_url || image.url}
                        alt={image.original_filename}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 truncate mb-1">
                        {image.original_filename}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatFileSize(image.file_size)}</span>
                        <span>{new Date(image.created_at).toLocaleDateString()}</span>
                      </div>
                      {image.metadata?.feature && (
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {image.metadata.feature}
                          </span>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Image Details Sidebar */}
        {selectedImage && (
          <div className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col">
            {/* Image Preview */}
            <div className="p-4 border-b border-gray-200">
              <img
                src={selectedImage.url}
                alt={selectedImage.original_filename}
                className="w-full rounded-lg shadow-sm"
              />
            </div>

            {/* Image Details */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedImage.original_filename}
              </h3>

              {/* Metadata */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Created: {new Date(selectedImage.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Size: {formatFileSize(selectedImage.file_size)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Type: {selectedImage.mime_type}
                  </span>
                </div>
              </div>

              {/* Generation Details */}
              {selectedImage.metadata && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Generation Details</h4>
                  <div className="space-y-2 text-sm">
                    {selectedImage.metadata.feature && (
                      <div>
                        <span className="text-gray-500">Feature:</span>
                        <span className="ml-2 font-medium">{selectedImage.metadata.feature}</span>
                      </div>
                    )}
                    {selectedImage.metadata.format && (
                      <div>
                        <span className="text-gray-500">Format:</span>
                        <span className="ml-2 font-medium">{selectedImage.metadata.format}</span>
                      </div>
                    )}
                    {selectedImage.metadata.aspect_ratio && (
                      <div>
                        <span className="text-gray-500">Aspect Ratio:</span>
                        <span className="ml-2 font-medium">{selectedImage.metadata.aspect_ratio}</span>
                      </div>
                    )}
                    {selectedImage.metadata.variants_generated && (
                      <div>
                        <span className="text-gray-500">Variants:</span>
                        <span className="ml-2 font-medium">{selectedImage.metadata.variants_generated}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Prompt */}
              {selectedImage.metadata?.prompt && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Prompt</h4>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border">
                    {selectedImage.metadata.prompt}
                  </p>
                </div>
              )}

              {/* Tags */}
              {selectedImage.metadata?.tags && selectedImage.metadata.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedImage.metadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 space-y-2">
              <ModernButton
                onClick={() => handleDownloadImage(selectedImage)}
                className="w-full flex items-center justify-center space-x-2"
                variant="primary"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </ModernButton>

              <ModernButton
                onClick={() => handleDeleteImage(selectedImage.id)}
                disabled={deletingId === selectedImage.id}
                className="w-full flex items-center justify-center space-x-2"
                variant="outline"
              >
                {deletingId === selectedImage.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete</span>
              </ModernButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};