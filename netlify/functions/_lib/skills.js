/**
 * CommonJS port of lib/skills/* — the six agent skills. Prompts are byte-for-byte the originals (a test compares them);
 * the model call itself goes through the streaming Responses helper instead of callOpenAI.
 *   mode 'text'  -> prose reply streamed as it is written
 *   mode 'json'  -> strict schema, structured result
 */
const j = (v) => JSON.stringify(v, null, 2);

const SKILLS = {
  negotiation: {
    id: 'negotiation',
    description: 'Handles negotiating price, value, and objections.',
    mode: 'text', role: 'default', outbound: true,
    prompt: ({ contact, deal, extra }) => `
You are a senior sales negotiator.

Contact:
${j(contact)}

Deal:
${j(deal)}

Context:
${j(extra ?? {})}

Task:
- Respond to a pricing/value objection.
- Emphasize ROI and outcomes.
- Stay respectful and confident.
Return your suggested reply in natural language.
    `,
  },

  budget_objection: {
    id: 'budget_objection',
    description: "Responds when a prospect says they don't have budget.",
    mode: 'text', role: 'default', outbound: true,
    prompt: ({ contact, deal, lastMessage }) => `
The prospect has raised a **budget objection**.

Last message from prospect:
${lastMessage || '(no specific message provided)'}

Contact:
${j(contact)}

Deal:
${j(deal)}

Task:
- Acknowledge their concern.
- Reframe value vs. cost.
- Offer a path forward (e.g. phased rollout, smaller pilot, or ROI framing).
Return your reply email/message only.
    `,
  },

  competitor_intel: {
    id: 'competitor_intel',
    description: 'Provides competitive positioning insight against typical CRM / sales tools.',
    mode: 'text', role: 'thinking', effort: 'low', tools: [{ type: 'web_search' }], sources: true,
    prompt: ({ contact, extra }) => {
      const market = (extra && extra.market) || (contact && contact.company) || 'B2B SMB sales';
      return `
You are a market researcher.

Market or company:
${market}

Task:
- Identify typical competing solutions or categories.
- Explain how our solution (SmartCRM-style AI OS) can be positioned competitively.
- Focus on benefits like automation, AI assistance, and reduced tool sprawl.
- Base claims on web sources; say plainly when information could not be found.

Return a concise summary with bullet points.
    `;
    },
  },

  research: {
    id: 'research',
    description: 'Performs quick prospect or market research.',
    mode: 'text', role: 'thinking', effort: 'low', tools: [{ type: 'web_search' }], sources: true,
    prompt: ({ contact, extra }) => {
      const subject = (extra && extra.subject) || (contact && contact.company) || (contact && contact.email) || 'this prospect';
      return `
Do a **quick research summary** about:

${subject}

Task:
- Give 3–5 key insights.
- Include 2–3 potential pain points.
- Include 2–3 potential opportunities our solution might solve.
- Base claims on web sources; say plainly when information could not be found.

Keep it short and skimmable in bullet points.
    `;
    },
  },

  follow_up: {
    id: 'follow_up',
    description: 'Generates a follow-up email or message to re-engage a prospect.',
    mode: 'text', role: 'default', outbound: true,
    prompt: ({ contact, deal, lastMessage, extra }) => `
You are writing a thoughtful follow-up to re-engage a prospect.

Contact:
${j(contact)}

Deal:
${j(deal)}

Last message from prospect (if any):
${lastMessage || '(no recent reply)'}

Context:
${j(extra ?? {})}

Task:
- Be polite and value-focused.
- Reference the last interaction or next step.
- Make it easy for them to respond (yes/no or quick choice).
Return your follow-up message only.
    `,
  },

  risk_analysis: {
    id: 'risk_analysis',
    description: 'Analyzes risk of a deal based on context.',
    mode: 'json', role: 'thinking', schemaName: 'risk_analysis',
    schema: {
      type: 'object',
      properties: { risk_score: { type: 'number' }, reason: { type: 'string' }, next_move: { type: 'string' } },
    },
    prompt: ({ contact, deal, lastMessage, extra }) => `
You are a deal risk analyst for an AI-powered CRM.

Contact:
${j(contact)}

Deal:
${j(deal)}

Last message (if any):
${lastMessage || '(none provided)'}

Extra signals:
${j(extra ?? {})}

Task:
1) Assign a RISK_SCORE from 0–100 (0 = no risk, 100 = very high risk).
2) Provide a 2–3 sentence explanation.
3) Suggest 1 best next move.

Return JSON only in this format:
{
  "risk_score": 0,
  "reason": "...",
  "next_move": "..."
}
    `,
  },
};

const SKILL_IDS = Object.keys(SKILLS);

function listSkills() {
  return SKILL_IDS.map((id) => ({ id, description: SKILLS[id].description }));
}

function getSkill(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(SKILLS, id) ? SKILLS[id] : null;
}

/** Same trailer the originals append to research / competitor_intel. */
function withSources(text, citations) {
  if (!citations || !citations.length) return text;
  return `${text}\n\nSources:\n${citations.map((c) => `- ${c.title}: ${c.url}`).join('\n')}`;
}

module.exports = { SKILLS, SKILL_IDS, listSkills, getSkill, withSources };
