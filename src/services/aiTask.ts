/**
 * Streaming AI tasks (netlify/functions/ai-task.js). One call per user-visible answer:
 *
 *   const score = await streamTask<{ score: number; grade: string }>('smart-score', { contactId }, {
 *     onPartial: (p) => setPreview(p), onStatus: setLabel, signal,
 *   });
 *
 * The task id equals the legacy Supabase edge-function name, so existing call sites map 1:1.
 * Always streams; if the server answers with plain JSON (cached/short-circuit) the same result is returned.
 */
import { streamFunction } from './liveFunction';
import type { StreamHandlers } from '../lib/streaming/streamClient';

export type TaskLive = Pick<StreamHandlers, 'onPartial' | 'onStatus' | 'onDelta' | 'onReasoning' | 'signal'>;

export interface TaskEnvelope<T> {
  success: boolean;
  data: T;
  task: string;
  model?: string;
}

export async function streamTaskEnvelope<T = unknown>(task: string, params: Record<string, unknown> = {}, live: TaskLive = {}): Promise<TaskEnvelope<T>> {
  const { result, outcome } = await streamFunction<TaskEnvelope<T>>('/.netlify/functions/ai-task', { task, params }, live);
  if (outcome.error) throw new Error(outcome.error);
  if (!result) throw new Error('The AI returned no result');
  return result;
}

/** Convenience: resolves with the task's payload only. */
export async function streamTask<T = unknown>(task: string, params: Record<string, unknown> = {}, live: TaskLive = {}): Promise<T> {
  return (await streamTaskEnvelope<T>(task, params, live)).data;
}
