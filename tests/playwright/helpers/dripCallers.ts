/**
 * Dripping SSE server for the "direct UI caller" specs (SDRPersonaSelector, AutopilotControlPanel, GTMPromptHub,
 * useEmailAI, lead nurturing, feature analysis, deal AI). It plays the role of BOTH the Netlify functions (proxied by
 * Vite at /.netlify/functions) and Supabase (VITE_SUPABASE_URL points here: /auth, /rest, /functions/v1/*).
 * Events are 150-300 ms apart so the DOM can be sampled while the answer is produced.
 */
import http from 'node:http';

type Ev = Record<string, unknown>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const words = (s: string) => s.split(' ');
/** Text split into growing delta events (3 words each). */
function deltas(text: string): Ev[] {
  const w = words(text);
  const out: Ev[] = [];
  for (let i = 0; i < w.length; i += 3) out.push({ type: 'delta', text: w.slice(i, i + 3).join(' ') + (i + 3 < w.length ? ' ' : '') });
  return out;
}
const done = (id: string, text: string, json: unknown = null): Ev => ({ type: 'done', id, text, usage: null, citations: [], json });
const started = (id: string): Ev => ({ type: 'status', phase: 'started', label: 'Thinking…', id });

const COLD = { contactId: 'c1', subject: 'Quick idea for Acme Corp', body: 'Hi Ada, I noticed Acme is hiring three account executives this quarter and thought a short ramp-up playbook could help your new reps close faster. Worth a quick chat this week?', sent: false };
const EMAIL = { subject: 'Following up on our call', body: 'Hi Ada, thanks for the time yesterday. Attached is the ROI one-pager we discussed, and I would love to schedule a short follow-up to walk through the numbers together.', purpose: 'follow_up', tone: 'professional', model: 'gpt-test' };
const ANALYSIS = { metrics: { wordCount: 30 }, toneAnalysis: {}, dominantTone: 'professional', qualityScore: 81, responseLikelihood: 64, improvements: [], assessment: 'Clear and concise with one strong call to action.', confidence: 80, model: 'gpt-test', analyzedAt: new Date().toISOString() };
const NURTURE = { nurtureSequence: [{ week: 1, theme: 'Welcome' }, { week: 2, theme: 'Case study' }], contentCalendar: [{ date: '2026-12-01', content: 'Intro email', channel: 'email', purpose: 'awareness' }], engagementTriggers: ['opened email'], successMetrics: ['reply rate'], personalizationStrategy: 'Lead with hiring news' };
const FEATURE = { analysis: { productName: 'Acme CRM', analysis: { summary: 'Acme CRM is a pipeline tool for small sales teams with strong email automation.', keyFeatures: [{ name: 'Email automation', description: 'Sequences', competitiveAdvantage: 'Fast setup', marketPosition: 'challenger', adoptionRate: 0.4 }], competitiveLandscape: { directCompetitors: [{ name: 'RivalCo', strengths: ['Brand'], weaknesses: ['Price'], marketShare: 12 }], indirectCompetitors: [], marketGaps: ['SMB onboarding'] }, marketInsights: { totalAddressableMarket: '$5B', serviceableAvailableMarket: '$1B', serviceableObtainableMarket: '$100M', growthRate: 0.12, keyTrends: ['AI assist'] }, recommendations: [{ type: 'positioning', priority: 'high', recommendation: 'Lead with setup speed', rationale: 'Top complaint about rivals', expectedImpact: 'Higher trial conversion' }] }, sources: [] } };
const DEAL_TEXT = 'Day one send a short intro email mentioning the proposal. Day three follow up with the ROI one-pager. Day seven offer a call with your champion to unblock budget.';
const GTM_TEXT = 'Subject: Three ideas for Acme Corp. Hi Ada, here are three concrete ways your team could shorten the sales cycle this quarter, starting with a lighter proposal template.';

