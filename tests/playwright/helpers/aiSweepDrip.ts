/**
 * Dripping SSE server for the AI controls sweep. Every /.netlify/functions/<fn> request (proxied by `vite preview`)
 * gets a real, slowly delivered SSE stream (status / delta / partial / result / done, 150-300 ms apart, per
 * docs/STREAMING.md). It also keeps a request log (Accept header, parsed body.stream, query) so the spec can assert
 * what each control actually asked for, and GET /__log returns + clears it.
 */
import http from 'node:http';

type Ev = Record<string, unknown>;
export interface DripLogEntry { endpoint: string; method: string; accept: string; bodyStream: boolean; queryStream: boolean; wantsStream: boolean; bodyKeys: string[]; task?: string; at: number; endedAt: number | null; scripted: boolean }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TEXT = 'Here is a concrete, personalised answer that arrives piece by piece so the person can read it while the model is still working. It references the contact, the company and the next best step.';
const EMAIL_BODY = 'Hi Brooklyn, I noticed ACME Retail is expanding its operations team this quarter and thought a short ramp-up playbook could help your new managers get productive faster. Worth a quick chat this week?';

function chunks(text: string, n = 3): Ev[] {
  const w = text.split(' ');
  const out: Ev[] = [];
  for (let i = 0; i < w.length; i += n) out.push({ type: 'delta', text: w.slice(i, i + n).join(' ') + (i + n < w.length ? ' ' : '') });
  return out;
}
const started = (id: string): Ev => ({ type: 'status', phase: 'started', label: 'Thinking…', id });
const done = (id: string, text: string, json: unknown = null): Ev => ({ type: 'done', id, text, usage: null, citations: [], json });

/** partial objects that grow field by field, then result + done */
function growing(obj: Record<string, unknown>, result: unknown, id: string): Ev[] {
  const evs: Ev[] = [started(id)];
  const acc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) && v.length > 1) {
      for (let i = 1; i < v.length; i += 1) { acc[k] = v.slice(0, i); evs.push({ type: 'partial', json: { ...acc } }); }
    }
    if (typeof v === 'string' && v.length > 40) {
      acc[k] = v.slice(0, Math.floor(v.length / 3)); evs.push({ type: 'partial', json: { ...acc } });
      acc[k] = v.slice(0, Math.floor((v.length * 2) / 3)); evs.push({ type: 'partial', json: { ...acc } });
    }
    acc[k] = v; evs.push({ type: 'partial', json: { ...acc } });
  }
  if (result !== undefined) evs.push({ type: 'result', data: result });
  evs.push(done(id, JSON.stringify(obj), obj));
  return evs;
}

/** an instance of a JSON schema (strings are long enough to be streamed in pieces) */
function synth(schema: any, key = '', depth = 0): unknown {
  const sc = schema?.schema ?? schema;
  if (!sc || depth > 5) return null;
  if (Array.isArray(sc.enum)) return sc.enum[0];
  const t = Array.isArray(sc.type) ? sc.type.find((x: string) => x !== 'null') : sc.type;
  if (t === 'object' || sc.properties) {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries<any>(sc.properties ?? {})) o[k] = synth(v, k, depth + 1);
    return o;
  }
  if (t === 'array') return [synth(sc.items, key, depth + 1), synth(sc.items, key, depth + 1)];
  if (t === 'number' || t === 'integer') return 72;
  if (t === 'boolean') return true;
  if (key === 'type') return 'opportunity';
  if (key === 'category') return 'Growth';
  return /subject|title|name|label|headline/i.test(key) ? `A clear ${key || 'title'} for ACME Retail` : `${LONG} (${key || 'text'})`;
}

/** text answer: status, deltas, result, done */
function texty(id: string, text: string, result: unknown): Ev[] {
  return [started(id), { type: 'status', phase: 'working', label: 'Writing…' }, ...chunks(text), { type: 'result', data: result }, done(id, text)];
}

