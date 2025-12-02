import React, { useState, useCallback, memo } from 'react';
import { ModernButton } from '../ui/ModernButton';
import { AnalysisInput } from '../../types/productIntelligence';
import {
  Link,
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ProductIntelligenceInputProps {
  onSubmit: (input: AnalysisInput) => void;
  initialInput?: AnalysisInput;
}

export const ProductIntelligenceInput: React.FC<ProductIntelligenceInputProps> = memo(({
  onSubmit,
  initialInput = {}
}) => {
  const [input, setInput] = useState<AnalysisInput>(initialInput);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUrlChange = useCallback((url: string) => {
    setInput(prev => ({ ...prev, url: url.trim() || undefined }));
  }, []);

  const handleBusinessNameChange = useCallback((businessName: string) => {
    setInput(prev => ({ ...prev, businessName: businessName.trim() || undefined }));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain'
    ];

    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File type not supported: ${file.name}`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert(`File too large: ${file.name} (max 50MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setUploading(true);
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInput(prev => ({
        ...prev,
        documents: [...(prev.documents || []), ...validFiles]
      }));
      setUploading(false);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setInput(prev => ({
      ...prev,
      documents: prev.documents?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!input.url && !input.documents?.length) {
      alert('Please provide a URL or upload documents to analyze.');
      return;
    }

    onSubmit(input);
  }, [input, onSubmit]);

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (type.includes('word') || type.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <FileText className="w-4 h-4 text-orange-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileText className="w-4 h-4 text-green-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 space-y-8 bg-white">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your Analysis</h3>
        <p className="text-gray-700">
          Provide a business URL or upload documents to generate comprehensive sales intelligence and content.
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Link className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Web Analysis</h4>
            <p className="text-sm text-gray-600">Analyze a business website for comprehensive intelligence</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="url"
            placeholder="https://example.com"
            value={input.url || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
          />

          <input
            type="text"
            placeholder="Business name (optional)"
            value={input.businessName || ''}
            onChange={(e) => handleBusinessNameChange(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Document Upload */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Upload className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Document Analysis</h4>
            <p className="text-sm text-gray-600">Upload business documents for deeper analysis</p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors bg-white ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />

          <div className="space-y-4">
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600">Processing files...</p>
              </div>
            ) : (
              <>
                <Upload className={`w-12 h-12 mx-auto ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {dragActive ? 'Drop files here' : 'Drop files here or click to browse'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    PDF, Word, PowerPoint, Excel, Text files (max 50MB each)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* File List */}
        {input.documents && input.documents.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium text-gray-900">Uploaded Files ({input.documents.length})</h5>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {input.documents.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analysis Preview */}
      {(input.url || input.documents?.length) && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-blue-700 mt-0.5" />
            <div>
              <h5 className="font-medium text-blue-900">Ready for Analysis</h5>
              <ul className="text-sm text-blue-900 mt-1 space-y-1">
                {input.url && <li>• Web analysis: {input.url}</li>}
                {input.documents && input.documents.length > 0 && (
                  <li>• Document analysis: {input.documents.length} file(s)</li>
                )}
              </ul>
              <p className="text-xs text-blue-700 mt-2">
                This will generate business intelligence, sales content, and CRM integration automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-center pt-4">
        <ModernButton
          onClick={handleSubmit}
          disabled={!input.url && !input.documents?.length}
          className="px-8 py-3 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          🚀 Start AI Analysis
        </ModernButton>
      </div>
    </div>
  );
});