import { useState, useCallback } from 'react';
import { logger } from '../services/logger.service';

interface DocumentSummary {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  model: string;
  wordCount: number;
  processingTime: number;
}

interface DocumentSummarizationState {
  isSummarizing: boolean;
  error: string | null;
  summaries: Map<string, DocumentSummary>;
}

export const useDocumentSummarization = () => {
  const [state, setState] = useState<DocumentSummarizationState>({
    isSummarizing: false,
    error: null,
    summaries: new Map()
  });

  // Extract text from different file types
  const extractTextFromFile = useCallback(async (file: File): Promise<string> => {
    const fileType = file.type;

    if (fileType === 'text/plain') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      });
    }

    // For PDF files, we'll use a simple text extraction approach
    // In a real implementation, you'd use a proper PDF parsing library
    if (fileType === 'application/pdf') {
      // This is a placeholder - in production, use pdf-parse or similar
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Mock PDF text extraction - replace with actual PDF parsing
          resolve(`[PDF Content Extracted from ${file.name}]\n\nThis is mock extracted text from the PDF file. In a real implementation, this would contain the actual text content extracted from the PDF using a proper PDF parsing library like pdf-parse or PDF.js.`);
        };
        reader.readAsArrayBuffer(file);
      });
    }

    // For DOCX files
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // This is a placeholder - in production, use mammoth.js or similar
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Mock DOCX text extraction
          resolve(`[DOCX Content Extracted from ${file.name}]\n\nThis is mock extracted text from the Word document. In a real implementation, this would contain the actual text content extracted from the DOCX file using a proper document parsing library like mammoth.js.`);
        };
        reader.readAsArrayBuffer(file);
      });
    }

    // For images, we'd use OCR in production
    if (fileType.startsWith('image/')) {
      return `[Image OCR from ${file.name}]\n\nThis is mock OCR text extracted from the image. In a real implementation, this would use Tesseract.js or a cloud OCR service to extract text from images.`;
    }

    throw new Error(`Unsupported file type: ${fileType}`);
  }, []);

  // Summarize document using GPT-4o-mini (cheapest model)
  const summarizeDocument = useCallback(async (
    fileId: string,
    fileName: string,
    text: string,
    context?: { contactName?: string; companyName?: string }
  ): Promise<DocumentSummary> => {
    setState(prev => ({ ...prev, isSummarizing: true, error: null }));

    const startTime = Date.now();

    try {
      // Get Supabase URL and key from environment
      const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL || '';
      const supabaseKey = (import.meta.env as any).VITE_SUPABASE_ANON_KEY || '';

      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase environment variables not defined, using fallback mode');

        // Create fallback summary
        const fallbackSummary = createFallbackSummary(text, fileName, context);
        const processingTime = Date.now() - startTime;

        const summary: DocumentSummary = {
          ...fallbackSummary,
          processingTime,
          model: 'fallback-model'
        };

        setState(prev => ({
          ...prev,
          isSummarizing: false,
          summaries: new Map(prev.summaries).set(fileId, summary)
        }));

        return summary;
      }

      // Truncate text if too long (GPT-4o-mini has token limits)
      const maxLength = 12000; // Conservative limit for token safety
      const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

      // Call the Supabase Edge Function with GPT-4o-mini
      const response = await fetch(`${supabaseUrl}/functions/v1/document-summarizer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          fileName,
          text: truncatedText,
          context,
          model: 'gpt-4o-mini' // Cheapest GPT model
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to summarize document: ${errorText}`);
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      const summary: DocumentSummary = {
        summary: result.summary || 'Summary not available',
        keyPoints: result.keyPoints || [],
        sentiment: result.sentiment || 'neutral',
        confidence: result.confidence || 75,
        model: result.model || 'gpt-4o-mini',
        wordCount: text.split(/\s+/).length,
        processingTime
      };

      setState(prev => ({
        ...prev,
        isSummarizing: false,
        summaries: new Map(prev.summaries).set(fileId, summary)
      }));

      logger.info('Document summarized successfully', {
        fileId,
        fileName,
        model: summary.model,
        processingTime
      });

      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to summarize document';
      const processingTime = Date.now() - startTime;

      setState(prev => ({
        ...prev,
        isSummarizing: false,
        error: errorMessage
      }));

      logger.error('Document summarization failed', error as Error, { fileId, fileName });

      // Return fallback summary
      const fallbackSummary = createFallbackSummary(text, fileName, context);
      const summary: DocumentSummary = {
        ...fallbackSummary,
        processingTime,
        model: 'fallback-model'
      };

      return summary;
    }
  }, []);

  // Process and summarize a file
  const processAndSummarizeFile = useCallback(async (
    file: File,
    fileId: string,
    context?: { contactName?: string; companyName?: string }
  ): Promise<DocumentSummary> => {
    try {
      // Extract text from file
      const text = await extractTextFromFile(file);

      // Summarize the extracted text
      return await summarizeDocument(fileId, file.name, text, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';

      setState(prev => ({ ...prev, error: errorMessage }));

      // Return a basic fallback summary
      return {
        summary: `Unable to process file: ${errorMessage}`,
        keyPoints: [],
        sentiment: 'neutral',
        confidence: 0,
        model: 'error',
        wordCount: 0,
        processingTime: 0
      };
    }
  }, [extractTextFromFile, summarizeDocument]);

  return {
    // State
    isSummarizing: state.isSummarizing,
    error: state.error,
    summaries: state.summaries,

    // Methods
    summarizeDocument,
    processAndSummarizeFile,
    extractTextFromFile,

    // Get summary for a specific file
    getSummary: (fileId: string) => state.summaries.get(fileId),

    // Clear error
    clearError: () => setState(prev => ({ ...prev, error: null })),

    // Reset state
    reset: () => setState({
      isSummarizing: false,
      error: null,
      summaries: new Map()
    })
  };
};

// Helper function to create fallback summaries
function createFallbackSummary(
  text: string,
  fileName: string,
  context?: { contactName?: string; companyName?: string }
): Omit<DocumentSummary, 'processingTime' | 'model'> {
  const wordCount = text.split(/\s+/).length;

  // Simple sentiment analysis based on keywords
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'outstanding'];
  const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'horrible', 'disappointing', 'unsatisfactory'];

  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (positiveCount > negativeCount) sentiment = 'positive';
  if (negativeCount > positiveCount) sentiment = 'negative';

  // Generate basic summary
  let summary = `Document "${fileName}" contains ${wordCount} words. `;

  if (context?.contactName) {
    summary += `This document appears to be related to ${context.contactName}`;
    if (context.companyName) {
      summary += ` from ${context.companyName}`;
    }
    summary += '. ';
  }

  summary += `The content appears to have a ${sentiment} sentiment. `;

  if (wordCount > 500) {
    summary += 'This is a substantial document that may contain detailed information. ';
  } else if (wordCount > 100) {
    summary += 'This is a moderately sized document. ';
  } else {
    summary += 'This is a brief document. ';
  }

  // Generate basic key points
  const keyPoints = [
    `Document type: ${fileName.split('.').pop()?.toUpperCase() || 'Unknown'}`,
    `Word count: ${wordCount}`,
    `Sentiment: ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}`
  ];

  if (context?.companyName) {
    keyPoints.push(`Related company: ${context.companyName}`);
  }

  return {
    summary,
    keyPoints,
    sentiment,
    confidence: 60,
    wordCount
  };
}