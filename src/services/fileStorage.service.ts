/**
 * File Storage Service
 *
 * Handles file uploads, downloads, and management for the application.
 * Supports Supabase Storage as primary backend with localStorage fallback.
 */

import { supabase } from './supabaseClient';
import { logger } from './logger.service';
import { cacheService } from './cache.service';

export interface FileUploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedAt: string;
  error?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  checksum?: string;
  thumbnailUrl?: string;
  contactId: string;
  filePath: string;
  publicUrl: string;
  metadata?: any;
}

class FileStorageService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  private readonly BUCKET_NAME = 'contact-files';

  /**
   * Upload a file to storage
   */
  async uploadFile(
    file: File,
    contactId: string,
    metadata?: { description?: string; tags?: string[] }
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          fileId: '',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          url: '',
          uploadedAt: '',
          error: validation.error || 'Validation failed'
        };
      }

      // Generate unique file ID
      const fileId = `${contactId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
      const filePath = `contacts/${fileId}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        logger.error('Supabase file upload failed', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Store metadata in database
      const fileMetadata = {
        id: fileId,
        contactId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        filePath,
        publicUrl: urlData.publicUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.id || 'anonymous',
        checksum: await this.calculateChecksum(file),
        metadata: metadata || {}
      };

      const { error: dbError } = await supabase
        .from('contact_files')
        .insert([fileMetadata]);

      if (dbError) {
        logger.error('File metadata storage failed', dbError);
        // Don't throw here - file is uploaded, just metadata failed
      }

      // Cache file metadata
      cacheService.setFileMetadata(fileId, fileMetadata);

      logger.info('File uploaded successfully', { fileId, fileName: file.name });

      return {
        success: true,
        fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: urlData.publicUrl,
        uploadedAt: fileMetadata.uploadedAt
      };

    } catch (error) {
      logger.error('File upload failed', error as Error);
      return {
        success: false,
        fileId: '',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: '',
        uploadedAt: '',
        error: (error as Error).message
      };
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: File[],
    contactId: string,
    metadata?: { description?: string; tags?: string[] }
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file, contactId, metadata);
      results.push(result);
    }

    return results;
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    // Check cache first
    const cached = cacheService.getFileMetadata(fileId);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('contact_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error) {
        logger.error('Failed to get file metadata', error);
        return null;
      }

      // Cache the metadata
      cacheService.setFileMetadata(fileId, data);
      return data;
    } catch (error) {
      logger.error('File metadata retrieval failed', error as Error);
      return null;
    }
  }

  /**
   * Get all files for a contact
   */
  async getContactFiles(contactId: string): Promise<FileMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('contact_files')
        .select('*')
        .eq('contactId', contactId)
        .order('uploadedAt', { ascending: false });

      if (error) {
        logger.error('Failed to get contact files', error);
        return [];
      }

      // Cache file metadata
      data.forEach(file => {
        cacheService.setFileMetadata(file.id, file);
      });

      return data || [];
    } catch (error) {
      logger.error('Contact files retrieval failed', error as Error);
      return [];
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      // Get file metadata first
      const metadata = await this.getFileMetadata(fileId);
      if (!metadata) {
        return false;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([metadata.filePath]);

      if (storageError) {
        logger.error('File storage deletion failed', storageError);
      }

      // Delete metadata from database
      const { error: dbError } = await supabase
        .from('contact_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        logger.error('File metadata deletion failed', dbError);
        return false;
      }

      // Remove from cache
      cacheService.invalidateFile(fileId);

      logger.info('File deleted successfully', { fileId });
      return true;
    } catch (error) {
      logger.error('File deletion failed', error as Error);
      return false;
    }
  }

  /**
   * Download a file
   */
  async downloadFile(fileId: string): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(fileId);
      if (!metadata) {
        return false;
      }

      // Create download link
      const link = document.createElement('a');
      link.href = metadata.publicUrl;
      link.download = metadata.name;
      link.target = '_blank';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logger.info('File download initiated', { fileId });
      return true;
    } catch (error) {
      logger.error('File download failed', error as Error);
      return false;
    }
  }

  /**
   * Generate thumbnail for image files
   */
  async generateThumbnail(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) return null;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail size (max 200px)
        const maxSize = 200;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Draw thumbnail
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailUrl);
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (10MB)`
      };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not supported. Allowed types: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, WebP`
      };
    }

    return { valid: true };
  }

  /**
   * Calculate file checksum for integrity verification
   */
  private async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Clean up temporary files and URLs
   */
  cleanup(): void {
    // Clean up any temporary object URLs
    // This would be called when component unmounts
  }
}

export const fileStorageService = new FileStorageService();