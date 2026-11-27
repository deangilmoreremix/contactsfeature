/**
 * Webhook endpoints (table `webhook_endpoints`, owner-only RLS).
 *  - outbound: https URL (+ optional signing secret). Deliveries go through the webhook-dispatch function.
 *  - inbound : external systems POST to /.netlify/functions/webhook-trigger?id=<id> with header
 *              X-Webhook-Secret. Only a SHA-256 hash of the secret is stored; the plaintext is
 *              returned once from createInbound and cannot be recovered afterwards.
 */
import { supabase } from '../lib/supabase';
import { sdrAuthHeaders } from './sdrClient';

export interface WebhookEndpoint {
  id: string;
  name: string;
  direction: 'inbound' | 'outbound';
  url: string | null;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatus: string | null;
  createdAt: string;
}

type Row = {
  id: string; name: string; direction: 'inbound' | 'outbound'; url: string | null; events: string[] | null; is_active: boolean;
  last_triggered_at: string | null; last_status: string | null; created_at: string;
};
const COLS = 'id,name,direction,url,events,is_active,last_triggered_at,last_status,created_at';
const map = (r: Row): WebhookEndpoint => ({
  id: r.id, name: r.name, direction: r.direction, url: r.url, events: r.events || [], isActive: r.is_active,
  lastTriggeredAt: r.last_triggered_at, lastStatus: r.last_status, createdAt: r.created_at,
});

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
async function userId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Please sign in');
  return data.user.id;
}

export const webhookService = {
  async list(): Promise<WebhookEndpoint[]> {
    const { data, error } = await supabase.from('webhook_endpoints').select(COLS).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as Row[]).map(map);
  },

  async createOutbound(input: { name: string; url: string; events?: string[]; signingSecret?: string }): Promise<WebhookEndpoint> {
    if (!/^https:\/\//i.test(input.url)) throw new Error('Webhook URL must start with https://');
    const { data, error } = await supabase.from('webhook_endpoints').insert({
      user_id: await userId(), name: input.name, direction: 'outbound', url: input.url, events: input.events || [],
      signing_secret: input.signingSecret || randomHex(24),
    } as never).select(COLS).maybeSingle();
    if (error || !data) throw new Error(error?.message || 'Could not create webhook');
    return map(data as unknown as Row);
  },

  /** Returns the endpoint plus the one-time plaintext secret and the trigger URL. */
  async createInbound(name: string): Promise<{ endpoint: WebhookEndpoint; secret: string; triggerUrl: string }> {
    const secret = randomHex(32);
    const { data, error } = await supabase.from('webhook_endpoints').insert({
      user_id: await userId(), name, direction: 'inbound', secret_hash: await sha256Hex(secret),
    } as never).select(COLS).maybeSingle();
    if (error || !data) throw new Error(error?.message || 'Could not create webhook');
    const endpoint = map(data as unknown as Row);
    return { endpoint, secret, triggerUrl: `${window.location.origin}/.netlify/functions/webhook-trigger?id=${endpoint.id}` };
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from('webhook_endpoints').update({ is_active: isActive, updated_at: new Date().toISOString() } as never).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('webhook_endpoints').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  /** Send a test delivery to one of the user's outbound endpoints. */
  async sendTest(id: string): Promise<void> {
    const res = await fetch('/.netlify/functions/webhook-dispatch', {
      method: 'POST', headers: await sdrAuthHeaders(), body: JSON.stringify({ endpoint_id: id, event: 'test', payload: { hello: 'from SmartCRM' } }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Webhook test failed (${res.status})`);
  },
};