export function startDripCallers(port: number): Promise<http.Server> {
  const gap = () => sleep(150 + Math.random() * 150);
  async function play(res: http.ServerResponse, events: Ev[]) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' });
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
  const json = (res: http.ServerResponse, data: unknown, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Content-Range': '0-0/*' });
    res.end(JSON.stringify(data));
  };

  /** partial objects that grow field by field, then result + done */
  const growing = (obj: Record<string, unknown>, result: unknown, id: string): Ev[] => {
    const evs: Ev[] = [started(id)];
    const acc: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.length > 40) {
        acc[k] = v.slice(0, Math.floor(v.length / 3)); evs.push({ type: 'partial', json: { ...acc } });
        acc[k] = v.slice(0, Math.floor((v.length * 2) / 3)); evs.push({ type: 'partial', json: { ...acc } });
      }
      acc[k] = v; evs.push({ type: 'partial', json: { ...acc } });
    }
    evs.push({ type: 'result', data: result }, done(id, JSON.stringify(obj), obj));
    return evs;
  };

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }); res.end(); return; }
    let raw = '';
    for await (const c of req) raw += c;
    let body: any = {};
    try { body = JSON.parse(raw || '{}'); } catch { /* ignore */ }
    const url = (req.url || '').split('?')[0]!;

    // ---- Supabase stand-in
    if (url.startsWith('/auth/v1/user')) return json(res, { id: 'user-1', email: 'me@example.com' });
    if (url.startsWith('/rest/v1/')) return json(res, []);
    if (url.endsWith('/gtm-prompt-library')) return json(res, { prompts: [{ id: 'p1', name: 'Cold Opener Prompt', category: 'outreach', role: 'sdr', prompt: 'Write a cold opener for the contact.' }] });
    if (url.endsWith('/functions/v1/email-composer')) return play(res, growing({ subject: EMAIL.subject, body: EMAIL.body }, EMAIL, 'r_ec'));
    if (url.endsWith('/functions/v1/email-analyzer')) return play(res, growing({ assessment: ANALYSIS.assessment, qualityScore: 81 }, ANALYSIS, 'r_ea'));
    if (url.endsWith('/functions/v1/execute-deal-ai')) return play(res, [started('r_deal'), ...deltas(DEAL_TEXT), { type: 'result', data: { result: DEAL_TEXT } }, done('r_deal', DEAL_TEXT)]);

    // ---- Netlify functions
    if (/\/(cold-email|follow-up|reactivation|win-back|discovery)-sdr$/.test(url)) return play(res, growing(COLD, { ...COLD, personaId: body.personaId }, 'r_sdr'));
    if (url.endsWith('/run-agent')) {
      const t = 'Step two drafted: a short follow-up referencing the proposal and asking for a ten minute call.';
      return play(res, [started('r_ra'), { type: 'status', phase: 'working', label: 'Drafting the next step…' }, ...deltas(t), { type: 'result', data: { success: true, step: 2 } }, done('r_ra', t)]);
    }
    if (url.endsWith('/get-autopilot-status')) return json(res, { contact: { id: 'x', name: 'Ada', email: 'a@b.c', company: 'Acme', lead_status: 'lead' }, settings: { autopilot_enabled: true, current_step: 2, sequence_length: 5 }, lastLog: null });
    if (url.endsWith('/generate-with-prompt')) return play(res, [started('r_gtm'), ...deltas(GTM_TEXT), { type: 'result', data: { content: GTM_TEXT } }, done('r_gtm', GTM_TEXT)]);
    if (url.endsWith('/lead-nurturing')) return play(res, growing(NURTURE as never, { success: true, data: NURTURE }, 'r_ln'));
    if (url.endsWith('/ai-task')) {
      if (body.task === 'feature-analysis') {
        const flat = { productName: 'Acme CRM', summary: FEATURE.analysis.analysis.summary, keyFeatures: FEATURE.analysis.analysis.keyFeatures, directCompetitors: FEATURE.analysis.analysis.competitiveLandscape.directCompetitors, marketGaps: ['SMB onboarding'] };
        const evs = growing(flat as never, { success: true, task: 'feature-analysis', data: FEATURE }, 'r_fa');
        evs.splice(1, 0, { type: 'status', tool: 'web_search', phase: 'searching', label: 'Searching the web…' });
        return play(res, evs);
      }
      if (body.task === 'personalized-messages') {
        const msg = { subject: null, message: 'Hi Ada, congratulations on the Series B. I help sales teams ramp new reps quickly and would love to share how. Open to a quick chat?', personalizationNotes: ['Series B'] };
        return play(res, growing(msg as never, { success: true, task: 'personalized-messages', model: 'gpt-test', data: { ...msg, channel: body.params?.channel, generatedAt: new Date().toISOString(), contactId: null } }, 'r_pm'));
      }
    }
    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: `no drip script for ${url}` }));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}
