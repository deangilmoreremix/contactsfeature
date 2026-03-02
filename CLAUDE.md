# SmartCRM SDR Platform - Claude Code Context

## Project Overview

SmartCRM is an AI-powered CRM and SDR (Sales Development Representative) automation platform built for solopreneurs scaling their business, agency, or executive career in tech. The platform uses GPT-5.2 via the OpenAI Responses API exclusively for all AI operations.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3, Zustand (state), Lucide React (icons)
- **Backend**: Netlify Functions (serverless), Supabase Edge Functions (Deno)
- **Database**: Supabase (PostgreSQL with RLS)
- **AI**: OpenAI GPT-5.2 exclusively (Responses API + Agent SDK when needed)
- **UI Libraries**: React Hook Form, React Table, Recharts, Floating UI, Fuse.js, React Select
- **File Handling**: xlsx, react-csv, react-dropzone
- **Testing**: Vitest (unit), Playwright (E2E)

### What We Do NOT Use

- No AgentMail (removed)
- No Twilio (not using)
- No magic links or social auth (email/password only via Supabase Auth)
- No external CSS frameworks beyond Tailwind
- No icon libraries beyond Lucide React

## AI Configuration

All AI calls go through GPT-5.2. Model routing is defined in `src/config/ai.ts`:

- `gpt-5.2` -- default model for balanced tasks
- `gpt-5.2-thinking` -- deep reasoning for SDR, AE, autopilot, research, analysis
- `gpt-5.2-instant` -- fast model for summaries, UI helpers
- `gpt-5.2-pro` -- heavy analytics (optional)

Environment variables: `SMARTCRM_MODEL`, `SMARTCRM_THINKING_MODEL`, `SMARTCRM_FAST_MODEL`

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
  functions/         # 50 Edge Functions (Deno)
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
- OpenAI calls via fetch to `https://api.openai.com/v1/chat/completions`
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

Located in `src/components/sdr/` with corresponding Netlify functions:
1. Cold Email SDR
2. Follow-Up SDR
3. Objection Handler SDR
4. Discovery SDR
5. Win-Back SDR
6. Reactivation SDR
7. LinkedIn SDR (planned)
8. WhatsApp SDR (planned)
9. Event-Based SDR (planned)
10. Referral SDR (planned)
11. Newsletter SDR (planned)
12. High-Intent SDR (planned)
13. Data Enrichment SDR (planned)
14. Competitor-Aware SDR (planned)

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` -- GPT-5.2 API access
- `VITE_SUPABASE_URL` / `SUPABASE_URL` -- Supabase project URL
- `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` -- Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` -- Server-side Supabase access (Netlify env only)
- `SMARTCRM_MODEL` / `SMARTCRM_THINKING_MODEL` / `SMARTCRM_FAST_MODEL` -- AI model config

## Commands

- `npm run dev` -- Start Vite dev server
- `npm run build` -- Production build
- `npm run typecheck` -- TypeScript validation
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
