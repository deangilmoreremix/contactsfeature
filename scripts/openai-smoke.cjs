#!/usr/bin/env node
/**
 * Live smoke test: one tiny call per OpenAI endpoint we depend on, through netlify/functions/_responses.js.
 * Needs OPENAI_API_KEY. Usage:  OPENAI_API_KEY=sk-... node scripts/openai-smoke.cjs [--images] [--batch]
 *   --images  also runs the image_generation tool (costs a little)
 *   --batch   also creates + immediately cancels a Batch API job
 */
const r = require('../netlify/functions/_responses.js');

const args = new Set(process.argv.slice(2));
const results = [];

async function step(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name} (${Date.now() - t0}ms)${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    results.push({ name, ok: false });
    console.log(`✗ ${name}: ${(err && err.message) || err}`);
  }
}

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    process.exit(2);
  }

  await step('responses.create (fast role)', async () => {
    const x = await r.createResponse({ role: 'fast', input: 'Reply with the single word: pong', maxOutputTokens: 50, store: false });
    if (!/pong/i.test(x.text)) throw new Error(`unexpected text: ${x.text}`);
    return x.text.trim();
  });

  await step('responses.create structured output', async () => {
    const x = await r.createResponse({ role: 'fast', input: 'Return ok=true', schema: { type: 'object', properties: { ok: { type: 'boolean' } } }, maxOutputTokens: 100, store: false });
    if (!x.json || x.json.ok !== true) throw new Error('schema result missing');
  });

  await step('responses.input_tokens.count', async () => `${await r.countInputTokens({ role: 'fast', input: 'hello world' })} tokens`);

  await step('moderations', async () => {
    const m = await r.moderate('Have a great day!');
    if (m.flagged) throw new Error('benign text flagged');
  });

  await step('embeddings', async () => `${(await r.embed(['hello']))[0].length} dims`);

  await step('background response + retrieve + cancel', async () => {
    const x = await r.createResponse({ role: 'fast', input: 'Write a haiku about CRMs', background: true, maxOutputTokens: 200 });
    const got = await r.retrieveResponse(x.id);
    try { await r.cancelResponse(x.id); } catch (_) { /* may already be done */ }
    return `${x.id} -> ${got.status}`;
  });

  await step('conversations create/delete', async () => {
    const c = await r.createConversation({ metadata: { smoke: 'true' } });
    const x = await r.createResponse({ role: 'fast', input: 'Remember the number 7', conversationId: c.id, maxOutputTokens: 50, store: true });
    await r.deleteConversation(c.id);
    return `${c.id}, reply ${x.id}`;
  });

  await step('realtime client_secrets', async () => {
    const s = await r.createRealtimeSecret({ instructions: 'smoke test', expiresAfterSeconds: 60 });
    if (!s.value || !String(s.value).startsWith('ek_')) throw new Error('no ephemeral key returned');
    return `${s.model}, expires ${s.expiresAt}`;
  });

  await step('files upload/delete', async () => {
    const { toFile } = require('openai');
    const f = await r.uploadFile(await toFile(Buffer.from('hello'), 'smoke.txt'), 'user_data');
    await r.deleteFile(f.id);
    return f.id;
  });

  if (args.has('--batch')) {
    await step('batches create + cancel', async () => {
      const b = await r.createBatch('/v1/responses', [{ customId: 'smoke-1', body: r.buildParams({ role: 'fast', input: 'hi', maxOutputTokens: 20, store: false }) }]);
      const c = await r.cancelBatch(b.id);
      return `${b.id} -> ${c.status}`;
    });
  }

  if (args.has('--images')) {
    await step('responses image_generation (background)', async () => {
      const x = await r.createResponse({ role: 'default', input: 'A small blue square on white', tools: [{ type: 'image_generation', quality: 'low', size: '1024x1024' }], background: true });
      return x.id;
    });
  }

  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
