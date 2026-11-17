// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { endpointOf, wantsStream, isAllowedNonStream } from '../src/lib/streaming/streamGuard';

describe('stream guard helpers', () => {
  it('recognises generative endpoints, ignores data endpoints and exempt proxies', () => {
    expect(endpointOf('/.netlify/functions/cold-email-sdr')).toBe('cold-email-sdr');
    expect(endpointOf('https://x.supabase.co/functions/v1/email-composer')).toBe('email-composer');
    expect(endpointOf('/.netlify/functions/send-email')).toBeNull();
    expect(endpointOf('/.netlify/functions/ai-respond')).toBe('ai-respond');
    expect(endpointOf('/.netlify/functions/generate-image')).toBeNull();
    expect(endpointOf('/api/other')).toBeNull();
  });
  it('accepts stream:true bodies and SSE Accept headers, rejects plain requests', () => {
    expect(wantsStream({ body: JSON.stringify({ a: 1, stream: true }) })).toBe(true);
    expect(wantsStream({ headers: { Accept: 'text/event-stream' } })).toBe(true);
    expect(wantsStream({ body: JSON.stringify({ a: 1 }) })).toBe(false);
    expect(wantsStream({})).toBe(false);
  });
  it('polices the previously blind UI-reachable dual-mode endpoints', () => {
    for (const n of ['linkedin-sdr', 'whatsapp-sdr', 'event-based-sdr', 'referral-sdr', 'newsletter-sdr', 'high-intent-sdr',
      'data-enrichment-sdr', 'competitor-aware-sdr', 'adaptive-playbook', 'communication-optimization', 'discovery-questions',
      'cold-call-sdr', 'deal-analysis-agent', 'proposal-generator', 'email-deliverability-agent', 'ai-enrichment', 'video-call-scheduler']) {
      expect(endpointOf(`/.netlify/functions/${n}`)).toBe(n);
    }
    // verified NOT AI (plain CRUD) -> not policed
    for (const n of ['communication-manager']) expect(endpointOf(`/.netlify/functions/${n}`)).toBeNull();
  });
  it('ai-respond is a violation unless it is an allow-listed non-visible caller (ai-task-queue)', () => {
    const plain = (b: object): RequestInit => ({ body: JSON.stringify(b) });
    expect(isAllowedNonStream('ai-respond', plain({ schemaName: 'lead_score', input: 'x' }))).toBe(true);
    expect(isAllowedNonStream('ai-respond', plain({ schemaName: 'task_email' }))).toBe(true);
    expect(isAllowedNonStream('ai-respond', plain({ schemaName: 'something_visible' }))).toBe(false);
    expect(isAllowedNonStream('ai-respond', plain({ input: 'x' }))).toBe(false);
    expect(isAllowedNonStream('ai-respond', { body: 'not json' })).toBe(false);
    expect(isAllowedNonStream('ai-respond', {})).toBe(false);
    expect(isAllowedNonStream('cold-email-sdr', plain({ schemaName: 'lead_score' }))).toBe(false);
    expect(wantsStream(plain({ stream: true }))).toBe(true);
  });
});
