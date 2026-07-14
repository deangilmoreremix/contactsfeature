# OpenAI (GPT-5.2) API Production-Readiness Audit + Smoke-Test Harness

## Goal
Confirm every feature in this Contacts remote app that calls OpenAI GPT-5.2 is 100%
production-ready: complete + correctly wired code, server-side key handling, documented
env vars, no stubs, and a runnable test harness proving it.

## Scope (decided)
- **In scope:** OpenAI GPT-5.2 only — Responses API (`/v1/responses`) and Chat Completions
  (`/v1/chat/completions`), plus the Realtime `wss` path used by `conversational-ai`.
- **Transport in scope:** OpenAI calls route through Netlify Functions (`/.netlify/functions/<slug>`)
  and/or Supabase Edge Functions (`supabase.functions.invoke`). The specific proxy functions that
  talk to OpenAI ARE in scope as the transport.
- **Out of scope (flagged, not fully audited):** Supabase DB/Auth, Netlify infra, Gemini,
  AgentMail, Twilio, Zapier. `CLAUDE.md` states AgentMail/Twilio are "removed"/"not using" —
  their lingering code + `AGENTMAIL_*` env are tech-debt to flag, not fix here.

## Acceptance bar
Static integration audit (every OpenAI feature fully wired, env documented, no browser-leaked
keys, no stubs) + a runnable Vitest harness (mocked OpenAI by default; live when
`OPENAI_API_KEY` is present and explicitly enabled).

## Current state (from exploration)
- **Direct browser → OpenAI calls (SECURITY VIOLATIONS, key-leak, breaks "serverless-only" rule):**
  - `src/services/gpt5ToolsService.ts:184,252,301`
  - `src/services/gpt51ResponsesService.ts:62`
  - `src/services/agentFramework.ts:86-87` (OpenAI + Gemini)
  - `src/services/conversational-ai.service.ts:58` (`wss://api.openai.com/v1/realtime`)
  - `src/services/aiEnrichmentService.ts:108`
  - `src/services/ai-orchestrator.service.ts:597`
  - `src/services/webSearchService.ts:63,92`
  - `src/config/api.config.ts:105,157` (baseURLs)
- **Correct (server-side) OpenAI proxy functions that already exist:** `email-composer`,
  `cold-email-sdr`, `discovery-sdr`, `objection-handler-sdr`, `win-back-sdr`, `reactivation-sdr`,
  `follow-up-sdr`, `ai-insights`, `ai-enrichment`, plus the shared `netlify/functions/_openaiClient.js`.
- **Referenced-but-MISSING OpenAI proxy functions (genuine gaps):**
  - `openaiService.ts:20,106` → `/.netlify/functions/openai-contact-analysis` — no file in
    `netlify/functions/` nor `supabase/functions/`.
  - `openaiService.ts:65` → `/.netlify/functions/openai-email-template` — same, missing.
- **Stubs / "not implemented in demo" markers:** `agentmail-webhook-simple.ts`,
  `emailTrackingService.ts`, `aiAnalytics.service.ts`, `dataSync.service.ts`, `errorTracking.service.ts`,
  `agentService.ts`. Most are non-OpenAI; verify none gate an OpenAI feature.

## Tasks (ordered)
1. **Build the OpenAI integration inventory** — a table: feature → service → invocation path
   (`fetch('/.netlify/functions/<slug>')` or `supabase.functions.invoke('<slug>')` or direct browser) →
   OpenAI endpoint → required secret (`OPENAI_API_KEY`) → current status (OK / direct-browser / missing-fn / stub).
2. **Security pass — kill direct browser OpenAI calls.** For each service in the violation list,
   route the call through a serverless proxy that holds `OPENAI_API_KEY` server-side:
   - Non-streaming → existing Netlify-function pattern (`_openaiClient.js` + a new/updated function).
   - Streaming/Realtime → proxy via SSE or a WebSocket-bridge function (flag `conversational-ai`
     `wss` as the larger lift; implement basic proxy or document as follow-up).
   - Confirm `OPENAI_API_KEY` is never in the client bundle. Add a guard check (grep/CI or a
     lightweight ESLint rule) that fails the build if `api.openai.com`/`sk-` appears in `src/`.
3. **Implement the two missing OpenAI proxy functions** (default decision — Q3 was dismissed; treat as
   genuine gaps in this repo; if they turn out host-provided, exclude and note):
   - `netlify/functions/openai-contact-analysis.js`
   - `netlify/functions/openai-email-template.js`
   Mirror `email-composer.js` / `ai-insights.js`: CORS headers, Supabase auth (per existing
   `_auth.js`/`_supabaseClient.js`), read `OPENAI_API_KEY` from env, call GPT-5.2, return JSON.
   `openaiService.ts` already calls these slugs, so no frontend change needed beyond their existence.
4. **Env-var completeness.** Ensure `.env.example` documents `OPENAI_API_KEY`, `SMARTCRM_MODEL`,
   `SMARTCRM_THINKING_MODEL`, `SMARTCRM_FAST_MODEL`. Ensure Netlify build env carries
   `OPENAI_API_KEY` server-side only. Confirm model routing uses `src/config/ai.ts`, not hardcoded strings.
5. **Flag dead contradictions (no removal in this scope).** Document Gemini services, `AgentMail`/`Twilio`/
   `Zapier` code + `AGENTMAIL_*` env as tech-debt vs `CLAUDE.md`; leave a short note, don't rewrite.
6. **Build the smoke-test harness** (reuse existing `tests/` Vitest/Playwright infra):
   - Unit tests mocking the OpenAI HTTP (fetch mock / MSW) for each GPT-5.2 service & function:
     assert endpoint, model from config, request shape, response parsing, error/retry handling
     (reuse `netlify/functions/_fetchWithRetry.js`).
   - Netlify-function tests: load each handler with a mocked `event` + mocked `fetch`, assert it
     reads `OPENAI_API_KEY` from `process.env` (server-side) and returns expected JSON.
   - **Live mode (opt-in, skipped by default):** tests tagged `live` that call real GPT-5.2 only when
     `OPENAI_API_KEY` is set AND an explicit flag is on (e.g. `VITEST_LIVE=1 vitest run -t live`).
     Never hardcode/commit the key.

## Validation / acceptance
- `pnpm typecheck` and `pnpm lint` pass.
- `pnpm test` (mocked) green — proves every OpenAI feature has complete, wired, non-stub logic
  and correct server-side routing.
- `pnpm build` still emits `dist/assets/remoteEntry.js` (already verified this session).
- **Live smoke (optional, key-in-env only):** with `OPENAI_API_KEY` in a gitignored `.env` or
  Netlify encrypted env, run the `live`-tagged tests to confirm real GPT-5.2 responses.
- Inventory table + status committed as the audit record (within the plan/PR, not a new doc unless asked).

## Risks / open questions
- Realtime `wss` proxy is a larger lift — basic proxy or documented follow-up.
- The two missing functions are assumed owned by this repo; if host-app-provided, exclude + flag.
- Provided `OPENAI_API_KEY` was pasted in chat → treat as **exposed**: rotate in OpenAI, supply only via
  secure env for live runs; never commit or hardcode.
- Confirm no OpenAI feature is gated by the "not implemented in demo" stubs (verify in Task 1).
