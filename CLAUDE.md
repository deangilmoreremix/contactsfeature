# SmartCRM SDR Platform - Claude Code Context

## Project Overview

SmartCRM is an AI-powered CRM and SDR (Sales Development Representative) automation platform built for solopreneurs scaling their business, agency, or executive career in tech. The platform uses the OpenAI Responses API (GPT-6 family, model ids in `src/config/models.json`) exclusively for all AI operations.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3, Zustand (state), Lucide React (icons)
- **Backend**: Netlify Functions (serverless), Supabase Edge Functions (Deno)
- **Database**: Supabase (PostgreSQL with RLS)
- **AI**: OpenAI exclusively (Responses API; `@openai/agents` for the 8 Agents-SDK SDR agents)
- **UI Libraries**: React Hook Form, React Table, Recharts, Floating UI, Fuse.js, React Select
- **File Handling**: xlsx, react-csv, react-dropzone
- **Testing**: Vitest (unit), Playwright (E2E)

### What We Do NOT Use

- No AgentMail (removed)
- No built-in Twilio account: SMS/email are **bring-your-own providers** (Resend, SendGrid, Postmark, Mailgun, Twilio) that each user connects in Settings → Email & SMS; credentials are encrypted server-side
- No Gemini/Google AI, Zapier, Zoom or Unipile
- No magic links or social auth (email/password only via Supabase Auth)
- No external CSS frameworks beyond Tailwind
- No icon libraries beyond Lucide React

## AI Configuration

Single source of truth: `src/config/models.json` (roles → model id + reasoning effort). Server code resolves roles with `netlify/functions/_responses.js` (Deno copy: `supabase/functions/_shared/openai.ts`, kept in sync by a test).

- `default` -- balanced tasks
- `thinking` -- deep reasoning (SDR, AE, autopilot, research, analysis)
- `fast` -- summaries, UI helpers (effort `none`)
- `pro` -- heavy analytics

Rules: Responses API only (never chat/completions, never `max_tokens`); no `temperature`/`top_p` unless effort is `none`; structured output via `text.format` json_schema; `web_search` tool for research. **The browser never holds an OpenAI key**: frontend code calls `src/services/aiClient.ts` (`aiRespond` / `aiStream` / `aiJson`) → `netlify/functions/ai-respond` / `ai-stream` (auth, role + tool allowlist, per-user rate limit in `ai_usage_log`).

Env (server only): `OPENAI_API_KEY`, `MESSAGING_ENCRYPTION_KEY`, optional `SMARTCRM_<ROLE>_MODEL` / `SMARTCRM_<ROLE>_EFFORT` overrides.

## Architecture

### Directory Structure

```
src/
  agents/           # SDR agent definitions, personas, autopilot
    sdr/            # SDR-specific: handleInboundEmail, runSdrAutopilot, tools
    personas.ts     # 30 outbound personas with system prompts
  ai/               # AI model routing, context builders, types
  api/              # API layer for frontend-to-backend calls
  components/       # React components (feature-based organization)
    ai-sales-intelligence/   # Sales AI panels, playbooks, SDR controls
    aiTools/                 # AI tool UIs (email composer, search, deal analysis)
    contacts/                # Contact cards, detail views, sidebars
    contacts/views/          # ListView, TableView, KanbanView, etc.
    dashboard/               # Dashboard widgets
    deals/                   # Deal cards, SDR buttons
    email/                   # Email generation, analytics, templates
    landing/                 # Landing page interactive demos
    layout/                  # Navbar, Sidebar, TopBar
    modals/                  # Contact detail, import, settings modals
    modals/tabs/             # Contact detail tab content
    sdr/                     # SDR agent UI components (one per agent type)
    ui/                      # Shared UI primitives (buttons, tooltips, cards)
  config/            # AI config, API config
  constants/         # Contact constants
  contexts/          # React contexts (AI, Communication, Guidance, View)
  hooks/             # Custom hooks (useContactAI, useSDRExecution, etc.)
  lib/               # Supabase client, history, prompt templates
  pages/             # Route-level page components
  services/          # Service layer (60+ services for AI, contacts, email, etc.)
  store/             # Zustand stores (auth, contact, deal, form)
  types/             # TypeScript type definitions
  utils/             # Utility functions (cache, validation, encryption, etc.)

netlify/functions/   # Serverless backend (82 functions)
  _aiClients.js      # Shared OpenAI client + agent builders
  _supabaseClient.js # Shared Supabase client

supabase/
  functions/         # 28 Edge Functions (Deno)
  migrations/        # Database migrations with RLS
  config.toml        # Supabase local config

lib/                 # Shared backend libraries
  autopilot/         # Autopilot state machine
  calendar/          # Calendar operations
  core/              # OpenAI client, Supabase client, logger, MCP executor
  heatmap/           # Deal risk scoring
  memory/            # Agent memory system
  mood/              # Agent mood/tone system
  skills/            # Agent skills (negotiation, research, etc.)
  video/             # Video agent
  voice/             # Voice agent
```

### Key Patterns

