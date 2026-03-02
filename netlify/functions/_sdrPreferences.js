function extractPreferences(body) {
  const prefs = body.preferences || {};
  return {
    model: prefs.model || null,
    temperature: typeof prefs.temperature === 'number' ? prefs.temperature : null,
    maxTokens: typeof prefs.maxTokens === 'number' ? prefs.maxTokens : null,
    tone: prefs.tone || null,
    customInstructions: prefs.customInstructions || '',
    companyName: prefs.companyName || '',
    signature: prefs.signature || '',
    personalizationLevel: prefs.personalizationLevel || 'medium',
  };
}

function buildToneInstruction(tone) {
  const toneMap = {
    professional: 'Use a professional, polished tone. Be direct and credible.',
    casual: 'Use a casual, relaxed tone. Write like a friendly colleague, not a salesperson.',
    friendly: 'Use a warm, friendly tone. Be approachable and personable.',
    enthusiastic: 'Use an enthusiastic, energetic tone. Show genuine excitement about how you can help.',
  };
  return toneMap[tone] || toneMap.professional;
}

function buildPreferencesPromptBlock(prefs) {
  const parts = [];

  if (prefs.tone) {
    parts.push(`Tone: ${buildToneInstruction(prefs.tone)}`);
  }

  if (prefs.personalizationLevel === 'high') {
    parts.push('Personalization: Use every available detail about the contact to make this deeply personal. Reference their specific role, company, industry, and any notes.');
  } else if (prefs.personalizationLevel === 'low') {
    parts.push('Personalization: Keep the message generic enough to work for similar contacts. Light personalization only.');
  }

  if (prefs.companyName) {
    parts.push(`You are writing on behalf of ${prefs.companyName}.`);
  }

  if (prefs.signature) {
    parts.push(`End the email with this signature: ${prefs.signature}`);
  }

  if (prefs.customInstructions) {
    parts.push(`Additional instructions: ${prefs.customInstructions}`);
  }

  return parts.length > 0 ? '\n\n' + parts.join('\n') : '';
}

function resolveModel(prefs, envDefault, envKey) {
  if (prefs.model) return prefs.model;
  return process.env[envKey] || envDefault;
}

function resolveTemperature(prefs, fallback) {
  if (prefs.temperature !== null) return prefs.temperature;
  return fallback;
}

function resolveMaxTokens(prefs, fallback) {
  if (prefs.maxTokens !== null) return prefs.maxTokens;
  return fallback;
}

module.exports = {
  extractPreferences,
  buildToneInstruction,
  buildPreferencesPromptBlock,
  resolveModel,
  resolveTemperature,
  resolveMaxTokens,
};
