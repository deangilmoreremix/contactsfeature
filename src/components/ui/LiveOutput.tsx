import React from 'react';
import { AlertCircle } from 'lucide-react';
import { StreamingOutput } from './StreamingOutput';
import type { AIStreamState } from '../../hooks/useAIStream';

type Props = React.ComponentProps<typeof StreamingOutput> & {
  /** Also show the failure message when the run ends in an error (default true). */
  showError?: boolean;
};

/**
 * <StreamingOutput/> shown only while a run is live (status chip, typing preview, Stop); once the run
 * ends the component's own result layout takes over. A failed run shows the error in the usual red notice.
 */
export const LiveOutput: React.FC<Props & { state: Pick<AIStreamState, 'status' | 'text' | 'label' | 'steps' | 'reasoning'> & { error?: string | null } }> = ({ showError = true, state, ...rest }) => {
  if (state.status === 'streaming') return <StreamingOutput state={state} {...rest} />;
  if (showError && state.status === 'error' && state.error) {
    return (
      <div className={`p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center ${rest.className ?? ''}`}>
        <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  return null;
};
