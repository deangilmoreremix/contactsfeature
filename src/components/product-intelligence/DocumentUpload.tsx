import React, { useState, useCallback, memo } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { productIntelligenceService } from '../../services/productIntelligenceService';
import { securityService } from '../../services/security.service';

interface DocumentUploadProps {
  onFilesSelected: (files: File[]) => void;
  onFileProcessed?: (file: File, result: any) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  isProcessing?: boolean;
}

interface FileUploadState {
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: any;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = memo(({
  onFilesSelected,
  onFileProcessed,
  maxFiles = 5,
  maxFileSize = 10, // 10MB default
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xls', '.xlsx'],
  isProcessing = false
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string>('');

  const validateFile = useCallback((file: File): string | null => {
    // Use security service for comprehensive validation
    const validation = securityService.validateFileUpload(file, acceptedTypes, maxFileSize * 1024 * 1024);

    if (!validation.isValid) {
      return validation.errors.join(', ');
    }

    return null;
  }, [maxFileSize, acceptedTypes]);

  const processFile = useCallback(async (file: File, fileState: FileUploadState) => {
    try {
      // Update status to processing
      setUploadedFiles(prev => prev.map(f =>
        f.file === file ? { ...f, status: 'processing' as const, progress: 50 } : f
      ));

      // Process the file using the analysis service
      const result = await productIntelligenceService.analyzeDocument(file);

      // Update status to completed
      setUploadedFiles(prev => prev.map(f =>
        f.file === file ? {
          ...f,
          status: 'completed' as const,
          progress: 100,
          result
        } : f
      ));

      // Notify parent component
      onFileProcessed?.(file, result);

    } catch (error) {
      console.error('File processing failed:', error);
      setUploadedFiles(prev => prev.map(f =>
        f.file === file ? {
          ...f,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Processing failed'
        } : f
      ));
    }
  }, [onFileProcessed]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate files
    fileArray.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push(file);
      }
    });

    // Check total file count
    const totalFiles = uploadedFiles.length + validFiles.length;
    if (totalFiles > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Set errors if any
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setError('');

    // Create file states
    const newFileStates: FileUploadState[] = validFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0
    }));

    // Add to uploaded files
    setUploadedFiles(prev => [...prev, ...newFileStates]);

    // Notify parent
    onFilesSelected(validFiles);

    // Process files if not globally processing
    if (!isProcessing) {
      newFileStates.forEach(fileState => {
        processFile(fileState.file, fileState);
      });
    }
  }, [uploadedFiles, maxFiles, validateFile, onFilesSelected, isProcessing, processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, [handleFiles]);

  const removeFile = useCallback((fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(f => f.file !== fileToRemove));
  }, []);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'txt':
        return '📃';
      case 'csv':
      case 'xls':
      case 'xlsx':
        return '📊';
      default:
        return '📄';
    }
  };

  const getStatusIcon = (status: FileUploadState['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            Drop documents here or click to browse
          </p>
          <p className="text-sm text-gray-600">
            Supports: {productIntelligenceService.getSupportedFileTypes()}
          </p>
          <p className="text-xs text-gray-500">
            Maximum {maxFiles} files, {maxFileSize}MB each
          </p>
        </div>

        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="file-upload"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
        >
          Choose Files
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
          </div>
        </div>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((fileState, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getFileIcon(fileState.file.name)}</span>
                  {getStatusIcon(fileState.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {fileState.file.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {(fileState.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {fileState.error && (
                      <p className="text-xs text-red-600">{fileState.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {fileState.status === 'processing' && (
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileState.progress}%` }}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(fileState.file)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={fileState.status === 'processing'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-2" />
          <span className="text-sm text-blue-700">Processing files...</span>
        </div>
      )}
    </div>
  );
});