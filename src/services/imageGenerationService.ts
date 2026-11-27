/**
 * Client for the image generation Netlify functions (OpenAI Responses image_generation).
 * Primary path: one live SSE stream per variant (generate-image-stream, up to 4 in parallel) so previews
 * sharpen on screen. Automatic fallback when a stream fails: background jobs polled with backoff
 * (generate-image + generate-image-status), re-attaching to the job the stream already started when known.
 */
import { supabase } from '../lib/supabase';
import { newOutcome, streamSse } from '../lib/streaming/streamClient';

export type ImageSize = 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
export type ImageQuality = 'auto' | 'low' | 'medium' | 'high';

export type VariantStatus = 'pending' | 'preview' | 'done' | 'failed';

export interface VariantUpdate {
  index: number;
  status: VariantStatus;
  /** data URL when status === 'done' (final) or 'preview' (progressive, still sharpening) */
  image?: string;
  error?: string;
  /** stream label for 'pending' updates, e.g. "Generating image…" */
  label?: string;
}

export interface GenerateImageOptions {
  prompt: string;
  /** number of variants (1-6); the server starts at most 4 jobs per request, extra ones use extra requests */
  n?: number;
  size?: ImageSize;
  quality?: ImageQuality;
  fast?: boolean;
  /** base64 data URLs used as visual references (synchronous Images edit endpoint, one image per request) */
  referenceImages?: string[];
  signal?: AbortSignal;
  /** called whenever a variant changes state (pending at start, live previews, then done/failed) */
  onVariant?: (update: VariantUpdate) => void;
}

export interface GeneratedImagesResult {
  /** data URLs of the variants that succeeded, ready for <img src> or storage */
  images: string[];
  model: string;
  /** variants that failed (the call only throws when every variant failed) */
  failed: number;
}

const FN = '/.netlify/functions/generate-image';
const STREAM_FN = '/.netlify/functions/generate-image-stream';
const STATUS_FN = '/.netlify/functions/generate-image-status';
const MAX_WAIT_MS = 4 * 60 * 1000;
const FIRST_POLL_MS = 2500;
const MAX_POLL_MS = 8000;
const MAX_PER_REQUEST = 4;
const MAX_PARALLEL_STREAMS = 4;

/** Map an aspect ratio like "16:9" to the closest supported OpenAI image size. */
export function aspectToSize(aspect?: string): ImageSize {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect || '');
  if (!m) return '1024x1024';
  const ratio = parseFloat(m[1] ?? '') / parseFloat(m[2] ?? '');
  if (ratio > 1.2) return '1536x1024';
  if (ratio < 0.85) return '1024x1536';
  return '1024x1024';
}

type Json = Record<string, any>;