const COLD = { contactId: 'c1', subject: 'Quick idea for ACME Retail', body: EMAIL_BODY, sent: false };
const INSIGHTS = [
  { type: 'opportunity', title: 'Expansion window at ACME Retail', description: 'ACME posted three new operations roles this quarter.', confidence: 82, impact: 'high', category: 'Growth', actionable: true, suggestedActions: ['Reference the hiring plan'], dataPoints: [] },
  { type: 'risk', title: 'Budget freeze rumour', description: 'A recent article mentions delayed purchasing.', confidence: 64, impact: 'medium', category: 'Risk', actionable: false, suggestedActions: [], dataPoints: [] },
  { type: 'recommendation', title: 'Multi-thread the deal', description: 'Only one contact is engaged at ACME.', confidence: 77, impact: 'medium', category: 'Strategy', actionable: true, suggestedActions: ['Ask for an intro to RevOps'], dataPoints: [] },
];
const HEALTH = {
  healthScore: 72, riskLevel: 'medium',
  indicators: [{ name: 'Momentum', score: 64, status: 'warning', rationale: 'Last update 30 days ago.' }, { name: 'Engagement', score: 81, status: 'good', rationale: 'Replied within two days.' }],
  risks: [], recommendations: ['Send a short recap email today', 'Book a stakeholder call this week'], nextActions: [{ action: 'Share the ROI one-pager', priority: 'high', timeline: 'This week' }], dataGaps: ['Budget owner unknown'],
};
const ENRICH = {
  matched: true, confidence: 91, summary: 'Brooklyn Simmons is Retail Operations Manager at ACME Retail, a mid-size retailer.',
  profile: { jobTitle: 'Retail Operations Manager', company: 'ACME Retail', industry: 'Retail', location: null, bio: null, website: 'https://acme.example', linkedinUrl: null, twitterUrl: null, instagramUrl: null, facebookUrl: null, businessPhone: null },
  company: { name: 'ACME Retail', website: 'https://acme.example', description: null, industry: 'Retail', sizeEstimate: null, headquarters: null },
  recentNews: [{ headline: 'ACME Retail opens 12 stores', url: 'https://news.example.com/acme', date: null }],
  talkingPoints: ['Store expansion needs ops tooling', 'Hiring three managers'],
  evidence: [{ field: 'jobTitle', value: 'Retail Operations Manager', sourceUrl: 'https://acme.example/team' }], warnings: [],
};
const EMAIL = { subject: 'Following up on our call', body: EMAIL_BODY, purpose: 'follow_up', tone: 'professional', model: 'gpt-test' };
const ANALYSIS = { metrics: { wordCount: 30 }, toneAnalysis: {}, dominantTone: 'professional', qualityScore: 81, responseLikelihood: 64, improvements: [], assessment: 'Clear and concise with one strong call to action.', confidence: 80, model: 'gpt-test', analyzedAt: new Date().toISOString() };

const person = (n: number, first: string, last: string, title: string, company: string, industry: string) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, firstName: first, lastName: last, name: `${first} ${last}`, email: `${first.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com`, phone: '+1 555 6723',
  title, company, industry, interestLevel: 'medium', status: 'prospect', sources: ['Email'], tags: [], isFavorite: false, notes: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
});
/** rows returned for /rest/v1/contacts (the fake Supabase) */
/** one open deal for the first contact so DealHealthPanel offers "Run Health Analysis" */
const DEALS = [{
  id: '00000000-0000-4000-8000-0000000000d1', user_id: 'user-1', contact_id: '00000000-0000-4000-8000-000000000001', title: 'ACME Retail rollout', stage: 'proposal', value: 42000,
  risk_score: null, objection_level: 2, stage_stagnation: 9, days_since_reply: 6, expected_close_date: null, closed_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-05T00:00:00Z',
}];
const CONTACTS = [
  person(1, 'Brooklyn', 'Simmons', 'Retail Operations Manager', 'ACME Retail', 'Retail'),
  person(2, 'Cameron', 'Williamson', 'VP of Sales', 'Northwind Traders', 'Software'),
  person(3, 'Darlene', 'Robertson', 'Head of Growth', 'Globex Corporation', 'Media'),
];

