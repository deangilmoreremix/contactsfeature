import { useState, useCallback } from 'react';
import { logger } from '../services/logger.service';
import { sdrAuthHeaders } from '../services/sdrClient';

export interface DocumentSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  documentType: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  model: string;
  /** null for PDFs (text is read by the model, not counted locally). */
  wordCount: number | null;
  truncated: boolean;
  processingTime: number;
}

interface State {
  isSummarizing: boolean;
  error: string | null;
  errors: Map<string, string>;
  summaries: Map<string, DocumentSummary>;
}

/** Netlify rejects request bodies above ~6 MB; base64 adds a third, so keep raw files under this. */
export const MAX_ANALYZE_BYTES = 4.5 * 1024 * 1024;
const SUPPORTED = /\.(pdf|docx|txt|md|csv)$/i;

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

export const useDocumentSummarization = () => {
  const [state, setState] = useState<State>({ isSummarizing: false, error: null, errors: new Map(), summaries: new Map() });

  const fail = (fileId: string, message: string) =>
    setState((prev) => ({ ...prev, isSummarizing: false, error: message, errors: new Map(prev.errors).set(fileId, message) }));

  /**
   * Send the real file to the `document-analyze` function (PDF -> OpenAI input_file, DOCX/TXT extracted server-side).
   * Throws on failure after recording the error for `fileId`; it never fabricates a summary.
   */
  const processAndSummarizeFile = useCallback(
    async (file: File, fileId: string, context?: { contactName?: string; companyName?: string }): Promise<DocumentSummary> => {
      const startTime = Date.now();
      setState((prev) => {
        const errors = new Map(prev.errors);
        errors.delete(fileId);
        return { ...prev, isSummarizing: true, error: null, errors };
      });
      try {
        if (!SUPPORTED.test(file.name)) throw new Error('Unsupported file type. Use PDF, DOCX or plain text.');
        if (file.size === 0) throw new Error('The file is empty');
        if (file.size > MAX_ANALYZE_BYTES) {
          throw new Error(`File is too large to analyse (limit ${(MAX_ANALYZE_BYTES / 1024 / 1024).toFixed(1)} MB).`);
        }
        const dataBase64 = await fileToBase64(file);
        const res = await fetch('/.netlify/functions/document-analyze', {
          method: 'POST',
          headers: await sdrAuthHeaders(),
          body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataBase64, context }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.data) throw new Error(json?.error || `Document analysis failed (${res.status})`);
        const d = json.data;
        const summary: DocumentSummary = {
          summary: d.summary,
          keyPoints: d.keyPoints ?? [],
          actionItems: d.actionItems ?? [],
          documentType: d.documentType ?? 'other',
          sentiment: d.sentiment ?? 'neutral',
          confidence: d.confidence ?? 0,
          model: d.model ?? 'openai',
          wordCount: d.wordCount ?? null,
          truncated: !!d.truncated,
          processingTime: Date.now() - startTime,
        };
        setState((prev) => ({ ...prev, isSummarizing: false, summaries: new Map(prev.summaries).set(fileId, summary) }));
        logger.info('Document analysed', { fileId, fileName: file.name, extraction: d.extraction });
        return summary;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to analyse document';
        logger.error('Document analysis failed', error as Error, { fileId, fileName: file.name });
        fail(fileId, message);
        throw error instanceof Error ? error : new Error(message);
      }
    },
    [],
  );

  /** Download an already-stored file by URL and analyse it. */
  const processAndSummarizeUrl = useCallback(
    async (url: string, fileName: string, mimeType: string, fileId: string, context?: { contactName?: string; companyName?: string }) => {
      let blob: Blob;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Could not download the file (${res.status})`);
        blob = await res.blob();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not download the file';
        fail(fileId, message);
        throw e instanceof Error ? e : new Error(message);
      }
      return processAndSummarizeFile(new File([blob], fileName, { type: mimeType || blob.type }), fileId, context);
    },
    [processAndSummarizeFile],
  );

  return {
    isSummarizing: state.isSummarizing,
    error: state.error,
    summaries: state.summaries,
    processAndSummarizeFile,
    processAndSummarizeUrl,
    getSummary: (fileId: string) => state.summaries.get(fileId),
    getError: (fileId: string) => state.errors.get(fileId) ?? null,
    clearError: () => setState((prev) => ({ ...prev, error: null, errors: new Map() })),
    reset: () => setState({ isSummarizing: false, error: null, errors: new Map(), summaries: new Map() }),
  };
};
