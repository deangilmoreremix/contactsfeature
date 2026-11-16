import React from 'react';
import { StreamingOutput } from '../ui/StreamingOutput';
import { useAIStream } from '../../hooks/useAIStream';
import { isReadableText, pickLive } from './sdrLive';

/** useAIStream for the SDR cards: live object (final result or partial JSON), loading flag and stream error. */
export function useSdrRun<R extends object>() {
  const s = useAIStream<R>();
  const loading = s.state.status === 'streaming';
  const live = pickLive<R>(s.state.result, s.state.partial);
  return { ...s, loading, live, final: s.state.result, streamError: s.state.error };
}

/**
 * Status chip + Stop while the agent works. Structured fields are rendered by the card itself as they
 * arrive; raw text is shown here only when the function streams plain text (no partial JSON yet).
 */
export const SdrLiveBar: React.FC<{ run: ReturnType<typeof useSdrRun<any>>; placeholder?: string; showStop?: boolean }> = ({ run, placeholder, showStop = true }) => {
  const { state } = run;
  if (state.status !== 'streaming') return null;
  const showText = !run.live && isReadableText(state.text);
  return (
    <StreamingOutput
      state={state}
      onStop={showStop ? run.stop : undefined}
      display={showText ? state.text : ''}
      placeholder={placeholder}
      className="mb-2.5"
    />
  );
};