/**
 * What gpt51ResponsesService.analyzeProductIntelligence parses out of `output_text` (parseJsonLoose): an object with
 * company / product / market / contacts / recommendations, shaped like src/types/productIntelligence.ts so the results
 * step (ProductIntelligenceResults) renders. The plain-text ai-stream answer is not JSON, which made the analysis throw.
 */
const PRODUCT_INTELLIGENCE = {
  company: { name: 'ACME Retail', industry: 'Retail software', size: '200-500 employees', founded: 2012, location: 'Austin, TX', description: 'ACME Retail builds store operations software for regional chains.', website: 'https://acme.example', socialProfiles: { linkedin: 'https://linkedin.com/company/acme-retail' } },
  product: { name: 'ACME Ops Cloud', category: 'Retail operations platform', pricing: { model: 'subscription', ranges: { min: 99, max: 499, currency: 'USD' }, examples: ['Starter $99/mo', 'Scale $499/mo'] }, features: ['Shift scheduling', 'Store task manager', 'Manager ramp-up playbooks'], targetMarket: 'Regional retail chains with 10+ stores', competitiveAdvantages: ['Fast setup', 'Built for store managers'], useCases: ['Onboard new managers', 'Standardise store checklists'] },
  market: { size: '$12B', growth: '9% CAGR', competitors: ['RivalCo', 'StoreSync'], trends: ['Frontline digitisation'], opportunities: ['Mid-market chains'], threats: ['Large suite vendors'] },
  contacts: [{ name: 'Brooklyn Simmons', title: 'Retail Operations Manager', email: 'brooklyn@acme.example', linkedin: 'https://linkedin.com/in/example', confidence: 88, role: 'decision-maker' }],
  recommendations: ['Lead with manager ramp-up time', 'Reference the twelve new stores'],
};
const PRODUCT_INTELLIGENCE_TEXT = JSON.stringify(PRODUCT_INTELLIGENCE);

