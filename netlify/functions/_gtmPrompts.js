const GTM_BASE = 'https://gtm-skills.com/api/v1';

const FUNCTION_CONFIG = {
  'cold-email-sdr':      { stage: 'outreach', role: 'sdr', tags: 'cold-email' },
  'follow-up-sdr':       { stage: 'outreach', role: 'sdr', tags: 'follow-up' },
  'discovery-sdr':       { stage: 'discovery', role: 'sdr', tags: 'discovery' },
  'objection-handler-sdr':{ stage: 'negotiation', role: 'sdr', tags: 'objection' },
  'win-back-sdr':        { stage: 'expansion', role: 'sdr', tags: 'winback' },
  'reactivation-sdr':     { stage: 'expansion', role: 'sdr', tags: 'reactivation' },
};

async function getGTMPrompt(functionName, industry = 'saas') {
  const config = FUNCTION_CONFIG[functionName];
  if (!config) return null;
  
  try {
    const res = await fetch(
      `${GTM_BASE}/prompts/recommend?industry=${industry || 'saas'}&deal_stage=${config.stage}&role=${config.role}&limit=1`,
      { 
        headers: { 'Content-Type': 'application/json' }, 
        signal: AbortSignal.timeout(3000)
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.prompt || null;
  } catch {
    return null;
  }
}

async function getGTMPromptsByTag(tag, industry = 'saas', limit = 3) {
  try {
    const res = await fetch(
      `${GTM_BASE}/prompts?industry=${industry || 'saas'}&tags=${tag}&limit=${limit}`,
      { 
        headers: { 'Content-Type': 'application/json' }, 
        signal: AbortSignal.timeout(3000)
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

module.exports = { getGTMPrompt, getGTMPromptsByTag, FUNCTION_CONFIG };
