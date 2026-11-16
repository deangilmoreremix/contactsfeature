/** Prompts of lib/video/createVideoScript.ts and lib/voice/voiceAgent.ts (CommonJS port; a test compares them). */
const { buildMemoryPrompt } = require('./memory');
const { applyMood } = require('./mood');
const j = (v) => JSON.stringify(v, null, 2);

function videoBasePrompt({ template, contact, deal, memory }) {
  const memoryBlock = buildMemoryPrompt(memory.short, memory.mid, memory.long);
  return `
You are creating a short personalized sales video script.

Video template type: ${template}

Contact:
${j(contact)}

Deal:
${j(deal)}

${memoryBlock}

Task:
- Write a 45–60 second video script.
- Include intro, main value points, and a clear call-to-action.
- Use first person ("I", "we") and speak directly to the viewer by name if available.
Return ONLY the script text, ready for narration.
  `;
}

function videoPrompt(args, mood) {
  return applyMood(videoBasePrompt(args), mood);
}

function voiceBasePrompt({ mode, contact, deal, memory }) {
  const memoryBlock = buildMemoryPrompt(memory.short, memory.mid, memory.long);
  const role =
    mode === 'sdr'
      ? 'You are an SDR leaving a short, friendly voicemail.'
      : 'You are an AE leaving a concise, value-packed voicemail.';
  return `
${role}

Contact:
${j(contact)}

Deal:
${j(deal)}

${memoryBlock}

Task:
- Write a 20–40 second voice message script.
- Make it sound natural when spoken.
- End with a clear but low-pressure call-to-action.
Return ONLY the voicemail script text.
  `;
}

function voicePrompt(args, mood) {
  return applyMood(voiceBasePrompt(args), mood);
}

module.exports = { videoPrompt, voicePrompt };
