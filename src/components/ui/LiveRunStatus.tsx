import React from 'react';
import { StreamingOutput } from './StreamingOutput';
import type { LiveCall } from '../../hooks/useLiveCall';
import { liveDisplay } from '../../lib/streaming/previewText';

/** Status chip ("Searching the web…"), step history and Stop button for a `useLiveCall` run. Renders nothing when idle. */
export const LiveRunStatus: React.FC<{ live: LiveCall; className?: string; /** Show the streamed text itself (free-text answers). JSON runs render their own fields instead. */ showText?: boolean; placeholder?: string }> = ({ live, className = '', showText = false, placeholder }) => {
  if (!live.state.active) return null;
  return (
    <StreamingOutput
      className={className}
      state={{ status: 'streaming', text: live.state.text, label: live.state.label, steps: live.state.steps, reasoning: '' }}
      display={showText ? liveDisplay(live.state.partial, live.state.text) : ''}
      {...(placeholder ? { placeholder } : {})}
      onStop={live.stop}
    />
  );
};
