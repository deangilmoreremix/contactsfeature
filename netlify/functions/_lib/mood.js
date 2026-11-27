/** CommonJS port of lib/mood/* (pure logic; a test pins it to the TypeScript original). */
const moodModifiers = {
  friendly: `
Tone: warm, friendly, and helpful.
- Use everyday language.
- Be positive and encouraging.
- Avoid jargon.
`,

  urgent: `
Tone: urgent, direct, and action-oriented.
- Use short sentences.
- Emphasize time sensitivity without sounding desperate.
- Drive toward a clear next step.
`,

  calm: `
Tone: calm, reassuring, and emotionally steady.
- De-escalate tension.
- Show understanding and empathy.
- Avoid aggressive or pushy language.
`,

  precision: `
Tone: precise, expert, and detail-focused.
- Use clear structure and specific details.
- Highlight numbers, ROI, and concrete benefits.
- Avoid fluff; be concise but complete.
`,

  insight: `
Tone: strategic, consultative, and insight-driven.
- Offer perspective and recommendations.
- Frame challenges and opportunities.
- Make the reader feel guided by an expert advisor.
`,
};

function determineMood(contact, deal) {
  const risk = (deal && deal.risk_score) ?? 0;
  const stage = ((deal && deal.stage) || '').toLowerCase();
  const status = ((contact && contact.status) || '').toLowerCase();
  const objectionLevel = (deal && deal.objection_level) ?? 0;

  if (risk >= 70 || objectionLevel >= 7) return 'urgent';
  if (status === 'angry' || status === 'upset' || status === 'churn_risk') return 'calm';
  if (stage === 'proposal' || stage === 'negotiation') return 'precision';
  if (stage === 'discovery' || stage === 'research') return 'insight';
  return 'friendly';
}

function applyMood(prompt, mood) {
  const modifier = moodModifiers[mood] || '';

  return `
${prompt}

====================
MOOD PROFILE: ${mood.toUpperCase()}
${modifier}
====================

Always respond in a way that matches this mood profile.
`;
}

/** Why determineMood chose the mood (names the rule that fired; used for the preview, not for the AI). */
function moodReason(contact, deal) {
  const risk = (deal && deal.risk_score) ?? 0;
  const objection = (deal && deal.objection_level) ?? 0;
  const stage = ((deal && deal.stage) || '').toLowerCase();
  const status = ((contact && contact.status) || '').toLowerCase();
  if (risk >= 70 || objection >= 7) return `Deal risk ${risk}/100 and objection level ${objection}/10 call for urgency.`;
  if (status === 'angry' || status === 'upset' || status === 'churn_risk') return `Contact status "${status}" calls for a calm, de-escalating tone.`;
  if (stage === 'proposal' || stage === 'negotiation') return `Deal stage "${stage}" calls for precise, ROI-focused messaging.`;
  if (stage === 'discovery' || stage === 'research') return `Deal stage "${stage}" calls for a consultative, insight-led tone.`;
  return 'No risk, status or stage signal applies, so the default friendly tone is used.';
}

module.exports = { moodModifiers, determineMood, applyMood, moodReason };
