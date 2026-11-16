/**
 * Catalog of every UI AI control the sweep clicks. Derived from the consumers of src/lib/streaming/aiEndpoints.json
 * (grep of src for the endpoint names) plus a per-tab discovery pass in the spec that fails on any AI-looking button
 * that is not in this list. `expected` names the endpoint(s) the control must reach; `skip` records controls that
 * cannot produce output here (never counted as a pass).
 */
import type { Page, Locator } from '@playwright/test';


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
  /** 'open': the AI run starts when the tab is opened (no click needed), the tab click is what gets sampled */
  trigger?: 'click' | 'open';
  /** reason this control cannot be exercised here (recorded SKIPPED, never PASS) */
  skip?: string;
  /** what the control does when it makes no AI request (clicked anyway; recorded SKIPPED with this reason) */
  noRequestReason?: string;
  /** when the control is not on screen: recorded SKIPPED with this reason instead of failing */
  absentReason?: string;
  /** documented non-streaming endpoints this control may call (recorded SKIPPED with the reason, never PASS) */
  nonStreaming?: { endpoints: string[]; reason: string };
  /** the click opens an external site in a new tab (never an in-app AI request) */
  popup?: boolean;
  /** UI files (src/components, src/pages) this control exercises; used by the mounted-consumer completeness check */
  covers?: string[];
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


const subTab = (label: string) => async (page: Page) => { await page.locator(`[aria-label="Switch to ${label} tab"]`).click({ force: true }); await page.waitForTimeout(700); };
const OBJECTION = { find: (page: Page) => page.getByPlaceholder('Enter the objection from the prospect...'), value: 'We already use another CRM and the price is too high for us.' };

