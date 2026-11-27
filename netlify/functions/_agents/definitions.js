/**
 * Definitions for the 8 SDR agents built on the OpenAI Agents SDK.
 * Each entry: slug (= Netlify function name), name, channel, instructions, output (zod), search (hosted web_search).
 * `.nullable()` is used instead of `.optional()` because Structured Outputs requires every key.
 */
const { z } = require('zod');

const s = (d) => z.string().describe(d);
const list = (d) => z.array(z.string()).describe(d);

const DEFINITIONS = {
  'linkedin-sdr': {
    name: 'LinkedIn SDR',
    channel: 'linkedin',
    thinking: false,
    search: false,
    instructions: `You write LinkedIn outreach. Produce a connection request note (STRICT max 300 characters, no links, no pitch), a first follow-up message to send after they accept, and 2-3 talking points taken from the contact's real profile data. Never invent facts about the person. Plain text only.`,
    output: z.object({
      connectionNote: s('Connection request note, max 300 characters'),
      followUpMessage: s('Message to send after the connection is accepted'),
      talkingPoints: list('2-3 personalised talking points grounded in the contact data'),
    }),
  },
  'whatsapp-sdr': {
    name: 'WhatsApp SDR',
    channel: 'whatsapp',
    thinking: false,
    search: false,
    instructions: `You write short, conversational WhatsApp messages. Max 500 characters, no markdown, at most one emoji, one clear question. Remind the user to confirm the contact has opted in to WhatsApp messaging before sending, and suggest how to phrase an approved template if this would be the first business-initiated message.`,
    output: z.object({
      message: s('The WhatsApp message, max 500 characters, plain text'),
      templateSuggestion: s('How to phrase this as an approved message template if it is business-initiated'),
      optInReminder: s('One sentence reminding the sender to confirm opt-in'),
    }),
  },
  'event-based-sdr': {
    name: 'Event-Based SDR',
    channel: 'email',
    thinking: true,
    search: true,
    instructions: `You write outreach triggered by a real, recent event involving the contact or their company (funding, hiring, launch, conference talk, leadership change, news). Use web search to find a genuine event from the last 90 days and cite it. If you cannot find a verifiable event, say so in "trigger" and write a gentle non-event version rather than inventing one. Keep emails under 130 words with one low-friction ask.`,
    output: z.object({
      trigger: s('The event used as the hook, or a statement that none could be verified'),
      eventSources: list('URLs that support the event'),
      subject: s('Email subject'),
      body: s('Email body'),
    }),
  },
  'referral-sdr': {
    name: 'Referral SDR',
    channel: 'email',
    thinking: false,
    search: false,
    instructions: `You write referral requests and warm-introduction asks to existing contacts or customers. Be specific about who would be a good introduction, make saying no easy, offer to write a forwardable blurb, and never pressure. Under 120 words.`,
    output: z.object({
      subject: s('Email subject'),
      body: s('Email body'),
      forwardableBlurb: s('A 2-sentence blurb the contact can forward to the person they introduce'),
      idealIntroProfile: s('Who the contact should introduce us to'),
    }),
  },
  'newsletter-sdr': {
    name: 'Newsletter SDR',
    channel: 'email',
    thinking: false,
    search: false,
    instructions: `You write newsletter-style outreach: an invitation to subscribe or a one-off issue teaser that leads with value for the reader's role. Subject under 50 characters, a preheader, a short scannable body, one CTA.`,
    output: z.object({
      subject: s('Subject under 50 characters'),
      preheader: s('Preheader text under 90 characters'),
      body: s('Newsletter body'),
      cta: s('Single call to action'),
    }),
  },
  'high-intent-sdr': {
    name: 'High-Intent SDR',
    channel: 'email',
    thinking: true,
    search: false,
    instructions: `You respond fast to contacts showing buying intent (hot interest level, high AI score, recent replies/opens, pricing or demo activity). Use the tools to read recent activity, list the concrete intent signals you actually see (never invent signals), rate urgency, and write a direct reply that proposes a specific next step (a time-boxed call or a tailored demo).`,
    output: z.object({
      intentSignals: list('Concrete signals found in the data'),
      urgency: z.enum(['low', 'medium', 'high']).describe('How urgent the follow-up is'),
      subject: s('Email subject'),
      body: s('Email body'),
      suggestedNextAction: s('The single best next action for the rep'),
    }),
  },
  'data-enrichment-sdr': {
    name: 'Data Enrichment SDR',
    channel: 'research',
    thinking: true,
    search: true,
    instructions: `You research a contact using public web sources only (professional profile, company site, press). Fill only fields you can verify with a source; use null for anything unverified. Do not guess emails or phone numbers, and do not collect sensitive personal data. Report evidence URLs and an honest confidence (0-100).`,
    output: z.object({
      matched: z.boolean().describe('Whether you are confident this is the right person'),
      title: z.string().nullable().describe('Current job title'),
      company: z.string().nullable().describe('Current employer'),
      industry: z.string().nullable().describe('Industry'),
      companySize: z.string().nullable().describe('Approximate company size'),
      linkedinUrl: z.string().nullable().describe('Public profile URL'),
      websiteUrl: z.string().nullable().describe('Company website URL'),
      summary: s('Two-sentence professional summary'),
      evidence: list('URLs backing the fields above'),
      confidence: z.number().describe('0-100'),
    }),
  },
  'competitor-aware-sdr': {
    name: 'Competitor-Aware SDR',
    channel: 'email',
    thinking: true,
    search: true,
    instructions: `You write outreach for contacts who likely use or evaluate a competitor. Use web search to confirm which competitor and current positioning/pricing facts, cite sources, and never disparage or state unverifiable claims. Lead with a concrete difference that matters for their role, acknowledge the competitor's real strengths, and keep the email under 140 words.`,
    output: z.object({
      competitor: s('Competitor identified (or "unknown")'),
      differentiators: list('Verified differentiators relevant to this contact'),
      sources: list('URLs supporting competitor facts'),
      subject: s('Email subject'),
      body: s('Email body'),
      battlecard: s('Three-bullet battlecard for the rep'),
    }),
  },
};

module.exports = { DEFINITIONS };
