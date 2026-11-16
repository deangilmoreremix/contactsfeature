/**
 * Dripping SSE server for the panel-endpoint specs: events 150-300 ms apart, like the real Netlify functions,
 * so Playwright can assert that the DOM grows WHILE the answer is produced. The Vite harness proxies
 * /.netlify/functions/* here.
 */
import http from 'node:http';

type Ev = Record<string, unknown>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const REPLY = 'Thanks for being upfront about budget, Ada. Many teams start smaller than they end up. Let us run a four week pilot on one team, measure the time saved, and use that number to decide the full rollout together.';
const SKILLS = [
  { id: 'negotiation', description: 'Handles negotiating price, value, and objections.' },
  { id: 'budget_objection', description: "Responds when a prospect says they don't have budget." },
  { id: 'competitor_intel', description: 'Provides competitive positioning insight against typical CRM / sales tools.' },
  { id: 'research', description: 'Performs quick prospect or market research.' },
  { id: 'follow_up', description: 'Generates a follow-up email or message to re-engage a prospect.' },
  { id: 'risk_analysis', description: 'Analyzes risk of a deal based on context.' },
];
const BRIEF = {
  summary: 'Ada prefers short emails and has already received pricing. She asked for a pilot and has not rejected any offer so far.',
  key_facts: ['Pricing sent on March 30', 'Prefers brief emails', 'Interested in a four week pilot'],
  preferences: ['Short emails', 'Morning calls'],
  avoid: ['Annual prepay discounts'],
};
const MEMORY = {
  contactId: '22222222-2222-2222-2222-222222222222', total: 2,
  memory: {
    short: [{ id: 'm1', memory_type: 'short', data: { last_message: 'Sent pricing', last_agent: 'sdr' }, updated_at: '2026-03-30T10:00:00Z' }],
    mid: [{ id: 'm2', memory_type: 'mid', data: { tone_preferences: ['brief'] }, updated_at: '2026-03-29T10:00:00Z' }],
    long: [],
  },
  brief: BRIEF,
};
const DEALS = [
  { deal_id: 'aaaaaaaa-0000-4000-8000-000000000001', title: 'Acme expansion', stage: 'proposal', value: 12000, contact_name: 'Ada Lovelace', risk_score: 78, reason: 'Silent for 12 days while the proposal is open.', next_action: 'Call Ada and ask who signs.', assessed: true, factors: { days_since_reply: 12 }, baseline_score: 52 },
  { deal_id: 'bbbbbbbb-0000-4000-8000-000000000002', title: 'Beta pilot', stage: 'discovery', value: 3000, contact_name: 'Bo Chen', risk_score: 41, reason: 'Two objections logged, no next meeting.', next_action: 'Book the technical demo.', assessed: true, factors: { objection_level: 4 }, baseline_score: 33 },
  { deal_id: 'cccccccc-0000-4000-8000-000000000003', title: 'Gamma renewal', stage: 'negotiation', value: 8000, contact_name: 'Cy Diaz', risk_score: 18, reason: 'Replied yesterday and agreed the scope.', next_action: 'Send the order form.', assessed: true, factors: { days_since_reply: 1 }, baseline_score: 6 },
];

export function startDripPanels(port: number): Promise<http.Server> {
  async function play(res: http.ServerResponse, events: Ev[]) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    let seq = 0;
    for (const e of events) {
      await sleep(150 + Math.random() * 150);
      res.write(`id: ${seq}\ndata: ${JSON.stringify({ ...e, seq })}\n\n`);
      seq += 1;
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }
  const json = (res: http.ServerResponse, data: unknown, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
  };

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); res.end(); return; }
    let raw = '';
    for await (const c of req) raw += c;
    let body: any = {};
    try { body = JSON.parse(raw || '{}'); } catch { /* ignore */ }
    const url = req.url || '';

    if (url.includes('/skills-api')) {
      if (body.action === 'list') return json(res, { skills: SKILLS });
      const words = REPLY.split(' ');
      const deltas: Ev[] = [];
      for (let i = 0; i < words.length; i += 4) deltas.push({ type: 'delta', text: `${words.slice(i, i + 4).join(' ')} ` });
      const payload = { skillId: body.skillId, contactId: body.contactId, dealId: null, result: REPLY, citations: [] };
      return play(res, [{ type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_s' }, ...deltas, { type: 'result', data: payload }, { type: 'done', id: 'resp_s', text: REPLY, usage: null, citations: [] }]);
    }

    if (url.includes('/memory-get')) {
      const partials: Ev[] = [];
      const grow = (s: string) => { for (let i = 20; i < s.length + 20; i += 20) partials.push({ type: 'partial', json: { summary: s.slice(0, Math.min(i, s.length)) } }); };
      grow(BRIEF.summary);
      partials.push({ type: 'partial', json: { summary: BRIEF.summary, key_facts: BRIEF.key_facts.slice(0, 1) } });
      partials.push({ type: 'partial', json: { summary: BRIEF.summary, key_facts: BRIEF.key_facts, preferences: BRIEF.preferences } });
      return play(res, [{ type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_m' }, ...partials, { type: 'result', data: MEMORY }, { type: 'done', id: 'resp_m', text: '', usage: null, citations: [] }]);
    }

    if (url.includes('/deal-heatmap')) {
      const partials: Ev[] = [{ type: 'partial', json: { summary: 'Acme is the deal to rescue this week.' } }];
      const done: Record<string, unknown>[] = [];
      for (const d of DEALS) {
        const base = { deal_id: d.deal_id, risk_score: d.risk_score };
        partials.push({ type: 'partial', json: { summary: 'Acme is the deal to rescue this week.', deals: [...done, base] } });
        partials.push({ type: 'partial', json: { summary: 'Acme is the deal to rescue this week.', deals: [...done, { ...base, reason: d.reason }] } });
        done.push({ ...base, reason: d.reason, next_action: d.next_action });
        partials.push({ type: 'partial', json: { summary: 'Acme is the deal to rescue this week.', deals: [...done] } });
      }
      const payload = { mode: 'portfolio', summary: 'Acme is the deal to rescue this week.', deals: DEALS };
      return play(res, [{ type: 'status', phase: 'started', label: 'Thinking…', id: 'resp_h' }, ...partials, { type: 'result', data: payload }, { type: 'done', id: 'resp_h', text: '', usage: null, citations: [] }]);
    }

    return json(res, { error: 'not found' }, 404);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}