export const CONTROLS: Control[] = [
  // ---- contacts list (behind the detail modal)
  { id: 'list.ai-score-all', group: 'Contacts list', tab: 'list', find: btn(/AI Score All/), expected: [], covers: ['ContactsModal'],
    nonStreaming: { endpoints: ['ai-respond'], reason: 'queued background scoring (ai-task-queue.service.ts: "INTENTIONALLY NON-STREAMING", plain aiJson -> ai-respond); the scores appear after the run, with a completion banner' } },
  { id: 'list.product-intelligence', group: 'Contacts list', tab: 'list',
    before: async (page) => { await page.getByRole('button', { name: 'AI Product Intelligence' }).click(); await page.waitForTimeout(800); await page.getByPlaceholder('https://example.com').fill('https://acme.example'); },
    find: btn('Start AI Analysis'), expected: [], covers: ['ProductIntelligenceModal'] },
  { id: 'list.new-contact.research-by-email', group: 'Contacts list', tab: 'list', covers: ['AIResearchButton'],
    before: async (page) => { await page.getByRole('button', { name: 'New Contact' }).first().click(); await page.waitForTimeout(800); await page.locator('input[type="email"]').first().fill('test@acme.example'); await page.getByRole('button', { name: /AI Auto-Fill/ }).click(); await page.waitForTimeout(500); },
    find: btn(/Research by Email/), expected: [] },
  { id: 'list.new-contact.ai-auto-research', group: 'Contacts list', tab: 'list',
    before: async (page) => { await page.getByRole('button', { name: 'New Contact' }).first().click(); await page.waitForTimeout(800); await page.locator('input[type="email"]').first().fill('test@acme.example'); await page.getByRole('button', { name: /AI Auto-Fill/ }).click(); await page.waitForTimeout(500); },
    find: btn(/AI Auto-Research/), expected: [] },
  { id: 'list.card-sdr', group: 'Contacts list', tab: 'list', covers: ['SDRPersonaSelector', 'SDRButtonGroup'],
    find: (page) => page.getByRole('button', { name: 'SDR', exact: true }).first(), expected: [],
    noRequestReason: 'DEAD CONTROL in the List view: ListView renders SmartContactCard without onOpenSDRModal (only the unreachable default branch of ContactsModal.renderView passes it), so the SDR button opens no modal; SDRModal (SDRPersonaSelector, SDRButtonGroup) cannot be opened from the UI' },
  // ---- contact sidebar (always visible in the detail modal)
  { id: 'sidebar.ai-goals', group: 'Sidebar AI tools', tab: 'sidebar', find: btn('AI Goals', { exact: true }), expected: [], popup: true },
  { id: 'sidebar.email-ai', group: 'Sidebar AI tools', tab: 'sidebar', find: btn('Email AI', { exact: true }), expected: [],
    noRequestReason: 'opens the Compose Email modal pre-filled from a static template (ContactSidebar.handleSendEmail -> openComposer); it makes no model call' },
  { id: 'sidebar.enrich', group: 'Sidebar AI tools', tab: 'sidebar', find: btn('Enrich', { exact: true }), expected: ['contact-enrich'] },
  { id: 'sidebar.auto-enrich', group: 'Sidebar AI tools', tab: 'sidebar', find: btn('AI Auto-Enrich', { exact: true }), expected: ['contact-enrich'] },
  // ---- tabs
  { id: 'analytics.on-open', group: 'Analytics', tab: 'analytics', trigger: 'open', find: btn('AI Predictions', { exact: true }), expected: [], covers: ['ContactAnalytics'] },
  { id: 'analytics.ai-predictions', group: 'Analytics', tab: 'analytics', find: btn('AI Predictions', { exact: true }), expected: [] },
  { id: 'communication.ai-email', group: 'Communication', tab: 'communication', find: btn('AI Email', { exact: true }), expected: ['email-composer'], covers: ['CommunicationHub'] },
  { id: 'communication.start-call', group: 'Communication', tab: 'communication', find: btn('Start Call', { exact: true }), expected: [] },
  { id: 'communication.ai-sms', group: 'Communication', tab: 'communication', find: btn('AI SMS', { exact: true }), expected: [] },
  { id: 'communication.get-ai-strategy', group: 'Communication', tab: 'communication', find: btn('Get AI Strategy'), expected: ['communication-manager'] },
  { id: 'communication.follow-up-email', group: 'Communication', tab: 'communication', find: btn(/^Follow-up Email/), expected: [] },
  { id: 'communication.meeting-invite', group: 'Communication', tab: 'communication', find: btn(/^Meeting Invite/), expected: [] },
  { id: 'communication.proposal-email', group: 'Communication', tab: 'communication', find: btn(/^Proposal Email/), expected: [] },
  { id: 'communication.ai-strategy-tile', group: 'Communication', tab: 'communication', find: btn(/^AI Strategy/), expected: [] },
  { id: 'automation.ai-suggestions', group: 'Automation', tab: 'automation', find: btn('AI Suggestions', { exact: true }), expected: [], covers: ['AutomationPanel'] },
  { id: 'automation.suggestions-tab', group: 'Automation', tab: 'automation', find: (page) => page.locator('[aria-label="Switch to AI Suggestions tab"]'), expected: [],
    noRequestReason: 'switches to the AI Suggestions list; suggestions are generated by the AI Suggestions button, the tab itself makes no request' },
  { id: 'sales-intel.optimize-message', group: 'Sales Intelligence', tab: 'sales-intelligence', find: btn('Optimize Message'), expected: ['communication-optimization'], covers: ['CommunicationOptimizer'] },
  { id: 'sales-intel.generate-questions', group: 'Sales Intelligence', tab: 'sales-intelligence', find: btn('Generate Questions'), expected: ['discovery-questions'], covers: ['DiscoveryQuestionsGenerator'] },
  { id: 'sales-intel.deal-health', group: 'Sales Intelligence', tab: 'sales-intelligence', find: btn('Run Health Analysis'), expected: ['deal-health-analysis'], covers: ['DealHealthPanel'],
    absentReason: 'DealHealthPanel only offers "Run Health Analysis" when the contact has a deal; the demo contact has none (panel shows "Create deal")' },
  { id: 'playbooks.generate-ai-playbook', group: 'Playbooks', tab: 'playbooks', find: btn('Generate AI Playbook'), then: [btn(/Generate (Sales )?Playbook$/)], expected: ['adaptive-playbook'], covers: ['AdaptivePlaybookGenerator'] },
  { id: 'playbooks.launch-sdr-campaign', group: 'Playbooks', tab: 'playbooks', find: btn('Launch SDR Campaign'), expected: [],
    noRequestReason: 'dead control: ContactPlaybooksTab.tsx wires it to onClick={() => {/* Open SDR Modal */}} (no handler, no request)' },
  { id: 'ai-insights.on-open', group: 'AI Insights', tab: 'ai-insights', trigger: 'open', find: btn('Generate AI Insights'), expected: [], covers: ['AIInsightsPanel'] },
  { id: 'ai-insights.generate', group: 'AI Insights', tab: 'ai-insights', find: btn('Generate AI Insights'), expected: [],
    absentReason: 'the button only exists before the first run; the tab auto-runs on open (see ai-insights.on-open) and then shows Refresh Insights instead' },
  { id: 'ai-insights.refresh', group: 'AI Insights', tab: 'ai-insights', find: btn('Refresh Insights'), expected: [] },
  { id: 'ai-insights.intelligence-engine', group: 'AI Insights', tab: 'ai-insights', before: async (page) => { await page.locator('[aria-label="Switch to Intelligence Engine view"]').click({ force: true }); await page.waitForTimeout(700); }, find: btn('Generate Intelligence'), expected: [] },
  { id: 'ai-insights.smart-recommendations', group: 'AI Insights', tab: 'ai-insights', before: async (page) => { await page.locator('[aria-label="Switch to Smart Recommendations view"]').click({ force: true }); await page.waitForTimeout(700); }, find: btn('Generate Intelligence'), expected: [] },
  { id: 'email.ai-intro', group: 'Email', tab: 'email', find: btn('AI Intro'), expected: ['email-composer'], covers: ['ContactEmailPanel', 'AIEmailGenerator'] },
  { id: 'email.ai-follow-up', group: 'Email', tab: 'email', find: btn('AI Follow-up'), expected: ['email-composer'] },
  { id: 'email.generate-email', group: 'Email', tab: 'email', find: btn('Generate Email'), expected: ['email-composer'] },
  { id: 'email.analyzer', group: 'Email', tab: 'email', before: subTab('Analyzer'), covers: ['EmailAnalyzer'],
    fill: [{ find: (page) => page.getByPlaceholder('Enter your email subject'), value: 'Quick idea for ACME Retail' }, { find: (page) => page.getByPlaceholder('Enter your email content'), value: 'Hi Brooklyn, I wanted to follow up on our conversation about your store operations and share a short idea that could help your new managers ramp up faster.' }],
    find: btn('Analyze Email'), expected: ['email-analyzer'] },
  { id: 'email.social-messages', group: 'Email', tab: 'email', before: subTab('Social Messages'), find: btn('Generate Message'), expected: ['personalized-messages'], covers: ['SocialMessageGenerator'] },
  { id: 'agents.start-autopilot', group: 'AI Agents', tab: 'agents', find: btn('Start Autopilot'), expected: [],
    noRequestReason: 'starts the background SDR autopilot pipeline (sdr-autopilot); that call returns state, the generated mail is delivered by the pipeline, not shown here' },
  // ---- 14 SDR agents
  { id: 'sdr.cold-email', group: 'SDR agents', tab: 'sdr-agents', find: btn('Send Cold Email'), expected: ['cold-email-sdr'], covers: ['ColdEmailSDRAgent', 'ContactSDRPanel'] },
  { id: 'sdr.follow-up', group: 'SDR agents', tab: 'sdr-agents', find: btn('Send Follow-Up'), expected: ['follow-up-sdr'], covers: ['FollowUpSDRAgent'] },
  { id: 'sdr.objection-handler', group: 'SDR agents', tab: 'sdr-agents', find: btn('Handle Objection'), fill: [OBJECTION], expected: ['objection-handler-sdr'], covers: ['ObjectionHandlerSDRAgent'] },
  { id: 'sdr.reactivation', group: 'SDR agents', tab: 'sdr-agents', find: btn('Send Reactivation'), expected: ['reactivation-sdr'], covers: ['ReactivationSDRAgent'] },
  { id: 'sdr.win-back', group: 'SDR agents', tab: 'sdr-agents', find: btn('Send Win-Back'), expected: ['win-back-sdr'], covers: ['WinBackSDRAgent'] },
  { id: 'sdr.discovery', group: 'SDR agents', tab: 'sdr-agents', find: btn('Start Discovery Research'), expected: ['discovery-sdr'], covers: ['DiscoverySDRAgent'] },
  { id: 'sdr.linkedin', group: 'SDR agents', tab: 'sdr-agents', find: btn('Write LinkedIn messages'), expected: ['linkedin-sdr'] },
  { id: 'sdr.whatsapp', group: 'SDR agents', tab: 'sdr-agents', find: btn('Write WhatsApp message'), expected: ['whatsapp-sdr'] },
  { id: 'sdr.event-based', group: 'SDR agents', tab: 'sdr-agents', find: btn('Find event & write email'), expected: ['event-based-sdr'] },
  { id: 'sdr.referral', group: 'SDR agents', tab: 'sdr-agents', find: btn('Write referral request'), expected: ['referral-sdr'] },
  { id: 'sdr.newsletter', group: 'SDR agents', tab: 'sdr-agents', find: btn('Write newsletter email'), expected: ['newsletter-sdr'] },
  { id: 'sdr.high-intent', group: 'SDR agents', tab: 'sdr-agents', find: btn('Analyze intent & reply'), expected: ['high-intent-sdr'] },
  { id: 'sdr.data-enrichment', group: 'SDR agents', tab: 'sdr-agents', find: btn('Research contact'), expected: ['data-enrichment-sdr'] },
  { id: 'sdr.competitor-aware', group: 'SDR agents', tab: 'sdr-agents', find: btn('Research & write email'), expected: ['competitor-aware-sdr'] },
  // ---- 12 "Run" agent buttons in the SDR tab (card -> Run -> Execute Agent)
  ...([
    ['Social Selling', 'social-selling-agent'], ['Email Personalization', 'email-personalization-agent'], ['Revenue Intelligence', 'revenue-intelligence-agent'],
    ['Competitive Intel', 'competitive-intelligence-agent'], ['Content Creation', 'content-creation-agent'], ['Negotiation Coach', 'negotiation-coach-agent'],
    ['Meeting Scheduler', 'video-call-scheduler'], ['Lead Scoring', 'ai-enrichment'], ['Call Intelligence', 'cold-call-sdr'],
    ['Deal Analysis', 'deal-analysis-agent'], ['Proposal Generator', 'proposal-generator'], ['Email Deliverability', 'email-deliverability-agent'],
  ] as const).map(([label, fn]): Control => ({
    id: `agent.${fn}`, group: 'Agent Run buttons', tab: 'sdr-agents', find: cardButton(label, /Run/), then: [btn('Execute Agent')], expected: [fn], covers: ['AgentButton'],
  })),
];

