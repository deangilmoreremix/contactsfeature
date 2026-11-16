/**
 * Catalog of every UI AI control the sweep clicks. Derived from the consumers of src/lib/streaming/aiEndpoints.json
 * (grep of src for the endpoint names) plus a per-tab discovery pass in the spec that fails on any AI-looking button
 * that is not in this list. `expected` names the endpoint(s) the control must reach; `skip` records controls that
 * cannot produce output here (never counted as a pass).
 */
import type { Page, Locator } from '@playwright/test';

export type Where =
  | { kind: 'tab'; tab: string }            // inside the contact detail modal, on this tab ([data-testid="<tab>-tab"])
  | { kind: 'list' }                        // the contacts list behind the modal (no contact opened)
  | { kind: 'modalTabs'; tab: string };     // same as tab, kept for readability of sub-views

export interface Control {
  id: string;
  group: string;
  tab: string;                              // 'sidebar' (visible on every tab), a tab id, or 'list'
  /** how to find the button; may use `page` so cards can be scoped */
  find: (page: Page) => Locator;
  /** optional steps to take before the clicked control exists (switch a sub-view, open a modal) */
  before?: (page: Page) => Promise<void>;
  /** follow-up clicks after the first click (e.g. a modal's Generate button) */
  then?: Array<(page: Page) => Locator>;
  /** endpoints that must be requested (any of) */
  expected: string[];
  /** true when the answer is shown inline, so the DOM must grow while it streams */
  inline?: boolean;
  /** an input to fill before clicking */
  fill?: Array<{ find: (page: Page) => Locator; value: string }>;
}

export interface Skipped { id: string; group: string; tab: string; name: string; reason: string }

