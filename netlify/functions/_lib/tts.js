/** Text-to-speech through the Audio speech endpoint (port of lib/core/openaiClient.synthesizeSpeech). */
const { getClient, models } = require('../_responses');

const VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse']);
const MAX_CHARS = 4000;

/** -> { base64, mime } ; throws on API failure. */
async function synthesizeSpeech(text, voice = 'alloy', client) {
  const c = client || getClient();
  const model = process.env.SMARTCRM_TTS_MODEL || (models.audio && models.audio.tts);
  const res = await c.audio.speech.create({
    model,
    voice: VOICES.has(voice) ? voice : 'alloy',
    input: String(text).slice(0, MAX_CHARS),
    response_format: 'mp3',
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString('base64'), mime: 'audio/mpeg' };
}

module.exports = { synthesizeSpeech, VOICES, MAX_CHARS };