/** UI files that consume an AI endpoint but are not mounted anywhere in the app (no importer reachable from main.tsx): cannot be clicked. */
export const UNMOUNTED: Array<{ name: string; endpoints: string; covered: string }> = [
  { name: 'HeatmapPanel', endpoints: 'deal-heatmap', covered: 'tests/playwright/panel-endpoints.spec.ts (panels.config.ts harness)' },
  { name: 'MemoryPanel', endpoints: 'memory-get', covered: 'tests/playwright/panel-endpoints.spec.ts (panels.config.ts harness)' },
  { name: 'SkillsPanel', endpoints: 'skills-api', covered: 'tests/playwright/panel-endpoints.spec.ts (panels.config.ts harness)' },
  { name: 'MoodPanel', endpoints: 'mood-preview', covered: 'NO Playwright coverage (unit tests only: src/tests/*-panel.test.tsx)' },
  { name: 'VideoAgentPanel', endpoints: 'video-agent', covered: 'NO Playwright coverage (unit tests only: src/tests/*-panel.test.tsx)' },
  { name: 'VoiceAgentPanel', endpoints: 'voice-agent', covered: 'NO Playwright coverage (unit tests only: src/tests/*-panel.test.tsx)' },
  { name: 'PlaybooksPanel', endpoints: 'playbooks-ai', covered: 'NO Playwright coverage (unit tests only: src/tests/*-panel.test.tsx)' },
  { name: 'AutopilotControlPanel', endpoints: 'run-agent', covered: 'tests/playwright/callers-streaming.spec.ts (callers harness)' },
  { name: 'GTMPromptHub', endpoints: 'generate-with-prompt', covered: 'tests/playwright/callers-streaming.spec.ts (callers harness)' },
  { name: 'SalesForecastingWidget', endpoints: 'sales-forecasting', covered: 'tests/playwright/streaming-panels.spec.ts (streaming.config.ts harness)' },
  { name: 'FeatureAnalysisStudio', endpoints: 'ai-task', covered: 'tests/playwright/callers-streaming.spec.ts (callers harness)' },
  { name: 'AISalesIntelligencePanel', endpoints: 'ai-stream', covered: 'tests/playwright/callers-streaming.spec.ts (lead-nurturing)' },
  { name: 'AutomationBuilder', endpoints: 'ai-respond (non-visible rule generator)', covered: 'not covered by a harness' },
  { name: 'AgentRunner', endpoints: 'agent-runner', covered: 'not covered by a harness' },
  { name: 'SmartAIControls', endpoints: 'ai-stream', covered: 'not covered by a harness' },
  { name: 'EnhancedAISDRPanel', endpoints: 'sdr agents', covered: 'not covered by a harness' },
  { name: 'CustomizableAIToolbar', endpoints: 'ai-stream', covered: 'not covered by a harness' },
];
/** mounted UI files that only host/show a stream (primitives) or are reached through a parent already covered */
export const PRIMITIVES = new Set(['StreamingOutput', 'LiveOutput', 'LiveRunStatus', 'SdrLive', 'AIErrorToaster', 'ContactDetailView', 'AIAutoFillButton', 'EmailTemplateSelector', 'ContactEmailPanel']);

/** controls re-run in light and dark for the screenshot pass (looked at by a human) */
export const THEME_SUBSET = ['sidebar.enrich', 'sdr.cold-email', 'sdr.linkedin', 'communication.get-ai-strategy', 'email.ai-intro', 'ai-insights.on-open'];
