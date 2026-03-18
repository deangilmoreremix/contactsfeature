const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { parseBody } = require('./_validation');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('gtm-prompt-library');

const GTM_BASE = 'https://gtm-skills.com/api/v1';

const CATEGORIES = [
  { id: 'outreach', label: 'Outreach', icon: '📧', description: 'Cold emails, follow-ups, social selling' },
  { id: 'discovery', label: 'Discovery', icon: '🔍', description: 'Research, qualification, meeting scheduling' },
  { id: 'negotiation', label: 'Negotiation', icon: '🤝', description: 'Objection handling, closing, concessions' },
  { id: 'proposal', label: 'Proposal', icon: '📄', description: 'Deals, proposals, pricing' },
  { id: 'expansion', label: 'Expansion', icon: '📈', description: 'Win-back, reactivation, upselling' },
  { id: 'intelligence', label: 'Intelligence', icon: '🧠', description: 'Competitive, revenue, content analysis' },
];

const ROLES = [
  { id: 'sdr', label: 'SDR', description: 'Sales Development Representative' },
  { id: 'ae', label: 'AE', description: 'Account Executive' },
  { id: 'csm', label: 'CSM', description: 'Customer Success Manager' },
];

const INDUSTRIES = [
  { id: 'saas', label: 'SaaS' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'real-estate', label: 'Real Estate' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'marketing', label: 'Marketing' },
];

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { action, industry, category, role, tags, limit = 20, offset = 0 } = body;

  try {
    switch (action) {
      case 'list':
        return await listPrompts({ industry, category, role, tags, limit, offset, user });
      case 'categories':
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ categories: CATEGORIES }) };
      case 'roles':
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ roles: ROLES }) };
      case 'industries':
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ industries: INDUSTRIES }) };
      case 'featured':
        return await getFeaturedPrompts({ user });
      case 'search':
        return await searchPrompts({ query: body.query, limit, user });
      default:
        return await listPrompts({ industry, category, role, tags, limit, offset, user });
    }
  } catch (error) {
    log.error('GTM prompt library error', { action, error: error.message });
    return errorResponse(500, 'Failed to fetch prompts');
  }
});

