/**
 * Shared, pure normalisers for AI output. They never default to made-up values:
 * unknown / placeholder text becomes null, and confidence is a clamped integer or null.
 */

export const nullable = (type: string, description?: string) => ({ type: [type, 'null'], ...(description ? { description } : {}) });
export const CONFIDENCE_SCHEMA = { type: ['integer', 'null'], description: '0-100 confidence justified by the evidence supplied; null when the evidence is insufficient' };

export function cleanString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t && !/^(unknown|n\/a|none|null|not available|information not available)$/i.test(t) ? t : null;
}

export function cleanStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(cleanString).filter((x): x is string => x !== null);
}

/** 0-100 integer or null (never defaults to a made-up number). */
export function cleanConfidence(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** http(s) URLs only. */
export function cleanUrl(v: unknown): string | null {
  const s = cleanString(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch { return null; }
}