async function authedPost(url: string, payload: unknown, signal?: AbortSignal | undefined): Promise<Json> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to generate images');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
    ...(signal ? { signal } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Image generation failed (${res.status})`);
  return json;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const toDataUrl = (i: { b64_json: string; mime_type?: string }) => `data:${i.mime_type || 'image/png'};base64,${i.b64_json}`;

/**
 * Generate `n` variants. Text-to-image streams live per variant (previews via `onVariant` status 'preview'); on a stream failure
 * it falls back to polled background jobs (backoff 2.5s -> 8s, overall 4 minute cap). Each variant is reported as soon as it finishes. Rejects only when
 * every variant failed or the call was aborted.
 */
export async function generateImages(opts: GenerateImageOptions): Promise<GeneratedImagesResult> {
  const { signal, onVariant, n = 1, referenceImages, ...rest } = opts;
  const total = Math.max(1, Math.min(6, n));
  const results: Array<string | null> = new Array(total).fill(null);
  const errors: Array<string | undefined> = new Array(total).fill(undefined);
  let model = '';
  for (let i = 0; i < total; i++) onVariant?.({ index: i, status: 'pending' });

  const settle = (index: number, image?: string, error?: string) => {
    if (image) { results[index] = image; onVariant?.({ index, status: 'done', image }); }
    else { errors[index] = error || 'Generation failed'; onVariant?.({ index, status: 'failed', error: errors[index] }); }
  };
  const deadline = Date.now() + MAX_WAIT_MS;

  if (referenceImages?.length) {
    // Synchronous Images edit: one image per request keeps each call inside the function time limit.
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        const json = await authedPost(FN, { ...rest, n: 1, referenceImages }, signal);
        model = json['model'] || model;
        const first = (json['images'] || [])[0];
        settle(i, first ? toDataUrl(first) : undefined, first ? undefined : 'No image returned');
      } catch (e) {
        if (signal?.aborted) throw e;
        settle(i, undefined, e instanceof Error ? e.message : undefined);
      }
    }
  } else {
    // Live path: one SSE stream per variant, at most MAX_PARALLEL_STREAMS at a time.
    const slots = new Map<string, number>();
    const fallback: Array<{ index: number; responseId?: string | undefined }> = [];
    const mime = (rest as { outputFormat?: string }).outputFormat || 'png';

    const streamVariant = async (index: number) => {
      let responseId: string | undefined;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Please sign in to generate images');
        const outcome = await streamSse(
          STREAM_FN,
          { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: { ...rest, variant: index } },
          {
            signal,
            onStatus: (label, e) => {
              if (e.id) responseId = e.id;
              onVariant?.({ index, status: 'pending', label });
            },
            onImage: (e) => onVariant?.({ index, status: 'preview', image: `data:image/${mime};base64,${e.b64}` }),
          },
          newOutcome()
        );
        if (outcome.error) throw new Error(outcome.error);
        const r = outcome.result as { image?: { b64_json: string; mime_type?: string }; model?: string } | undefined;
        if (!r?.image?.b64_json) throw new Error('Stream ended without an image');
        model = r.model || model;
        settle(index, toDataUrl(r.image));
      } catch (e) {
        if (signal?.aborted) throw e;
        fallback.push({ index, responseId });
      }
    };
    const queue = Array.from({ length: total }, (_, i) => i);
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_STREAMS, total) }, async () => {
      for (let i = queue.shift(); i !== undefined; i = queue.shift()) await streamVariant(i);
    }));

    // Fallback: poll background jobs. Re-attach to a job the stream already started, else start new ones.
    const needStart: number[] = [];
    for (const f of fallback) {
      if (f.responseId) slots.set(f.responseId, f.index);
      else needStart.push(f.index);
    }
    for (let from = 0; from < needStart.length; from += MAX_PER_REQUEST) {
      const group = needStart.slice(from, from + MAX_PER_REQUEST);
      try {
        const json = await authedPost(FN, { ...rest, n: group.length }, signal);
        model = json['model'] || model;
        const jobs: Array<{ responseId: string }> = json['jobs'] || [];
        jobs.forEach((j, k) => { const slot = group[k]; if (slot !== undefined) slots.set(j.responseId, slot); });
        for (let k = jobs.length; k < group.length; k++) { const slot = group[k]; if (slot !== undefined) settle(slot, undefined, 'Could not start this variant'); }
      } catch (e) {
        if (signal?.aborted) throw e;
        for (const idx of group) settle(idx, undefined, e instanceof Error ? e.message : undefined);
      }
    }
    for (const idx of slots.values()) onVariant?.({ index: idx, status: 'pending', label: 'Finishing in the background…' });

    // Poll each pending id on its own (keeps every response far below Netlify's payload limit).
    let delay = FIRST_POLL_MS;
    const pending = new Set(slots.keys());
    while (pending.size && Date.now() < deadline) {
      await sleep(delay, signal);
      delay = Math.min(MAX_POLL_MS, Math.round(delay * 1.4));
      await Promise.all([...pending].map(async (id) => {
        try {
          const json = await authedPost(STATUS_FN, { responseIds: [id] }, signal);
          const job = (json['jobs'] || [])[0];
          if (!job || job.status === 'queued' || job.status === 'in_progress') return;
          pending.delete(id);
          const img = job.status === 'completed' && job.images?.[0];
          settle(slots.get(id)!, img ? toDataUrl(img) : undefined, img ? undefined : job.error);
        } catch (e) {
          if (signal?.aborted) throw e;
          // transient network/status error: keep polling until the overall cap
        }
      }));
    }
    for (const id of pending) settle(slots.get(id)!, undefined, 'Image generation timed out. Try again.');
  }

  const images = results.filter((r): r is string => !!r);
  const failed = total - images.length;
  if (!images.length) throw new Error(errors.find(Boolean) || 'No image returned. Try adjusting the prompt or seeds.');
  return { images, model, failed };
}
