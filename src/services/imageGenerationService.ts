/**
 * Client for the generate-image Netlify function (OpenAI Images). Sends the Supabase session token.
 */
import { supabase } from '../lib/supabase';

export type ImageSize = 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
export type ImageQuality = 'auto' | 'low' | 'medium' | 'high';

export interface GenerateImageOptions {
  prompt: string;
  n?: number;
  size?: ImageSize;
  quality?: ImageQuality;
  fast?: boolean;
  /** base64 data URLs used as visual references (routes to the Images edit endpoint) */
  referenceImages?: string[];
  signal?: AbortSignal;
}

export interface GeneratedImagesResult {
  /** data URLs, ready for <img src> or storage */
  images: string[];
  model: string;
}

const FN = '/.netlify/functions/generate-image';

/** Map an aspect ratio like "16:9" to the closest supported OpenAI image size. */
export function aspectToSize(aspect?: string): ImageSize {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect || '');
  if (!m) return '1024x1024';
  const ratio = parseFloat(m[1]) / parseFloat(m[2]);
  if (ratio > 1.2) return '1536x1024';
  if (ratio < 0.85) return '1024x1536';
  return '1024x1024';
}

export async function generateImages(opts: GenerateImageOptions): Promise<GeneratedImagesResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to generate images');

  const { signal, ...payload } = opts;
  const res = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
    signal,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Image generation failed (${res.status})`);

  const images = (json.images || []).map(
    (i: { b64_json: string; mime_type?: string }) => `data:${i.mime_type || 'image/png'};base64,${i.b64_json}`
  );
  return { images, model: json.model };
}
