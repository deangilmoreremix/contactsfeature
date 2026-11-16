/**
 * Dev/test guard: every request to a generative AI endpoint must ask for a stream
 * (`stream:true` in the body or `Accept: text/event-stream`). A plain request is recorded as a
 * STREAM_VIOLATION so non-streaming AI cannot ship unnoticed (see tests/playwright/ai-sweep.spec.ts).
 *
 * Endpoint list: src/lib/streaming/aiEndpoints.json (generated from the census: every STREAM function).
 * Enabled when `import.meta.env.DEV` or `VITE_STREAM_GUARD=1`; never active in production builds.
 */
import endpointsJson from './aiEndpoints.json';

export interface StreamViolation {
  url: string;
  endpoint: string;
  at: number;
}

declare global {
  interface Window {
    __streamViolations?: StreamViolation[];
    __streamRequests?: Array<{ endpoint: string; at: number }>;
  }
}

const ENDPOINTS = new Set<string>((endpointsJson as { endpoints: string[] }).endpoints);
// plain-JSON by design (non-visible pipelines / mint tokens / reference-image edits)
const EXEMPT = new Set(['ai-respond', 'generate-image', 'realtime-token']);
const NAME_RE = /\/(?:\.netlify\/functions|functions\/v1)\/([a-z0-9-]+)/;

export function endpointOf(url: string): string | null {
  const m = NAME_RE.exec(url);
  return m && ENDPOINTS.has(m[1]) && !EXEMPT.has(m[1]) ? m[1] : null;
}

export function wantsStream(init?: RequestInit, request?: Request): boolean {
  const headers = new Headers(init?.headers ?? request?.headers);
  if (/text\/event-stream/i.test(headers.get('accept') || '')) return true;
  const body = init?.body;
  if (typeof body === 'string') return /"stream(ing)?"\s*:\s*true/.test(body);
  return false;
}

export function installStreamGuard(): void {
  const enabled = (import.meta.env.DEV || import.meta.env['VITE_STREAM_GUARD'] === '1') && typeof window !== 'undefined';
  if (!enabled || (window as unknown as { __streamGuard?: boolean }).__streamGuard) return;
  (window as unknown as { __streamGuard?: boolean }).__streamGuard = true;
  window.__streamViolations = [];
  window.__streamRequests = [];

  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const endpoint = endpointOf(url);
    if (endpoint) {
      window.__streamRequests!.push({ endpoint, at: Date.now() });
      if (!wantsStream(init, input instanceof Request ? input : undefined)) {
        window.__streamViolations!.push({ url, endpoint, at: Date.now() });
        console.error(`STREAM_VIOLATION: ${endpoint} was called without stream:true / Accept: text/event-stream`);
      }
    }
    return original(input, init);
  };
}
