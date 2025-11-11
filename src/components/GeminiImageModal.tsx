import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ModernButton } from './ui/ModernButton';
import { GlassCard } from './ui/GlassCard';
import {
  buildPrompt,
  FEATURE_BENEFITS,
  FORMAT_SCAFFOLDS,
  type FeatureKey,
  type FormatKey,
  SMARTCRM_STYLE,
} from "../lib/promptTemplates";
import {
  addHistory,
  clearHistory,
  deleteHistory,
  loadHistory,
  updateHistory,
  type HistoryEntry,
} from "../lib/history";
import { imageStorageService, type SavedImage } from "../services/imageStorage.service";
import { SavedImagesGallery } from "./SavedImagesGallery";
import {
  X,
  Wand2,
  Sparkles,
  Download,
  Upload,
  Image as ImageIcon,
  Settings,
  Palette,
  FileText,
  Smartphone,
  Monitor,
  Shirt,
  History,
  Trash2,
  RotateCcw,
  Copy,
  Heart,
  Edit,
  Loader2,
  Users,
  MessageSquare,
  Share2,
  Zap
} from 'lucide-react';

/** --- CONFIG --- */
const MODEL = "gemini-2.5-flash-image-preview";

interface StreamingUpdate {
  type: 'progress' | 'image' | 'complete' | 'error';
  progress?: number;
  imageData?: string;
  variantIndex?: number;
  error?: string;
}

interface CollaborativeSession {
  id: string;
  participants: string[];
  currentPrompt: string;
  lastActivity: number;
  sharedImages: string[];
}