async function listPrompts({ industry, category, role, tags, limit, offset, user }) {
  const params = new URLSearchParams();
  if (industry) params.append('industry', industry);
  if (category) params.append('deal_stage', category);
  if (role) params.append('role', role);
  if (tags) params.append('tags', tags);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  let prompts = [];
  let gtmSuccess = false;

  try {
    const res = await fetch(`${GTM_BASE}/prompts?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      prompts = data.data || [];
      gtmSuccess = true;
    }
  } catch (err) {
    log.warn('GTM API unavailable, using fallback prompts');
  }

  if (!gtmSuccess || prompts.length === 0) {
    prompts = getFallbackPrompts({ industry, category, role, tags, limit });
  }

  const { data: customPrompts } = await supabase
    .from('custom_prompts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      prompts,
      customPrompts: customPrompts || [],
      categories: CATEGORIES,
      roles: ROLES,
      industries: INDUSTRIES,
      total: prompts.length,
      gtmConnected: gtmSuccess,
    }),
  };
}

async function getFeaturedPrompts({ user }) {
  const featured = [
    { id: 'featured-1', name: 'Cold Email Framework', category: 'outreach', role: 'sdr', prompt: 'Write a personalized cold email that:\n- Has an attention-grabbing subject line\n- Opens with something relevant to them\n- Clearly states value proposition\n- Includes soft CTA\n- Is under 150 words' },
    { id: 'featured-2', name: 'Discovery Questions', category: 'discovery', role: 'sdr', prompt: 'Generate 5 discovery questions to uncover:\n- Their current challenges\n- Budget and timeline\n- Decision-making process\n- Goals and objectives\n- Pain points' },
    { id: 'featured-3', name: 'Objection Handling', category: 'negotiation', role: 'sdr', prompt: 'Handle this objection professionally:\n- Acknowledge their concern\n- Provide social proof\n- Offer alternative perspective\n- Guide toward next step' },
    { id: 'featured-4', name: 'Follow-Up Sequence', category: 'outreach', role: 'sdr', prompt: 'Create a 3-step follow-up sequence:\n- First follow-up (2 days)\n- Second follow-up (5 days)\n- Final follow-up (10 days)\nEach with subject line and body' },
    { id: 'featured-5', name: 'Meeting Close', category: 'negotiation', role: 'sdr', prompt: 'Close the meeting with:\n- Recap key points\n- Confirm next steps\n- Set clear timeline\n- Confirm commitment' },
  ];

  const { data: customPrompts } = await supabase
    .from('custom_prompts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_featured', true)
    .limit(5);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      featured,
      customFeatured: customPrompts || [],
    }),
  };
}

async function searchPrompts({ query, limit, user }) {
  const { data: customPrompts } = await supabase
    .from('custom_prompts')
    .select('*')
    .eq('user_id', user.id)
    .ilike('name', `%${query}%`)
    .limit(limit);

  const fallbackPrompts = getFallbackPrompts({ tags: query, limit });

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      prompts: fallbackPrompts,
      customPrompts: customPrompts || [],
    }),
  };
}

function getFallbackPrompts({ industry, category, role, tags, limit = 20 }) {
  const allPrompts = [
    { id: 'fp-1', name: 'Cold Outreach Email', category: 'outreach', role: 'sdr', tags: ['cold-email', 'outreach'] },
    { id: 'fp-2', name: 'Follow-Up After No Response', category: 'outreach', role: 'sdr', tags: ['follow-up', 'nurture'] },
    { id: 'fp-3', name: 'LinkedIn Connection Request', category: 'outreach', role: 'sdr', tags: ['linkedin', 'social'] },
    { id: 'fp-4', name: 'Discovery Call Script', category: 'discovery', role: 'sdr', tags: ['discovery', 'qualification'] },
    { id: 'fp-5', name: 'Meeting Scheduler', category: 'discovery', role: 'sdr', tags: ['meeting', 'calendar'] },
    { id: 'fp-6', name: 'Handle Price Objection', category: 'negotiation', role: 'sdr', tags: ['objection', 'price'] },
    { id: 'fp-7', name: 'Handle Timing Objection', category: 'negotiation', role: 'sdr', tags: ['objection', 'timing'] },
    { id: 'fp-8', name: 'Close the Deal', category: 'negotiation', role: 'sdr', tags: ['closing', 'commitment'] },
    { id: 'fp-9', name: 'Win-Back Churned Customer', category: 'expansion', role: 'sdr', tags: ['winback', 'churn'] },
    { id: 'fp-10', name: 'Reactivation Email', category: 'expansion', role: 'sdr', tags: ['reactivation', 'dormant'] },
    { id: 'fp-11', name: 'Upsell Proposal', category: 'proposal', role: 'ae', tags: ['upsell', 'proposal'] },
    { id: 'fp-12', name: 'Competitive Response', category: 'intelligence', role: 'ae', tags: ['competitive', 'comparison'] },
    { id: 'fp-13', name: 'Value Proposition', category: 'outreach', role: 'sdr', tags: ['value', 'pitch'] },
    { id: 'fp-14', name: 'Case Study Email', category: 'outreach', role: 'sdr', tags: ['social-proof', 'case-study'] },
    { id: 'fp-15', name: 'Technical Discovery', category: 'discovery', role: 'sdr', tags: ['technical', 'discovery'] },
  ];

  let filtered = allPrompts;
  if (category) filtered = filtered.filter(p => p.category === category);
  if (role) filtered = filtered.filter(p => p.role === role);
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    filtered = filtered.filter(p => p.tags.some(t => tagList.includes(t)));
  }

  return filtered.slice(0, limit);
}
