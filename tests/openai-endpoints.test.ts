// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.OPENAI_API_KEY = 'test';
const r = require('../netlify/functions/_responses.js');

describe('OpenAI endpoint helpers (fake client)', () => {
  it('conversations: create + delete (404 tolerated) and conversation param in buildParams', async () => {
    const client = {
      conversations: {
        create: vi.fn().mockResolvedValue({ id: 'conv_1' }),
        delete: vi.fn().mockRejectedValueOnce(Object.assign(new Error('nf'), { status: 404 })),
      },
    };
    expect(await r.createConversation({ client, metadata: { lead: 'x' } })).toEqual({ id: 'conv_1' });
    expect(client.conversations.create).toHaveBeenCalledWith({ metadata: { lead: 'x' } });
    expect(await r.deleteConversation('conv_1', { client })).toBe(false);
    const p = r.buildParams({ role: 'fast', input: 'hi', conversationId: 'conv_1', previousResponseId: 'resp_9' });
    expect(p.conversation).toBe('conv_1');
    expect(p.previous_response_id).toBeUndefined();
  });

  it('batches: jsonl shape, create, status + results parsing', async () => {
    const jsonl = r.buildBatchJsonl('/v1/responses', [{ customId: 'a', body: { model: 'm', input: 'x' } }]);
    expect(JSON.parse(jsonl)).toEqual({ custom_id: 'a', method: 'POST', url: '/v1/responses', body: { model: 'm', input: 'x' } });

    const client = {
      files: {
        create: vi.fn().mockResolvedValue({ id: 'file_in', bytes: 10, filename: 'batch.jsonl' }),
        content: vi.fn().mockResolvedValue({
          text: async () => [
            JSON.stringify({ custom_id: 'a', response: { status_code: 200, body: { id: 'r1' } } }),
            JSON.stringify({ custom_id: 'b', error: { code: 'x' } }),
          ].join('\n'),
        }),
      },
      batches: {
        create: vi.fn().mockResolvedValue({ id: 'batch_1', status: 'validating' }),
        retrieve: vi.fn().mockResolvedValue({ id: 'batch_1', status: 'completed', output_file_id: 'file_out', request_counts: { total: 2 } }),
      },
    };
    const created = await r.createBatch('/v1/responses', [{ customId: 'a', body: {} }], { client });
    expect(created).toMatchObject({ id: 'batch_1', inputFileId: 'file_in' });
    expect(client.batches.create).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v1/responses', completion_window: '24h', input_file_id: 'file_in' }));

    const done = await r.getBatch('batch_1', { client, withResults: true });
    expect(done.results).toEqual([
      { customId: 'a', ok: true, body: { id: 'r1' }, error: null },
      { customId: 'b', ok: false, body: null, error: { code: 'x' } },
    ]);
  });

  it('realtime: mints an ephemeral secret with role model, never the API key', async () => {
    const client = { realtime: { clientSecrets: { create: vi.fn().mockResolvedValue({ value: 'ek_123', expires_at: 1900000000 }) } } };
    const s = await r.createRealtimeSecret({ client, instructions: 'be brief', voice: 'marin', expiresAfterSeconds: 60 });
    expect(s).toEqual({ value: 'ek_123', expiresAt: 1900000000, model: 'gpt-realtime-2.1' });
    const arg = client.realtime.clientSecrets.create.mock.calls[0][0];
    expect(arg.session).toMatchObject({ type: 'realtime', model: 'gpt-realtime-2.1', instructions: 'be brief' });
    expect(arg.expires_after).toEqual({ anchor: 'created_at', seconds: 60 });
    expect(JSON.stringify(arg)).not.toContain('test'); // api key never included
  });

  it('webhooks: requires a secret and delegates signature verification', async () => {
    delete process.env.OPENAI_WEBHOOK_SECRET;
    await expect(r.unwrapWebhook('{}', {}, { client: {} })).rejects.toThrow(/OPENAI_WEBHOOK_SECRET/);
    const client = { webhooks: { unwrap: vi.fn().mockResolvedValue({ type: 'response.completed', data: { id: 'resp_1' } }) } };
    const ev = await r.unwrapWebhook('{"x":1}', { 'webhook-id': 'a' }, { client, secret: 'whsec' });
    expect(ev.type).toBe('response.completed');
    expect(client.webhooks.unwrap).toHaveBeenCalledWith('{"x":1}', { 'webhook-id': 'a' }, 'whsec');
  });

  it('token counting + cancel', async () => {
    const client = {
      responses: {
        inputTokens: { count: vi.fn().mockResolvedValue({ input_tokens: 42 }) },
        cancel: vi.fn().mockResolvedValue({ id: 'resp_1', status: 'cancelled' }),
      },
    };
    expect(await r.countInputTokens({ client, role: 'fast', input: 'hello' })).toBe(42);
    expect(await r.cancelResponse('resp_1', { client })).toEqual({ id: 'resp_1', status: 'cancelled' });
  });
});