/** Utility: read a File to data URL */
async function fileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:${file.type || "image/png"};base64,${base64}`;
}

/** Utility: convert dataURL -> inlineData parts */
async function dataUrlToInlineData(dataUrl: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ab = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
  return {
    inlineData: {
      mimeType: blob.type || "image/png",
      data: base64,
    },
  };
}

/** Utility: trigger download of data URL as file */
function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

type Props = {
  open: boolean;
  onClose: () => void;
  contactData?: any; // Optional contact context
};

export default function GeminiImageModal({ open, onClose, contactData }: Props) {
  const [feature, setFeature] = useState<FeatureKey>("Enhanced Contacts");
  const [format, setFormat] = useState<FormatKey>("Poster");
  const [benefit, setBenefit] = useState(FEATURE_BENEFITS["Enhanced Contacts"]);
  const [aspect, setAspect] = useState(FORMAT_SCAFFOLDS["Poster"].aspect);
  const [promptText, setPromptText] = useState(
    buildPrompt("Enhanced Contacts", "Poster").text
  );

  const [seeds, setSeeds] = useState<string[]>([]);
  const [variants, setVariants] = useState(2);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [savingImage, setSavingImage] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  // Streaming and collaborative features
  const [isStreamingMode, setIsStreamingMode] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set());
  const [collaborativeSession, setCollaborativeSession] = useState<CollaborativeSession | null>(null);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  const [sessionComments, setSessionComments] = useState<Array<{id: string, user: string, comment: string, timestamp: number}>>([]);

  const dropRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamingControllerRef = useRef<AbortController | null>(null);

  const ai = useMemo(() => new GoogleGenerativeAI(import.meta.env['VITE_GEMINI_API_KEY'] || ''), []);

  // init / reset
  useEffect(() => {
    if (open) {
      setHistory(loadHistory());
      loadSavedImages(); // Load user's saved images
      // paste handler (images from clipboard)
      const onPaste = async (e: ClipboardEvent) => {
        if (!open) return;
        const items = e.clipboardData?.items || [];
        const files = Array.from(items)
          .filter((it) => it.kind === "file")
          .map((it) => it.getAsFile())
          .filter(Boolean) as File[];
        if (!files.length) return;
        const urls = await Promise.all(files.map((f) => fileToDataUrl(f)));
        setSeeds((prev) => [...prev, ...urls]);
      };
      document.addEventListener("paste", onPaste as any);
      return () => document.removeEventListener("paste", onPaste as any);
    } else {
      setImages([]);
      setError(null);
      setSeeds([]);
      setSelectedHistoryId(null);
      setSavedImages([]);
      setSavingImage(null);
    }
  }, [open]);

  // build prompt from template (feature/format/benefit)
  const applyTemplate = useCallback(() => {
    const built = buildPrompt(feature, format, benefit);
    setAspect(built.aspect);
    setPromptText(built.text);
  }, [feature, format, benefit]);

  useEffect(() => {
    applyTemplate();
  }, [feature, format]); // eslint-disable-line

  // drag & drop zone
  useEffect(() => {
    if (!dropRef.current) return;
    const el = dropRef.current;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      el.classList.add("ring-2", "ring-teal-500");
    };
    const onDragLeave = () => el.classList.remove("ring-2", "ring-teal-500");
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      el.classList.remove("ring-2", "ring-teal-500");
      const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
        f.type.startsWith("image/")
      );
      if (!files.length) return;
      const urls = await Promise.all(files.map(fileToDataUrl));
      setSeeds((prev) => [...prev, ...urls]);
    };

    el.addEventListener("dragover", onDragOver as any);
    el.addEventListener("dragleave", onDragLeave as any);
    el.addEventListener("drop", onDrop as any);
    return () => {
      el.removeEventListener("dragover", onDragOver as any);
      el.removeEventListener("dragleave", onDragLeave as any);
      el.removeEventListener("drop", onDrop as any);
    };
  }, [dropRef]);

  // file picker
  async function onChooseFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const urls = await Promise.all(files.map(fileToDataUrl));
    setSeeds((prev) => [...prev, ...urls]);
    e.currentTarget.value = "";
  }

  // Enhanced streaming generation with collaborative features
  async function generate(runFromHistoryId?: string, onProgress?: (update: StreamingUpdate) => void) {
    setLoading(true);
    setError(null);
    setImages([]);
    setStreamingProgress(0);

    // Initialize streaming controller
    streamingControllerRef.current = new AbortController();

    // capture snapshot for history
    const entry: HistoryEntry = {
      id: runFromHistoryId || Math.random().toString(36).slice(2) + Date.now().toString(36),
      ts: Date.now(),
      feature,
      format,
      aspect,
      promptText,
      seeds: [...seeds],
      variants,
      thumbs: [],
    };
    if (!runFromHistoryId) {
      setHistory(addHistory(entry));
    }

    // Update collaborative session if active
    if (collaborativeSession) {
      setCollaborativeSession(prev => prev ? {
        ...prev,
        currentPrompt: promptText,
        lastActivity: Date.now()
      } : null);
    }

    try {
      const contents: any[] = [{ text: promptText }];
      if (seeds.length) {
        const inlines = await Promise.all(seeds.map(dataUrlToInlineData));
        contents.push(...inlines);
      }

      const outs: string[] = [];
      const model = ai.getGenerativeModel({ model: MODEL });

      if (isStreamingMode) {
        // Streaming generation with progress updates
        const streamId = `generation-${Date.now()}`;
        setActiveStreams(prev => new Set([...prev, streamId]));

        for (let i = 0; i < Math.max(1, Math.min(6, variants)); i++) {
          if (streamingControllerRef.current?.signal.aborted) break;

          const progress = ((i + 1) / variants) * 100;
          setStreamingProgress(progress);
          onProgress?.({ type: 'progress', progress });

          try {
            const res = await model.generateContent(contents);
            const parts = res?.response?.candidates?.[0]?.content?.parts || [];

            for (const p of parts) {
              if (p?.inlineData?.data) {
                const mime = p.inlineData.mimeType || "image/png";
                const imageData = `data:${mime};base64,${p.inlineData.data}`;
                outs.push(imageData);

                // Stream individual image completion
                onProgress?.({
                  type: 'image',
                  imageData,
                  variantIndex: i
                });
              }
            }
          } catch (variantError) {
            console.warn(`Variant ${i + 1} failed:`, variantError);
            // Continue with other variants
          }
        }

        setActiveStreams(prev => {
          const newSet = new Set(prev);
          newSet.delete(streamId);
          return newSet;
        });

      } else {
        // Regular batch generation
        for (let i = 0; i < Math.max(1, Math.min(6, variants)); i++) {
          const res = await model.generateContent(contents);
          const parts = res?.response?.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p?.inlineData?.data) {
              const mime = p.inlineData.mimeType || "image/png";
              outs.push(`data:${mime};base64,${p.inlineData.data}`);
            }
          }
        }
      }

      if (!outs.length) throw new Error("No image returned. Try adjusting the prompt or seeds.");

      setImages(outs);
      setHistory(updateHistory(entry.id, { thumbs: outs.slice(0, 3) })); // store first 3 as thumbs
      setSelectedHistoryId(entry.id);

      // Update collaborative session with new images
      if (collaborativeSession) {
        setCollaborativeSession(prev => prev ? {
          ...prev,
          sharedImages: [...prev.sharedImages, ...outs],
          lastActivity: Date.now()
        } : null);
      }

      onProgress?.({ type: 'complete' });

    } catch (err: any) {
      const errorMessage = err?.message || "Generation failed";
      setError(errorMessage);
      onProgress?.({ type: 'error', error: errorMessage });
    } finally {
      setLoading(false);
      setStreamingProgress(0);
      streamingControllerRef.current = null;
    }
  }

  // re-run a history item
  function loadHistoryEntry(h: HistoryEntry, rerun = false) {
    setFeature((h.feature as FeatureKey) || "Enhanced Contacts");
    setFormat((h.format as FormatKey) || "Poster");
    setAspect((h.aspect as any) || "1:1");
    setPromptText(h.promptText);
    setSeeds(h.seeds || []);
    setVariants(h.variants || 1);
    setSelectedHistoryId(h.id);
    if (rerun) generate(h.id);
  }

  function clearSeeds() {
    setSeeds([]);
  }

  // Save image to Supabase storage
  async function saveImageToApp(imageDataUrl: string, variantIndex: number) {
    setSavingImage(imageDataUrl);

    try {
      const filename = `smartcrm-${feature}-${format}-${Date.now()}-v${variantIndex + 1}.png`;

      const metadata = {
        prompt: promptText,
        feature,
        format,
        aspect_ratio: aspect,
        seeds_used: seeds.length,
        variants_generated: variants,
        gemini_model: MODEL,
        tags: [`${feature}`, `${format}`, 'generated']
      };

      const result = await imageStorageService.saveGeneratedImage(
        imageDataUrl,
        filename,
        metadata
      );

      if (result.success && result.image) {
        setSavedImages(prev => [result.image!, ...prev]);
        alert(`Image saved successfully! You can find it in your saved images.`);
      } else {
        alert(`Failed to save image: ${result.error}`);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save image. Please try again.');
    } finally {
      setSavingImage(null);
    }
  }

  // Load user's saved images
  async function loadSavedImages() {
    try {
      const images = await imageStorageService.getUserImages();
      setSavedImages(images);
    } catch (error) {
      console.error('Failed to load saved images:', error);
    }
  }

  // Collaborative features
  const startCollaborativeSession = useCallback(() => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setCollaborativeSession({
      id: sessionId,
      participants: ['You'],
      currentPrompt: promptText,
      lastActivity: Date.now(),
      sharedImages: []
    });
    setShowCollaborationPanel(true);
  }, [promptText]);

  const joinCollaborativeSession = useCallback((sessionId: string) => {
    // In a real implementation, this would connect to a WebSocket or real-time service
    setCollaborativeSession({
      id: sessionId,
      participants: ['You', 'Collaborator 1'],
      currentPrompt: promptText,
      lastActivity: Date.now(),
      sharedImages: []
    });
    setShowCollaborationPanel(true);
  }, [promptText]);

  const addSessionComment = useCallback((comment: string) => {
    const newComment = {
      id: `comment-${Date.now()}`,
      user: 'You',
      comment,
      timestamp: Date.now()
    };
    setSessionComments(prev => [...prev, newComment]);
  }, []);

  const stopStreaming = useCallback(() => {
    streamingControllerRef.current?.abort();
    setActiveStreams(new Set());
    setStreamingProgress(0);
  }, []);

  if (!open) return null;

  return (
    <div
      aria-modal
      role="dialog"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="mx-auto my-6 grid w-full max-w-7xl grid-cols-1 gap-4 p-4 md:grid-cols-[320px_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* History Panel */}
        <aside className="rounded-2xl bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">History</h3>
            <button
              onClick={() => setHistory(clearHistory())}
              className="rounded-md bg-gray-100 px-2 py-1 text-xs"
            >
              Clear
            </button>
          </div>
          <div className="grid gap-2 max-h-[70vh] overflow-auto pr-1">
            {history.length === 0 && (
              <p className="text-xs text-gray-500">No runs yet — generate to see history here.</p>
            )}
            {history.map((h) => (
              <div
                key={h.id}
                className={`rounded-lg border p-2 ${selectedHistoryId === h.id ? "border-teal-500" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">
                      {h.feature} • {h.format}
                    </div>
                    <div className="truncate text-[11px] text-gray-500">
                      {new Date(h.ts).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => setHistory(deleteHistory(h.id))}
                    className="rounded bg-gray-100 px-2 py-1 text-[11px]"
                  >
                    Del
                  </button>
                </div>
                {h.thumbs && h.thumbs.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {h.thumbs.slice(0, 3).map((t, i) => (
                      <img key={i} src={t} className="h-12 w-12 rounded object-cover border" />
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => loadHistoryEntry(h, false)}
                    className="rounded bg-gray-900 px-2 py-1 text-[11px] text-white"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => loadHistoryEntry(h, true)}
                    className="rounded bg-teal-600 px-2 py-1 text-[11px] text-white"
                  >
                    Re-Run
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Panel */}
        <main className="rounded-2xl bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold">Gemini (Nano Banana) Image Workspace</h2>
            <div className="flex items-center gap-2">
              {/* Streaming Mode Toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={isStreamingMode}
                    onChange={(e) => setIsStreamingMode(e.target.checked)}
                    className="rounded"
                  />
                  <Zap className="w-4 h-4" />
                  Streaming
                </label>
              </div>

              {/* Collaboration Controls */}
              {!collaborativeSession ? (
                <button
                  onClick={startCollaborativeSession}
                  className="rounded-md bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700 flex items-center gap-1"
                >
                  <Users className="w-4 h-4" />
                  Collaborate
                </button>
              ) : (
                <button
                  onClick={() => setShowCollaborationPanel(!showCollaborationPanel)}
                  className="rounded-md bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700 flex items-center gap-1"
                >
                  <Users className="w-4 h-4" />
                  Session ({collaborativeSession.participants.length})
                </button>
              )}

              <button
                onClick={() => setShowGallery(true)}
                className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              >
                View Saved ({savedImages.length})
              </button>
              <button onClick={onClose} className="rounded-md bg-gray-100 px-3 py-1 text-sm">
                Close
              </button>
            </div>
          </div>

          {/* Templates row */}
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="grid gap-1">
              <span className="text-xs font-medium">Feature</span>
              <select
                value={feature}
                onChange={(e) => setFeature(e.target.value as FeatureKey)}
                className="rounded-lg border p-2"
              >
                {Object.keys(FEATURE_BENEFITS).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium">Format</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as FormatKey)}
                className="rounded-lg border p-2"
              >
                {Object.keys(FORMAT_SCAFFOLDS).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium">Aspect Ratio</span>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value as any)}
                className="rounded-lg border p-2"
              >
                <option>1:1</option>
                <option>4:5</option>
                <option>3:4</option>
                <option>16:9</option>
                <option>9:16</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium">Variants (1–6)</span>
              <input
                type="number"
                min={1}
                max={6}
                value={variants}
                onChange={(e) => setVariants(parseInt(e.target.value || "1", 10))}
                className="rounded-lg border p-2"
              />
            </label>
          </div>

          <label className="mt-3 grid gap-1">
            <span className="text-xs font-medium">Benefit (tagline)</span>
            <input
              value={benefit}
              onChange={(e) => setBenefit(e.target.value)}
              className="rounded-lg border p-2"
              placeholder="Edit the benefit line"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={applyTemplate}
              className="rounded-lg bg-black px-3 py-2 text-sm text-white"
            >
              Apply Template
            </button>
            <button
              onClick={() =>
                setPromptText(
                  [
                    SMARTCRM_STYLE.trim(),
                    "Add stronger glow and more legible text placement. Keep composition clean.",
                    promptText,
                  ].join("\n")
                )
              }
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Boost Brand Glow
            </button>
            <button
              onClick={() =>
                setPromptText(promptText + "\nMake it more photorealistic, premium lighting, crisp edges.")
              }
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm"
            >
              More Photoreal
            </button>
            <button
              onClick={() =>
                setPromptText(promptText + "\nAvoid: busy backgrounds, tiny unreadable text, harsh artifacts.")
              }
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm"
            >
              Stronger Negatives
            </button>
          </div>

          <label className="mt-3 grid gap-1">
            <span className="text-xs font-medium">Prompt</span>
            <textarea
              rows={6}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full rounded-lg border p-2"
            />
            <span className="text-[11px] text-gray-500">
              Tip: keep the aspect ratio in the text for consistency (e.g., "Render in {aspect}")
            </span>
          </label>

          {/* Drag & Drop / seed zone */}
          <div
            ref={dropRef}
            className="mt-4 rounded-xl border-2 border-dashed p-4 text-center"
          >
            <p className="text-sm font-medium">Drag & drop images here (or paste) to use as seeds</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onChooseFiles}
              className="mx-auto mt-2 block"
            />
            {seeds.length > 0 && (
              <>
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {seeds.map((src, i) => (
                    <div key={i} className="relative">
                      <img
                        src={src}
                        alt={`seed-${i}`}
                        className="h-20 w-20 rounded-lg border object-cover"
                      />
                      <button
                        onClick={() => setSeeds((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -right-1 -top-1 rounded-full bg-black/70 px-1 text-[10px] text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={clearSeeds} className="mt-2 rounded bg-gray-100 px-2 py-1 text-xs">
                  Clear seeds
                </button>
              </>
            )}
          </div>

          {/* Actions */}
           <div className="mt-4 space-y-3">
             <div className="flex items-center gap-2">
               <button
                 onClick={() => generate(undefined)}
                 disabled={loading}
                 className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-50 flex items-center gap-2"
               >
                 {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                 {loading ? (isStreamingMode ? "Streaming…" : "Generating…") : "Generate"}
               </button>

               {loading && activeStreams.size > 0 && (
                 <button
                   onClick={stopStreaming}
                   className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                 >
                   Stop
                 </button>
               )}

               {!!images.length && (
                 <>
                   <button
                     onClick={() =>
                       images.forEach((src, i) => downloadDataUrl(src, `gemini-image-${i + 1}.png`))
                   }
                     className="rounded-lg bg-gray-900 px-4 py-2 text-white"
                   >
                     Download All
                   </button>
                   <span className="text-xs text-gray-500">{images.length} variants</span>
                 </>
               )}
             </div>

             {/* Streaming Progress */}
             {isStreamingMode && (loading || streamingProgress > 0) && (
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-sm font-medium text-blue-800">Generation Progress</span>
                   <span className="text-sm text-blue-600">{Math.round(streamingProgress)}%</span>
                 </div>
                 <div className="w-full bg-blue-200 rounded-full h-2">
                   <div
                     className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     style={{ width: `${streamingProgress}%` }}
                   ></div>
                 </div>
                 {activeStreams.size > 0 && (
                   <p className="text-xs text-blue-600 mt-1">
                     Active streams: {activeStreams.size}
                   </p>
                 )}
               </div>
             )}

             {error && <span className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 block">{error}</span>}
           </div>

          {/* Results */}
          {!!images.length && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((src, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-gray-50 flex flex-col"
                >
                  <img src={src} alt={`out-${i}`} className="w-full object-contain" />
                  <div className="flex items-center justify-between p-2 gap-2">
                    <span className="text-xs text-gray-600">Variant {i + 1}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => downloadDataUrl(src, `gemini-image-${i + 1}.png`)}
                        className="rounded bg-gray-900 text-white text-xs px-2 py-1 hover:bg-gray-800"
                        title="Download to device"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => saveImageToApp(src, i)}
                        disabled={savingImage === src}
                        className="rounded bg-teal-600 text-white text-xs px-2 py-1 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Save to SmartCRM"
                      >
                        {savingImage === src ? 'Saving...' : 'Save to App'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saved Images Section */}
          {!!savedImages.length && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3">Your Saved Images</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {savedImages.slice(0, 8).map((savedImg) => (
                  <div
                    key={savedImg.id}
                    className="rounded-lg border bg-white overflow-hidden"
                  >
                    <img
                      src={savedImg.thumbnail_url || savedImg.url}
                      alt={savedImg.original_filename}
                      className="w-full h-20 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{savedImg.original_filename}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(savedImg.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {savedImages.length > 8 && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing 8 of {savedImages.length} saved images
                </p>
              )}
            </div>
          )}
        </main>

        {/* Collaboration Panel */}
        {showCollaborationPanel && collaborativeSession && (
          <aside className="rounded-2xl bg-purple-50 p-4 shadow-xl border border-purple-200">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Collaborative Session
              </h3>
              <button
                onClick={() => setShowCollaborationPanel(false)}
                className="rounded-md bg-gray-100 px-2 py-1 text-xs"
              >
                Hide
              </button>
            </div>

            <div className="space-y-3">
              {/* Session Info */}
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-xs text-gray-600 mb-1">Session ID</p>
                <p className="text-xs font-mono bg-gray-100 p-1 rounded">{collaborativeSession.id.slice(0, 12)}...</p>
                <p className="text-xs text-gray-600 mt-2">
                  Participants: {collaborativeSession.participants.join(', ')}
                </p>
              </div>

              {/* Shared Images */}
              {collaborativeSession.sharedImages.length > 0 && (
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs font-medium mb-2">Shared Images ({collaborativeSession.sharedImages.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {collaborativeSession.sharedImages.slice(0, 4).map((img, i) => (
                      <img key={i} src={img} className="w-full h-16 object-cover rounded border" />
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-xs font-medium mb-2">Comments</p>
                <div className="space-y-2 max-h-32 overflow-auto">
                  {sessionComments.map(comment => (
                    <div key={comment.id} className="text-xs bg-gray-50 p-2 rounded">
                      <span className="font-medium">{comment.user}:</span> {comment.comment}
                      <div className="text-gray-500 mt-1">
                        {new Date(comment.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 text-xs border rounded px-2 py-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        addSessionComment(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input.value.trim()) {
                        addSessionComment(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="bg-purple-600 text-white px-2 py-1 rounded text-xs"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Share Session */}
              <button
                onClick={() => navigator.clipboard.writeText(collaborativeSession.id)}
                className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Copy Session Link
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Saved Images Gallery */}
      <SavedImagesGallery
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </div>
  );
}