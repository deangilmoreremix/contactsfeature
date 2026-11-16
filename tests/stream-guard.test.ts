// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { endpointOf, wantsStream } from '../src/lib/streaming/streamGuard';

describe('stream guard helpers', () => {
  it('recognises generative endpoints, ignores data endpoints and exempt proxies', () => {
    expect(endpointOf('/.netlify/functions/cold-email-sdr')).toBe('cold-email-sdr');
    expect(endpointOf('https://x.supabase.co/functions/v1/email-composer')).toBe('email-composer');
    expect(endpointOf('/.netlify/functions/send-email')).toBeNull();
    expect(endpointOf('/.netlify/functions/ai-respond')).toBeNull();
    expect(endpointOf('/api/other')).toBeNull();
  });
  it('accepts stream:true bodies and SSE Accept headers, rejects plain requests', () => {
    expect(wantsStream({ body: JSON.stringify({ a: 1, stream: true }) })).toBe(true);
    expect(wantsStream({ headers: { Accept: 'text/event-stream' } })).toBe(true);
    expect(wantsStream({ body: JSON.stringify({ a: 1 }) })).toBe(false);
    expect(wantsStream({})).toBe(false);
  });
});