type Script = (body: any, url: URL) => Ev[];
const LONG = 'A specific, personalised line that references the contact, the company and a recent trigger so the reader sees why this message is for them and what the next step is.';
/** the 8 Agents-SDK SDR agents: field keys come from src/components/sdr/<Agent>SDRAgent.tsx */
const agentScript = (id: string, extra: Record<string, unknown>): Script => () => growing({ ...extra }, { ...extra }, id);
const SCRIPTS: Record<string, Script> = {
  'ai-stream': (body) => {
    if (body?.schema) { const o = synth(body.schema) as Record<string, unknown>; return growing(o, undefined, 'r_ai'); }
    if (typeof body?.input === 'string' && /provide structured intelligence/i.test(body.input)) {
      return [started('r_ai'), { type: 'status', tool: 'web_search', phase: 'searching', label: 'Searching the web…' }, ...chunks(PRODUCT_INTELLIGENCE_TEXT, 12), done('r_ai', PRODUCT_INTELLIGENCE_TEXT)];
    }
    return [started('r_ai'), { type: 'status', tool: 'web_search', phase: 'searching', label: 'Searching the web…' }, ...chunks(TEXT), done('r_ai', TEXT)];
  },
  'linkedin-sdr': agentScript('r_li', { connectionNote: LONG, followUpMessage: LONG + ' Happy to share a short example if useful.', talkingPoints: ['Store expansion', 'Ops hiring'] }),
  'whatsapp-sdr': agentScript('r_wa', { message: LONG, templateSuggestion: 'Hi {{1}}, quick question about {{2}}. Worth a chat this week?', optInReminder: 'Only message contacts who opted in to WhatsApp.' }),
  'event-based-sdr': agentScript('r_ev', { trigger: 'ACME Retail opened twelve new stores this month and is hiring managers.', eventSources: ['https://news.example.com/acme'], subject: 'Congrats on the new stores', body: EMAIL_BODY }),
  'referral-sdr': agentScript('r_rf', { subject: 'Could you introduce me?', body: EMAIL_BODY, forwardableBlurb: LONG, idealIntroProfile: 'Head of retail operations at a regional chain with 10+ stores.' }),
  'newsletter-sdr': agentScript('r_nl', { subject: 'Our retail ops newsletter', preheader: 'Three ideas to ramp new store managers faster', body: EMAIL_BODY, cta: 'Read this month\'s issue' }),
  'high-intent-sdr': agentScript('r_hi', { urgency: 'high', intentSignals: ['Visited pricing twice', 'Asked about onboarding'], subject: 'Saw you looking at pricing', body: EMAIL_BODY, suggestedNextAction: 'Call within the hour' }),
  'data-enrichment-sdr': agentScript('r_de', { summary: 'Brooklyn Simmons is Retail Operations Manager at ACME Retail, a mid-size retailer with a growing store footprint.', title: 'Retail Operations Manager', company: 'ACME Retail', industry: 'Retail', companySize: '200-500', linkedinUrl: 'https://linkedin.com/in/example', websiteUrl: 'https://acme.example', confidence: 'high', evidence: ['Company site team page', 'Recent news article'] }),
  'competitor-aware-sdr': agentScript('r_ca', { competitor: 'RivalCo', differentiators: ['Faster setup', 'Lower price'], sources: ['https://rival.example'], subject: 'A different take on retail ops', body: EMAIL_BODY, battlecard: LONG + ' Lead with setup speed.' }),
  'cold-email-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'follow-up-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'objection-handler-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'reactivation-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'win-back-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'discovery-sdr': () => growing(COLD, { ...COLD }, 'r_sdr'),
  'email-composer': () => growing({ subject: EMAIL.subject, body: EMAIL.body }, EMAIL, 'r_ec'),
  'email-analyzer': () => growing({ assessment: ANALYSIS.assessment, qualityScore: 81 }, ANALYSIS, 'r_ea'),
  'deal-health-analysis': () => [started('r_h'), { type: 'partial', json: { healthScore: 72 } }, { type: 'partial', json: { healthScore: 72, riskLevel: 'medium', indicators: [HEALTH.indicators[0]] } },
    { type: 'partial', json: { healthScore: 72, riskLevel: 'medium', indicators: HEALTH.indicators, recommendations: [HEALTH.recommendations[0]] } }, { type: 'partial', json: HEALTH },
    { type: 'result', data: { success: true, data: HEALTH, facts: {}, analyzedAt: new Date().toISOString() } }, done('r_h', JSON.stringify(HEALTH), HEALTH)],
  'contact-enrich': () => {
    const d = { status: 'completed', persisted: false, result: ENRICH, citations: [{ url: 'https://acme.example/team', title: 'Team page' }], sources: [], suggestedUpdates: { title: 'Retail Operations Manager', industry: 'Retail' } };
    return [started('r_e'), { type: 'status', tool: 'web_search', phase: 'searching', label: 'Searching the web…' },
      { type: 'partial', json: { matched: true, confidence: 91, summary: 'Brooklyn Simmons is Retail Operations Manager' } },
      { type: 'partial', json: { ...ENRICH, talkingPoints: [ENRICH.talkingPoints[0]] } }, { type: 'partial', json: ENRICH },
      { type: 'result', data: d }, done('r_e', JSON.stringify(ENRICH), ENRICH)];
  },
  'sales-forecasting': () => {
    const F = { projectedWonNext90Days: { low: 40000, expected: 65000, high: 90000 }, confidence: 'medium', insights: ['Win rate is steady', 'Two proposals close soon'], risks: [], recommendedActions: ['Follow up on open proposals'], caveats: ['Few closed deals'] };
    return [started('r_f'), { type: 'partial', json: { projectedWonNext90Days: { low: 40000 } } }, { type: 'partial', json: F }, { type: 'result', data: { success: true, data: { stats: {}, forecast: F, reason: null } } }, done('r_f', JSON.stringify(F), F)];
  },
  'lead-nurturing': () => {
    const N = { nurtureSequence: [{ week: 1, theme: 'Welcome' }, { week: 2, theme: 'Case study' }], contentCalendar: [{ date: '2026-12-01', content: 'Intro email', channel: 'email', purpose: 'awareness' }], engagementTriggers: ['opened email'], successMetrics: ['reply rate'], personalizationStrategy: 'Lead with hiring news and the ramp-up playbook for new managers' };
    return growing(N, { success: true, data: N }, 'r_ln');
  },
  'generate-with-prompt': () => texty('r_gtm', TEXT, { content: TEXT }),
  'run-agent': () => texty('r_ra', TEXT, { success: true, step: 2 }),
};

