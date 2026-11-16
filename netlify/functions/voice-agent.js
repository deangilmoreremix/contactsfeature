/**
 * voice-agent — voicemail / voice-message SCRIPT written from the user's talking points (lib/voice/voiceAgent prompt:
 * contact, latest deal, agent memory, mood), streamed. Optional text-to-speech (`tts: true`) goes through the Audio
 * speech endpoint exactly as lib/voice/createVoiceMessage does and returns an mp3 (base64) after moderation; if TTS
 * fails the script is still returned with `audioError`. Nothing is queued in voice_jobs and nothing is sent.
 * POST { contactId, script (talking points), mode? = sdr|ae, tts? = false, voice? = alloy }
 *   -> { contactId, mode, mood, script, audioBase64?, audioMime?, audioError? }
 */
const { stream } = require('@netlify/functions');
const { withAuth } = require('./_auth');
const { createPanelHandler } = require('./_lib/panelHandler');
const { requireUuid, ownedContact, latestDealForContact, memoryRows, TaskError } = require('./_lib/ctx');
const { groupMemory } = require('./_lib/memory');
const { determineMood } = require('./_lib/mood');
const { voicePrompt } = require('./_lib/agentScripts');
const { synthesizeSpeech, VOICES } = require('./_lib/tts');

const SCHEMA = { type: 'object', properties: { script: { type: 'string', description: 'the voice message, 20-40 seconds when spoken' } } };

const createHandler = createPanelHandler({
  endpoint: 'voice-agent',
  parse(body) {
    const talking = typeof body.script === 'string' ? body.script.trim().slice(0, 4000) : '';
    if (!talking) throw new TaskError(400, 'Enter the script or talking points.');
    return {
      contactId: requireUuid(body.contactId, 'contactId'),
      talking,
      mode: body.mode === 'ae' ? 'ae' : 'sdr',
      tts: body.tts === true,
      voice: VOICES.has(body.voice) ? body.voice : 'alloy',
    };
  },
  async load({ user, params }) {
    const contact = await ownedContact(user, params.contactId);
    const deal = await latestDealForContact(user, contact.id);
    const memory = groupMemory(await memoryRows(contact.id));
    return { contact, deal, memory, mood: determineMood(contact, deal) };
  },
  build(ctx, params) {
    const base = voicePrompt({ mode: params.mode, contact: ctx.contact, deal: ctx.deal, memory: ctx.memory }, ctx.mood);
    return {
      role: 'default', effort: 'low', schema: SCHEMA, schemaName: 'voice_script', maxOutputTokens: 1500,
      instructions: 'You write natural-sounding voicemail scripts. Use only facts about the contact that are given. Replace placeholders such as {{name}} with the real values when known.',
      input: `${base}\n\nThe user's talking points / draft (cover these, in your own natural spoken words):\n${params.talking}`,
    };
  },
  finalize({ parsed, ctx, params }) {
    return { contactId: ctx.contact.id, mode: params.mode, mood: ctx.mood, script: String(parsed.script || '').trim() };
  },
  outboundText: (p) => [p.script],
  async afterModeration({ payload, params, deps }) {
    if (!params.tts || !payload.script) return payload;
    try {
      const audio = await (deps.synthesizeSpeech || synthesizeSpeech)(payload.script, params.voice);
      return { ...payload, audioBase64: audio.base64, audioMime: audio.mime };
    } catch (_) {
      return { ...payload, audioError: 'Text-to-speech failed; the script is ready to copy.' };
    }
  },
});

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
