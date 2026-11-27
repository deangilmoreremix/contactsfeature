import React from 'react';
import { Square, Loader2, Brain } from 'lucide-react';
import { ModernButton } from './ModernButton';
import type { AIStreamState } from '../../hooks/useAIStream';

interface Props {
  state: Pick<AIStreamState, 'status' | 'text' | 'label' | 'steps' | 'reasoning'>;
  onStop?: (() => void) | undefined;
  /** Text to show instead of the raw stream (e.g. a formatted preview of partial JSON). */
  display?: string | undefined;
  placeholder?: string | undefined;
  showReasoning?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Live AI output: text appears as it is generated (with a typing caret), a status line shows what the
 * AI is doing right now ("Searching the web…"), and a Stop button cancels the run.
 * Uses the same neutral card/chip classes as the rest of the app.
 */
export const StreamingOutput: React.FC<Props> = ({ state, onStop, display, placeholder, showReasoning, className = '' }) => {
  const live = state.status === 'streaming';
  const text = display ?? state.text;
  if (state.status === 'idle' && !text) return null;

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 ${className}`} aria-live="polite" aria-busy={live}>
      {(live || state.steps.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {live && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-1 bg-blue-100 text-blue-700">
              <Loader2 className="w-3 h-3 animate-spin" />
              {state.label || 'Writing…'}
            </span>
          )}
          {state.steps.slice(0, -1).slice(-3).map((s) => (
            <span key={s} className="text-xs rounded-md px-2 py-1 bg-gray-100 text-gray-700">{s}</span>
          ))}
          {live && onStop && (
            <ModernButton size="toolbar" variant="outline" onClick={onStop} className="ml-auto">
              <Square className="w-4 h-4" /> Stop
            </ModernButton>
          )}
        </div>
      )}
      {text ? (
        <pre className="whitespace-pre-wrap break-words text-sm font-sans text-gray-800 dark:text-gray-100 m-0">
          {text}
          {live && <span className="inline-block w-1.5 h-4 ml-0.5 align-[-2px] bg-blue-500 animate-pulse" aria-hidden />}
        </pre>
      ) : (
        live && placeholder && <p className="text-sm text-gray-500 m-0">{placeholder}</p>
      )}
      {showReasoning && state.reasoning && (
        <details className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer inline-flex items-center gap-1"><Brain className="w-3 h-3" /> Thinking</summary>
          <p className="whitespace-pre-wrap mt-1">{state.reasoning}</p>
        </details>
      )}
    </div>
  );
};
