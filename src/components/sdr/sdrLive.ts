/** Pure helpers for rendering streamed SDR results (partial JSON -> displayable object). */

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** The object to render: the final result when present, otherwise the partial JSON filled in so far. */
export function pickLive<R extends object>(result: R | null, partial: unknown): Partial<R> | null {
  if (result) return result;
  return isPlainObject(partial) && Object.keys(partial).length ? (partial as Partial<R>) : null;
}

/** True when the raw streamed text is worth showing (it is not just the JSON being built). */
export function isReadableText(text: string): boolean {
  const t = text.trimStart();
  return t.length > 0 && !t.startsWith('{') && !t.startsWith('[');
}
