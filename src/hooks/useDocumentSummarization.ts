import { useState, useCallback } from 'react';
import { logger } from '../services/logger.service';
import { sdrAuthHeaders } from '../services/sdrClient';
import { supabase } from '../lib/supabase';
import { newOutcome, streamSse } from '../lib/streaming/streamClient';

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
  /** per-file progress while analysing */
  stages: Map<string, AnalyzeStage>;
  /** summary fields as the model writes them (streaming), cleared once the final summary lands */
  live: Map<string, LiveSummary>;
}

export type LiveSummary = Partial<Pick<DocumentSummary, 'summary' | 'keyPoints' | 'actionItems' | 'documentType' | 'sentiment' | 'confidence'>>;

export type AnalyzeStage = 'uploading' | 'analyzing';

/** Files go straight to Supabase Storage (no Netlify body limit); the bucket enforces the same 25 MB cap. */
export const MAX_ANALYZE_BYTES = 25 * 1024 * 1024;
const BUCKET = 'contact-documents';
const SUPPORTED = /\.(pdf|docx|txt|md|csv)$/i;

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
};

/** The bucket only allows specific mime types, so derive one from the extension when the browser gives none. */
function resolveMime(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? file.type;
}

function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(-120) || 'document';
}

export const useDocumentSummarization = () => {
  const [state, setState] = useState<State>({ isSummarizing: false, error: null, errors: new Map(), summaries: new Map(), stages: new Map(), live: new Map() });

  const setStage = (fileId: string, stage: AnalyzeStage | null) =>
    setState((prev) => {
      const stages = new Map(prev.stages);
      if (stage) stages.set(fileId, stage); else stages.delete(fileId);
      return { ...prev, stages };
    });

  const fail = (fileId: string, message: string) =>
    setState((prev) => {
      const stages = new Map(prev.stages);
      stages.delete(fileId);
      const live = new Map(prev.live);
      live.delete(fileId);
      return { ...prev, isSummarizing: false, error: message, errors: new Map(prev.errors).set(fileId, message), stages, live };
    });

  /**
   * Upload the file to the private `contact-documents` bucket, then call `document-analyze` with its storage path
   * (PDF -> OpenAI input_file via signed URL, DOCX/TXT extracted server-side; the object is deleted afterwards).
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Please sign in to analyse documents');
        const mimeType = resolveMime(file);
        const storagePath = `${session.user.id}/${crypto.randomUUID()}/${safeName(file.name)}`;

        setStage(fileId, 'uploading');
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: mimeType, upsert: false });
        if (uploadError) throw new Error(`Could not upload the file: ${uploadError.message}`);

        setStage(fileId, 'analyzing');
        const cleanupObject = () => supabase.storage.from(BUCKET).remove([storagePath]).catch(() => undefined);
        const fnUrl = '/.netlify/functions/document-analyze';
        const headers = await sdrAuthHeaders();
        const payload = { storagePath, filename: file.name, mimeType, context };
        let json: { data?: Record<string, any>; error?: string } = {};
        let serverError: string | null = null;
        try {
          // Live: partial summary fields arrive while the model writes them; the final `result` equals the JSON payload.
          const outcome = await streamSse(
            fnUrl,
            { headers, body: { ...payload, stream: true } },
            {
              onPartial: (p) => {
                if (!p || typeof p !== 'object') return;
                setState((prev) => ({ ...prev, live: new Map(prev.live).set(fileId, p as LiveSummary) }));
              },
            },
            newOutcome(),
            (m) => { serverError = m; return new Error(m); },
          );
          if (outcome.error) { serverError = outcome.error; throw new Error(outcome.error); }
          json = (outcome.result ?? {}) as typeof json;
          if (!json.data) throw new Error('Analysis stream ended without a result');
        } catch (e) {
          if (serverError) {
            // The server deletes after analysis, but early rejections (auth, type) leave the object; best-effort cleanup (RLS limits it to our own).
            await cleanupObject();
            throw new Error(serverError);
          }
          // Transport failure: fall back to the plain JSON request (same endpoint).
          const res = await fetch(fnUrl, { method: 'POST', headers, body: JSON.stringify(payload) }).catch(async (err) => {
            // The server deletes the object after analysis; if the request never reached it, clean up here.
            await cleanupObject();
            throw new Error(`Could not reach the analysis service${err instanceof Error ? `: ${err.message}` : ''}`);
          });
          json = await res.json().catch(() => ({}));
          if (!res.ok || !json?.data) {
            await cleanupObject();
            throw new Error(json?.error || `Document analysis failed (${res.status})`);
          }
        }
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
        setState((prev) => {
          const stages = new Map(prev.stages);
          stages.delete(fileId);
          const live = new Map(prev.live);
          live.delete(fileId);
          return { ...prev, isSummarizing: false, summaries: new Map(prev.summaries).set(fileId, summary), stages, live };
        });
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
    /** 'uploading' | 'analyzing' while a file is in flight, else null */
    /** summary fields written so far while analysing (streaming), else null */
    getLive: (fileId: string): LiveSummary | null => state.live.get(fileId) ?? null,
    getStage: (fileId: string): AnalyzeStage | null => state.stages.get(fileId) ?? null,
    clearError: () => setState((prev) => ({ ...prev, error: null, errors: new Map() })),
    reset: () => setState({ isSummarizing: false, error: null, errors: new Map(), summaries: new Map(), stages: new Map(), live: new Map() }),
  };
};
