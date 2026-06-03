/**
 * useStreamingAI - Custom hook for handling streaming AI responses
 * Works with SSE (Server-Sent Events) from Netlify functions
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '../services/logger.service';

export interface StreamingState<T = any> {
  isStreaming: boolean;
  content: string;
  partialContent: string;
  progress: number;
  error: string | null;
  data: T | null;
}

export interface UseStreamingAIOptions {
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number, message?: string) => void;
}

export function useStreamingAI<T = any>(options: UseStreamingAIOptions = {}) {
  const [state, setState] = useState<StreamingState<T>>({
    isStreaming: false,
    content: '',
    partialContent: '',
    progress: 0,
    error: null,
    data: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (
    url: string,
    body: Record<string, any>,
    headers: Record<string, string> = {}
  ): Promise<T | null> => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState({
      isStreaming: true,
      content: '',
      partialContent: '',
      progress: 0,
      error: null,
      data: null,
    });

    options.onProgress?.(0, 'Starting...');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...headers,
        },
        body: JSON.stringify({
          ...body,
          streaming: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
      }

      options.onProgress?.(10, 'Connected to AI...');

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'token') {
                fullContent += parsed.token;
                setState(prev => ({
                  ...prev,
                  content: fullContent,
                  partialContent: parsed.partial || fullContent,
                  progress: Math.min(90, prev.progress + 5),
                }));
                options.onProgress?.(Math.min(90, state.progress + 5));
              } else if (parsed.type === 'complete') {
                setState(prev => ({
                  ...prev,
                  data: parsed.data,
                  progress: 100,
                }));
                options.onComplete?.(parsed.data);
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error || 'Streaming error');
              } else if (parsed.type === 'progress') {
                options.onProgress?.(parsed.progress, parsed.data);
              }
            } catch (parseError) {
              // Ignore JSON parse errors for partial data
              logger.debug('Could not parse SSE data', { data });
            }
          }
        }
      }

      options.onProgress?.(100, 'Complete');
      
      setState(prev => ({
        ...prev,
        isStreaming: false,
        progress: 100,
      }));

      return state.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Streaming failed';
      
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage,
      }));

      options.onError?.(errorMessage);
      logger.error('Streaming AI request failed', error instanceof Error ? error : new Error(errorMessage));
      
      return null;
    }
  }, [options]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setState(prev => ({
        ...prev,
        isStreaming: false,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setState({
      isStreaming: false,
      content: '',
      partialContent: '',
      progress: 0,
      error: null,
      data: null,
    });
  }, [stopStream]);

  return {
    ...state,
    startStream,
    stopStream,
    reset,
  };
}

// Utility to check if streaming is supported
export function isStreamingSupported(): boolean {
  return typeof ReadableStream !== 'undefined' && typeof fetch !== 'undefined';
}
