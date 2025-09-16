import { supabase } from '../lib/supabase';
import { logger } from './logger.service';

export interface SavedImage {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  url: string;
  thumbnail_url?: string | null;
  file_size: number;
  mime_type: string;
  metadata: {
    prompt?: string;
    feature?: string;
    format?: string;
    aspect_ratio?: string;
    seeds_used?: number;
    variants_generated?: number;
    gemini_model?: string;
    generation_timestamp?: string;
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface ImageUploadResult {
  success: boolean;
  image?: SavedImage;
  error?: string;
}

class ImageStorageService {
  private readonly BUCKET_NAME = 'generated-images';
  private readonly THUMBNAIL_BUCKET_NAME = 'generated-thumbnails';

  /**
   * Initialize storage buckets (call this once during app setup)
   */
  async initializeBuckets(): Promise<void> {
    try {
      // Create main bucket if it doesn't exist
      const { data: buckets } = await supabase.storage.listBuckets();

      const mainBucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);
      const thumbnailBucketExists = buckets?.some(bucket => bucket.name === this.THUMBNAIL_BUCKET_NAME);

      if (!mainBucketExists) {
        await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
          fileSizeLimit: 10485760 // 10MB
        });
        logger.info(`Created storage bucket: ${this.BUCKET_NAME}`);
      }

      if (!thumbnailBucketExists) {
        await supabase.storage.createBucket(this.THUMBNAIL_BUCKET_NAME, {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
          fileSizeLimit: 1048576 // 1MB
        });
        logger.info(`Created storage bucket: ${this.THUMBNAIL_BUCKET_NAME}`);
      }
    } catch (error) {
      logger.error('Failed to initialize storage buckets', error as Error);
      throw new Error('Failed to initialize image storage');
    }
  }

  /**
   * Save a generated image to Supabase Storage and database
   */
  async saveGeneratedImage(
    imageDataUrl: string,
    filename: string,
    metadata: SavedImage['metadata']
  ): Promise<ImageUploadResult> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to save images');
      }

      // Convert data URL to blob
      const blob = this.dataUrlToBlob(imageDataUrl);
      const fileSize = blob.size;

      // Generate unique filename
      const timestamp = Date.now();
      const uniqueFilename = `${user.id}/${timestamp}_${filename}`;
      const thumbnailFilename = `${user.id}/${timestamp}_thumb_${filename}`;

      // Upload main image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(uniqueFilename, blob, {
          contentType: blob.type,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(uniqueFilename);

      // Generate and upload thumbnail
      let thumbnailUrl: string | undefined;
      try {
        const thumbnailBlob = await this.generateThumbnail(blob);
        const { data: thumbData } = await supabase.storage
          .from(this.THUMBNAIL_BUCKET_NAME)
          .upload(thumbnailFilename, thumbnailBlob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (thumbData) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from(this.THUMBNAIL_BUCKET_NAME)
            .getPublicUrl(thumbnailFilename);
          thumbnailUrl = thumbPublicUrl;
        }
      } catch (thumbnailError) {
        logger.warn('Thumbnail generation failed, continuing without thumbnail', thumbnailError as Error);
      }

      // Save metadata to database
      const imageRecord: Omit<SavedImage, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        filename: uniqueFilename,
        original_filename: filename,
        url: publicUrl,
        thumbnail_url: thumbnailUrl || null,
        file_size: fileSize,
        mime_type: blob.type,
        metadata: {
          ...metadata,
          generation_timestamp: new Date().toISOString()
        }
      };

      const { data: savedImage, error: dbError } = await supabase
        .from('generated_images')
        .insert(imageRecord)
        .select()
        .single();

      if (dbError) {
        // If database save fails, try to clean up uploaded files
        await this.deleteImage(uniqueFilename);
        if (thumbnailUrl) {
          await this.deleteThumbnail(thumbnailFilename);
        }
        throw new Error(`Database save failed: ${dbError.message}`);
      }

      logger.info(`Successfully saved image: ${filename}`, { userId: user.id, imageId: savedImage.id });

      return {
        success: true,
        image: savedImage as SavedImage
      };

    } catch (error) {
      logger.error('Failed to save generated image', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's saved images
   */
  async getUserImages(limit = 50, offset = 0): Promise<SavedImage[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch images: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get user images', error as Error);
      throw error;
    }
  }

  /**
   * Delete a saved image
   */
  async deleteSavedImage(imageId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Get image record first
      const { data: image, error: fetchError } = await supabase
        .from('generated_images')
        .select('*')
        .eq('id', imageId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !image) {
        throw new Error('Image not found or access denied');
      }

      // Delete from storage
      await this.deleteImage(image.filename);
      if (image.thumbnail_url) {
        const thumbnailFilename = image.filename.replace('/', '/thumb_');
        await this.deleteThumbnail(thumbnailFilename);
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`Failed to delete image: ${deleteError.message}`);
      }

      logger.info(`Successfully deleted image: ${imageId}`, { userId: user.id });
      return true;

    } catch (error) {
      logger.error('Failed to delete saved image', error as Error);
      return false;
    }
  }

  /**
   * Update image metadata
   */
  async updateImageMetadata(imageId: string, updates: Partial<SavedImage['metadata']>): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { error } = await supabase
        .from('generated_images')
        .update({
          metadata: updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to update metadata: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error('Failed to update image metadata', error as Error);
      return false;
    }
  }

  // Private helper methods

  private dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    if (arr.length < 2) {
      throw new Error('Invalid data URL format');
    }

    const mimeMatch = arr[0]?.match(/:(.*?);/);
    const mime = mimeMatch?.[1] || 'image/png';
    const dataPart = arr[1];
    if (!dataPart) {
      throw new Error('Invalid data URL: missing data part');
    }

    const bstr = atob(dataPart);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  private async generateThumbnail(imageBlob: Blob, maxSize = 200): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate thumbnail dimensions
        const aspectRatio = img.width / img.height;
        let { width, height } = { width: img.width, height: img.height };

        if (width > height) {
          if (width > maxSize) {
            width = maxSize;
            height = width / aspectRatio;
          }
        } else {
          if (height > maxSize) {
            height = maxSize;
            width = height * aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          },
          'image/jpeg',
          0.8
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = URL.createObjectURL(imageBlob);
    });
  }

  private async deleteImage(filename: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([filename]);

    if (error) {
      logger.warn(`Failed to delete image from storage: ${filename}`, error);
    }
  }

  private async deleteThumbnail(filename: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.THUMBNAIL_BUCKET_NAME)
      .remove([filename]);

    if (error) {
      logger.warn(`Failed to delete thumbnail from storage: ${filename}`, error);
    }
  }
}

export const imageStorageService = new ImageStorageService();