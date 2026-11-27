/**
 * memory-get — the caller's agent memory for one contact, plus (streamed) an AI brief of what the agents remember.
 * POST { contactId, summarize? = true } -> { contactId, memory: { short[], mid[], long[] }, total, brief }
 * `brief` = { summary, key_facts[], preferences[], avoid[] } written by the model from the LATEST entry of each layer
 * (buildMemoryPrompt, as in lib/memory); null when the contact has no memory yet or summarize:false (no AI call).
 */
const { stream } = require('@netlify/functions');
const { withAuth } = require('./_auth');
const { createPanelHandler } = require('./_lib/panelHandler');
const { requireUuid, ownedContact, memoryRows, describeContact } = require('./_lib/ctx');
const { buildMemoryPrompt, groupMemory } = require('./_lib/memory');

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2-4 sentences: what the agents currently know about this contact' },
    key_facts: { type: 'array', items: { type: 'string' } },
    preferences: { type: 'array', items: { type: 'string' }, description: 'tone, channel, timing preferences that are evidenced' },
    avoid: { type: 'array', items: { type: 'string' }, description: 'topics or offers the contact rejected' },
  },
};

const layer = (rows) => rows.map((r) => ({ id: r.id, memory_type: r.memory_type, data: r.data, updated_at: r.updated_at }));

const createHandler = createPanelHandler({
  endpoint: 'memory-get',
  parse(body) {
    return { contactId: requireUuid(body.contactId, 'contactId'), summarize: body.summarize !== false };
  },
  async load({ user, params }) {
    const contact = await ownedContact(user, params.contactId);
    const memory = groupMemory(await memoryRows(contact.id));
    const total = memory.short.length + memory.mid.length + memory.long.length;
    const base = { contactId: contact.id, memory: { short: layer(memory.short), mid: layer(memory.mid), long: layer(memory.long) }, total };
    if (!total || !params.summarize) return { shortCircuit: { ...base, brief: null } };
    return { contact, memory, base };
  },
  build(ctx) {
    return {
      role: 'fast', effort: 'low', schema: SCHEMA, schemaName: 'memory_brief', maxOutputTokens: 1200,
      instructions: 'You summarise what a CRM\'s AI agents remember about one contact. Use ONLY the memory given; never invent facts. If a layer is empty (null) say nothing about it. Be concise.',
      input: `Contact:\n${describeContact(ctx.contact)}\n${buildMemoryPrompt(ctx.memory.short, ctx.memory.mid, ctx.memory.long)}\nWrite the brief.`,
    };
  },
  finalize({ parsed, ctx }) {
    return {
      ...ctx.base,
      brief: {
        summary: String(parsed.summary || ''),
        key_facts: Array.isArray(parsed.key_facts) ? parsed.key_facts.map(String) : [],
        preferences: Array.isArray(parsed.preferences) ? parsed.preferences.map(String) : [],
        avoid: Array.isArray(parsed.avoid) ? parsed.avoid.map(String) : [],
      },
    };
  },
});

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