**SDR Agent Components** (`src/components/sdr/`):
Each SDR agent follows this pattern:
1. Accept optional `contact` prop
2. State: `loading`, `error`, `result`, `showSettings`, `draftSaved`, `copied`
3. Call Netlify function via `fetch("/.netlify/functions/<agent-slug>")`
4. Display contact info or manual ID input
5. Show result with Copy and Save Draft buttons
6. Settings button opens `SDRAgentConfigurator` modal
7. Use inline styles for component styling
8. Import `saveSdrDraft` from `../../utils/sdrDraftUtils`

**Netlify Functions** (`netlify/functions/`):
- CommonJS format (`exports.handler = async (event) => {}`)
- CORS headers on every response
- Input validation with early returns
- Supabase queries use `.maybeSingle()` not `.single()`
- OpenAI calls via `_responses.js` (`createResponse`/`streamResponse`) or the `callOpenAI` wrapper in `_fetchWithRetry.js`
- JSON response parsing with regex fallback

**Supabase Edge Functions** (`supabase/functions/`):
- Deno runtime with `Deno.serve()`
- CORS headers: `Access-Control-Allow-Headers: "Content-Type, Authorization, X-Client-Info, Apikey"`
- Auth token from `req.headers.get("Authorization")`
- Supabase client created per-request with user token
- Wrap entire function in try/catch

**Database Migrations** (`supabase/migrations/`):
- Always enable RLS: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY`
- Ownership policies via `auth.uid()` or `contacts.user_id = auth.uid()` for child tables
- Use `IF EXISTS` / `IF NOT EXISTS` guards
- Separate policies for SELECT, INSERT, UPDATE, DELETE (never FOR ALL)
- Detailed markdown comments at top explaining changes

**Frontend Supabase Client** (`src/lib/supabase.ts`):
- Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Has `callEdgeFunction()` helper with auth token injection
- Always use `.maybeSingle()` over `.single()`

## 30 Outbound Personas

Defined in `src/agents/personas.ts`. Each persona has: id, name, label, shortTag, description, idealUseCases, defaultTone, and systemPrompt. Categories:

1-10: Core entrepreneur personas (SaaS Founder, Course Creator, Agency Builder, Product Launch, Influencer, High-Ticket Coach, Local Business, Affiliate Partnership, Newsletter Sponsor, D2C Brand)
11-20: Sales/lifecycle personas (B2B SaaS SDR, Churn Winback, Trial Conversion, Cart Recovery, Upsell, Webinar Invite, Webinar Followup, List Reactivation, Beta Recruitment, Affiliate Recruitment)
21-30: Relationship/strategic personas (Review Request, VIP Concierge, Marketplace Outreach, Wholesale Outreach, App Onboarding, Product Feedback, Community Engagement, Channel Partnership, PR Media, Investor Updates)

## 14 SDR Agent Types

Located in `src/components/sdr/` with corresponding Netlify functions. The first six are hand-written; the other eight (`linkedin-sdr`, `whatsapp-sdr`, `event-based-sdr`, `referral-sdr`, `newsletter-sdr`, `high-intent-sdr`, `data-enrichment-sdr`, `competitor-aware-sdr`) are built on the OpenAI Agents SDK in `netlify/functions/_agents/` (definitions + factory + shared handler) and rendered by `GenericSdrAgentCard`. Persona prompts for all 30 personas ship to the server via `_agents/personas.json` (regenerate with `node scripts/export-personas.cjs` after editing `src/agents/personas.ts`).
1. Cold Email SDR
2. Follow-Up SDR
3. Objection Handler SDR
4. Discovery SDR
5. Win-Back SDR
6. Reactivation SDR
7. LinkedIn SDR
8. WhatsApp SDR
9. Event-Based SDR
10. Referral SDR
11. Newsletter SDR
12. High-Intent SDR
13. Data Enrichment SDR
14. Competitor-Aware SDR

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` -- OpenAI API access (server only)
- `VITE_SUPABASE_URL` / `SUPABASE_URL` -- Supabase project URL
- `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` -- Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` -- Server-side Supabase access (Netlify env only)
- `SMARTCRM_MODEL` / `SMARTCRM_THINKING_MODEL` / `SMARTCRM_FAST_MODEL` -- optional model overrides
- `MESSAGING_ENCRYPTION_KEY` -- 32-byte key (64 hex chars) encrypting user email/SMS provider credentials

## Commands

- `npm run dev` -- Start Vite dev server
- `npm run build` -- Production build
- `npm run typecheck` -- TypeScript validation (strict, `tsconfig.app.json`; must stay at 0 errors, enforced by `scripts/check-stack.sh`)
- `npm run lint` -- ESLint
- `npm run test:functions` -- Test Netlify functions

## Coding Conventions

- Use Lucide React for all icons
- Use Tailwind CSS for styling (SDR components currently use inline styles for historical reasons)
- TypeScript strict mode
- Zustand for global state, React Context for cross-cutting concerns
- Services layer for all external API calls
- Custom hooks for reusable component logic
- `Contact` type from `src/types/contact.ts` is the core data model
- Never expose API keys in frontend code
- All AI calls must go through serverless functions (never call OpenAI directly from browser)