const btn = (name: string | RegExp, opts: { exact?: boolean; nth?: number } = {}) => (page: Page) => {
  const l = page.getByRole('button', { name, exact: opts.exact ?? false });
  return opts.nth !== undefined ? l.nth(opts.nth) : l.first();
};
/** the card (rounded box) that holds a heading/label with this text, then its button */
const cardButton = (label: string, name: string | RegExp) => (page: Page) =>
  page.getByText(label, { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]').getByRole('button', { name }).first();

export const CONTROLS: Control[] = [
  // ---- contact sidebar (always visible in the detail modal)
  { id: 'sidebar.ai-goals', group: 'Sidebar AI tools', tab: 'sidebar', find: btn('AI Goals', { exact: true }), expected: [] },
  { id: 'sidebar.email-ai', group: 'Sidebar AI tools', tab: 'sidebar', find: btn('Email AI', { exact: true }), expected: [] },
  { id: 'sidebar.enrich', group: 'Sidebar AI tools', tab: 'sidebar', find: btn('Enrich', { exact: true }), expected: [] },
  { id: 'sidebar.auto-enrich', group: 'Sidebar AI tools', tab: 'sidebar', find: btn('AI Auto-Enrich', { exact: true }), expected: [] },
  // ---- tabs
  { id: 'analytics.ai-predictions', group: 'Analytics', tab: 'analytics', find: btn('AI Predictions', { exact: true }), expected: [] },
  { id: 'communication.ai-email', group: 'Communication', tab: 'communication', find: btn('AI Email', { exact: true }), expected: [] },
  { id: 'communication.ai-sms', group: 'Communication', tab: 'communication', find: btn('AI SMS', { exact: true }), expected: [] },
  { id: 'communication.get-ai-strategy', group: 'Communication', tab: 'communication', find: btn('Get AI Strategy'), expected: [] },
  { id: 'automation.ai-suggestions', group: 'Automation', tab: 'automation', find: btn('AI Suggestions', { exact: true }), expected: [] },
  { id: 'sales-intel.optimize-message', group: 'Sales Intelligence', tab: 'sales-intelligence', find: btn('Optimize Message'), expected: [] },
  { id: 'sales-intel.generate-questions', group: 'Sales Intelligence', tab: 'sales-intelligence', find: btn('Generate Questions'), expected: [] },
  { id: 'playbooks.generate-ai-playbook', group: 'Playbooks', tab: 'playbooks', find: btn('Generate AI Playbook'), expected: [] },
  { id: 'playbooks.launch-sdr-campaign', group: 'Playbooks', tab: 'playbooks', find: btn('Launch SDR Campaign'), expected: [] },
  { id: 'ai-insights.generate', group: 'AI Insights', tab: 'ai-insights', find: btn('Generate AI Insights'), expected: [] },
  { id: 'ai-insights.refresh', group: 'AI Insights', tab: 'ai-insights', find: btn('Refresh Insights'), expected: [] },
  { id: 'email.ai-intro', group: 'Email', tab: 'email', find: btn('AI Intro'), expected: [] },
  { id: 'email.ai-follow-up', group: 'Email', tab: 'email', find: btn('AI Follow-up'), expected: [] },
  { id: 'email.generate-email', group: 'Email', tab: 'email', find: btn('Generate Email'), expected: [] },
  { id: 'agents.start-autopilot', group: 'AI Agents', tab: 'agents', find: btn('Start Autopilot'), expected: [] },
  // ---- 14 SDR agents
  { id: 'sdr.cold-email', group: 'SDR agents', tab: 'sdr-agents', find: btn('Send Cold Email'), expected: ['cold-email-sdr'] },
  { id: 'sdr.follow-up', group: 'SDR agents', tab: 'sdr-agents', find: btn('Send Follow-Up'), expected: ['follow-up-sdr'] },
  { id: 'sdr.objection-handler', group: 'SDR agents', tab: 'sdr-agents', find: btn('Handle Objection'), expected: ['objection-handler-sdr'] },
  { id: 'sdr.reactivation', group: 'SDR agents', tab: 'sdr-agents', find: btn('Send Reactivation'), expected: ['reactivation-sdr'] },
  { id: 'sdr.win-back', group: 'SDR agents', tab: 'sdr-agents', find: btn('Send Win-Back'), expected: ['win-back-sdr'] },
  { id: 'sdr.discovery', group: 'SDR agents', tab: 'sdr-agents', find: btn('Start Discovery Research'), expected: ['discovery-sdr'] },
  { id: 'sdr.linkedin', group: 'SDR agents', tab: 'sdr-agents', find: btn('Write LinkedIn messages'), expected: ['linkedin-sdr'] },
  { id: 'sdr.whatsapp', group: 'SDR agents', tab: 'sdr-agents', find: btn('Write WhatsApp message'), expected: ['whatsapp-sdr'] },
  { id: 'sdr.event-based', group: 'SDR agents', tab: 'sdr-agents', find: btn('Find event & write email'), expected: ['event-based-sdr'] },
  { id: 'sdr.referral', group: 'SDR agents', tab: 'sdr-agents', find: btn('Write referral request'), expected: ['referral-sdr'] },
  { id: 'sdr.newsletter', group: 'SDR agents', tab: 'sdr-agents', find: btn('Write newsletter email'), expected: ['newsletter-sdr'] },
  { id: 'sdr.high-intent', group: 'SDR agents', tab: 'sdr-agents', find: btn('Analyze intent & reply'), expected: ['high-intent-sdr'] },
  { id: 'sdr.data-enrichment', group: 'SDR agents', tab: 'sdr-agents', find: btn('Research contact'), expected: ['data-enrichment-sdr'] },
  { id: 'sdr.competitor-aware', group: 'SDR agents', tab: 'sdr-agents', find: btn('Research & write email'), expected: ['competitor-aware-sdr'] },
  // ---- 12 agent-runner "Run" buttons in the SDR tab
  ...([
    ['Social Selling', 'social-selling-agent'], ['Email Personalization', 'email-personalization-agent'], ['Revenue Intelligence', 'revenue-intelligence-agent'],
    ['Competitive Intel', 'competitive-intelligence-agent'], ['Content Creation', 'content-creation-agent'], ['Negotiation Coach', 'negotiation-coach-agent'],
    ['Meeting Scheduler', 'video-call-scheduler'], ['Lead Scoring', 'ai-enrichment'], ['Call Intelligence', 'cold-call-sdr'],
    ['Deal Analysis', 'deal-analysis-agent'], ['Proposal Generator', 'proposal-generator'], ['Email Deliverability', 'email-deliverability-agent'],
  ] as const).map(([label, fn]): Control => ({
    id: `agent.${fn}`, group: 'Agent Run buttons', tab: 'sdr-agents', find: cardButton(label, /Run/), expected: [fn],
  })),
];
