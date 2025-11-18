import React, { useState, useCallback, memo } from 'react';
import { Globe, Upload, FileText, X, Plus, AlertCircle } from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { productIntelligenceService } from '../../services/productIntelligenceService';

interface ProductIntelligenceInputProps {
  onAnalysisStart: (input: { urls: string[], documents: File[], businessName?: string }) => void;
  isAnalyzing?: boolean;
}

export const ProductIntelligenceInput: React.FC<ProductIntelligenceInputProps> = memo(({
  onAnalysisStart,
  isAnalyzing = false
}) => {
  const [urls, setUrls] = useState<string[]>(['']);
  const [documents, setDocuments] = useState<File[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [inputMethod, setInputMethod] = useState<'url' | 'document' | 'both'>('url');
  const [errors, setErrors] = useState<string[]>([]);

  const addUrl = useCallback(() => {
    setUrls(prev => [...prev, '']);
  }, []);

  const removeUrl = useCallback((index: number) => {
    setUrls(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateUrl = useCallback((index: number, value: string) => {
    setUrls(prev => prev.map((url, i) => i === index ? value : url));
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    setDocuments(files);
    if (files.length > 0 && inputMethod === 'url') {
      setInputMethod('both');
    }
  }, [inputMethod]);

  const handleFileProcessed = useCallback((file: File, result: any) => {
    console.log('File processed:', file.name, result);
    // Could show preview or handle individual file results
  }, []);

  const validateInput = useCallback((): string[] => {
    const errors: string[] = [];

    if (inputMethod === 'url' || inputMethod === 'both') {
      const validUrls = urls.filter(url => url.trim() !== '');
      if (validUrls.length === 0) {
        errors.push('Please enter at least one URL');
      }

      // Validate URLs
      validUrls.forEach(url => {
        if (!productIntelligenceService.validateUrl(url)) {
          errors.push(`Invalid URL: ${url}`);
        }
      });
    }

    if (inputMethod === 'document' || inputMethod === 'both') {
      if (documents.length === 0) {
        errors.push('Please upload at least one document');
      }
    }

    return errors;
  }, [urls, documents, inputMethod]);

  const handleStartAnalysis = useCallback(() => {
    const validationErrors = validateInput();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    const validUrls = urls.filter(url => url.trim() !== '');

    onAnalysisStart({
      urls: validUrls,
      documents,
      businessName: businessName.trim() || undefined
    } as { urls: string[]; documents: File[]; businessName?: string });
  }, [urls, documents, businessName, validateInput, onAnalysisStart]);

  const hasValidInput = () => {
    if (inputMethod === 'url' || inputMethod === 'both') {
      const validUrls = urls.filter(url => url.trim() !== '' && productIntelligenceService.validateUrl(url));
      if (validUrls.length > 0) return true;
    }
    if (inputMethod === 'document' || inputMethod === 'both') {
      if (documents.length > 0) return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Input Method Selection */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Analysis Method:</label>
        <div className="flex space-x-3">
          {[
            { value: 'url', label: 'Web URLs', icon: Globe },
            { value: 'document', label: 'Documents', icon: FileText },
            { value: 'both', label: 'Both', icon: Plus }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setInputMethod(value as typeof inputMethod)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                inputMethod === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
              disabled={isAnalyzing}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Business Name Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Name (Optional)
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Enter company name for better analysis"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isAnalyzing}
        />
        <p className="text-xs text-gray-500 mt-1">
          Providing a business name helps generate more targeted content
        </p>
      </div>

      {/* URL Input Section */}
      {(inputMethod === 'url' || inputMethod === 'both') && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              Website URLs
            </label>
            <button
              onClick={addUrl}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              disabled={isAnalyzing}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add URL
            </button>
          </div>

          <div className="space-y-2">
            {urls.map((url, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isAnalyzing}
                />
                {urls.length > 1 && (
                  <button
                    onClick={() => removeUrl(index)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    disabled={isAnalyzing}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Upload Section */}
      {(inputMethod === 'document' || inputMethod === 'both') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            Document Upload
          </label>

          <DocumentUpload
            onFilesSelected={handleFilesSelected}
            onFileProcessed={handleFileProcessed}
            isProcessing={isAnalyzing}
          />
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Start Analysis Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleStartAnalysis}
          disabled={!hasValidInput() || isAnalyzing}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4" />
              <span>Start AI Analysis</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});