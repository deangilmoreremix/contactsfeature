import { useEffect, useRef } from 'react';
import { useToast } from './Toast';

/** Shows a toast for every AIError raised by src/services/aiClient.ts (rate-limited to avoid spam). */
export const AIErrorToaster = () => {
  const { showToast } = useToast();
  const last = useRef<{ key: string; at: number }>({ key: '', at: 0 });

  useEffect(() => {
    const onError = (e: Event) => {
      const { message, status } = (e as CustomEvent<{ message: string; status: number }>).detail;
      const key = `${status}:${message}`;
      const now = Date.now();
      if (last.current.key === key && now - last.current.at < 4000) return;
      last.current = { key, at: now };
      showToast({
        type: status === 401 ? 'warning' : 'error',
        title: status === 401 ? 'Sign in to use AI features' : status === 429 ? 'AI is busy' : 'AI request failed',
        message: status === 401 ? 'AI actions run on the server and need an active session.' : message,
      });
    };
    window.addEventListener('smartcrm:ai-error', onError);
    return () => window.removeEventListener('smartcrm:ai-error', onError);
  }, [showToast]);

  return null;
};
