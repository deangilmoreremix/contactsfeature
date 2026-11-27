/**
 * Optional live-progress callbacks accepted by every user-visible AI service call.
 * Pass them straight through to aiJson(req, live) / aiStream(req, live): the call then runs over the
 * streaming endpoint (docs/STREAMING.md). Omit them for background pipelines (plain request).
 */
import type { AIStreamHandlers } from './aiClient';

export type LiveOptions = Pick<AIStreamHandlers, 'onPartial' | 'onStatus' | 'onDelta' | 'onReasoning' | 'signal' | 'background'>;

/** True when the caller asked for live progress. */
export const isLive = (live?: LiveOptions): boolean =>
  !!live && Object.values(live).some((v) => v !== undefined);

import { aiRespond, aiStream, type AIRequest, type AIResponse } from './aiClient';

/**
 * Text/tool request: streams (status + delta events) when live callbacks are given, otherwise a plain
 * request. Resolves with the same AIResponse either way.
 */
export function aiCall<T = unknown>(req: AIRequest, live?: LiveOptions): Promise<AIResponse<T>> {
  return isLive(live) ? (aiStream(req, live) as Promise<AIResponse<T>>) : aiRespond<T>(req);
}