/** Same for Netlify (`/.netlify/functions/x`, proxied) and Supabase edge (`/functions/v1/x`) functions. */
export function startAiSweepDrip(port: number): Promise<http.Server & { log: DripLogEntry[] }> {
  const log: DripLogEntry[] = [];
  const gap = () => sleep(150 + Math.random() * 150);

  async function play(res: http.ServerResponse, events: Ev[]) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    let seq = 0;
    let closed = false;
    res.on('close', () => { closed = true; });
    for (const e of events) {
      await gap();
      if (closed) return;
      res.write(`id: ${seq}\ndata: ${JSON.stringify({ ...e, seq })}\n\n`);
      seq += 1;
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }); res.end(); return; }
    const u = new URL(req.url || '/', 'http://x');
    if (u.pathname === '/__log') {
      const out = u.searchParams.get('peek') ? [...log] : log.splice(0, log.length);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(out));
      return;
    }
    // ---- Supabase stand-in (VITE_SUPABASE_URL points at this server): signed-in user, empty tables, edge functions below
    if (u.pathname.startsWith('/auth/v1/user')) { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify({ id: 'user-1', aud: 'authenticated', email: 'me@example.com' })); return; }
    if (u.pathname.startsWith('/rest/v1/')) {
      for await (const _c of req) { /* drain */ }
      const isContacts = u.pathname === '/rest/v1/contacts' && req.method === 'GET';
      const isDeals = u.pathname === '/rest/v1/deals' && req.method === 'GET';
      const rows: unknown[] = isContacts ? CONTACTS : isDeals ? DEALS : [];
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Range', 'Content-Range': rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0' });
      res.end(JSON.stringify(rows));
      return;
    }
    let raw = '';
    for await (const c of req) raw += c;
    let body: any = {};
    try { body = JSON.parse(raw || '{}'); } catch { /* ignore */ }
    const m = /\/(?:\.netlify\/functions|functions\/v1)\/([a-z0-9-]+)/.exec(u.pathname);
    if (!m) { res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify({ error: `not a function: ${u.pathname}` })); return; }
    const endpoint = m[1]!;
    const accept = String(req.headers['accept'] || '');
    const bodyStream = body?.stream === true;
    const queryStream = u.searchParams.get('stream') === 'true';
    const script = SCRIPTS[endpoint];
    log.push({ endpoint, method: req.method || '', accept, bodyStream, queryStream, wantsStream: /text\/event-stream/i.test(accept) || bodyStream || queryStream, bodyKeys: Object.keys(body || {}), task: body?.task, at: Date.now(), endedAt: null, scripted: !!script });
    const entry = log[log.length - 1]!;
    res.on('close', () => { entry.endedAt = Date.now(); });
    const id = `r_${endpoint}`;
    if (endpoint === 'ai-respond') {
      // the plain-JSON twin of ai-stream: one JSON document, no SSE (what a non-streaming caller gets)
      const o = body?.schema ? synth(body.schema) : null;
      await sleep(400);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ id, text: o ? JSON.stringify(o) : TEXT, json: o, citations: [], usage: null }));
      return;
    }
    if (script) return play(res, script(body, u));
    // generic: streams for any endpoint without a dedicated script
    const obj = { text: TEXT, summary: TEXT };
    return play(res, [...texty(id, TEXT, { success: true, data: obj, content: TEXT, text: TEXT }).slice(0, -1), { type: 'partial', json: obj }, done(id, TEXT, obj)]);
  });
  const s = server as http.Server & { log: DripLogEntry[] };
  s.log = log;
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(s)));
}
