# Streaming contract (every user-visible AI output)

All AI answers stream over Server-Sent Events built from the OpenAI Responses API `stream:true` events.

## Event types (`data: {json}`; `id:` line = Responses `sequence_number`)
| type | fields | meaning |
|---|---|---|
| `status` | `phase, label, tool?, id?` | what the AI is doing now ("Searching the web…", "Running get_contact…"); first status carries the response `id` |
| `delta` | `text` | next chunk of output text |
| `partial` | `json` | structured output so far (tolerant partial-JSON parse) |
| `reasoning` | `text` | reasoning-summary chunk (only when requested) |
| `image` | `index, b64, partial` | progressive image preview |
| `result` | `data` | dual-mode functions: exactly what the JSON mode returns |
| `done` | `id, text, usage, citations, json, incomplete?` | terminal success |
| `error` | `message` | terminal failure |
Comments `: ping` are heartbeats (every 15 s). The stream ends with `data: [DONE]`.

## Endpoints
- `POST /.netlify/functions/ai-stream` — generic proxy (`role,input,instructions,schema,tools,conversationId,background,reasoningSummary,resume`).
- Dual-mode functions (`runDual` in `netlify/functions/_stream/dual.js`): same URL returns JSON, or SSE when `Accept: text/event-stream`, `body.stream:true` or `?stream=true`.
- Panel endpoints (`createPanelHandler` in `netlify/functions/_lib/panelHandler.js`, dual-mode, caller's rows only, outbound copy moderated): `memory-get`, `skills-api`, `mood-preview`, `playbooks-ai`, `deal-heatmap`, `video-agent`, `voice-agent`. Short answers that need no model call (empty memory, no open deals) are still delivered as SSE (`result` then `done`) when a stream was requested.
- `agent-runner` — allow-listed dispatcher to the existing dual-mode agent functions (`_lib/agentTargets.js`); the target's JSON/SSE is streamed straight through after an ownership check of `contactId` / `dealId`.
- Long jobs: `background:true` + stream; if the connection drops the client re-attaches with `resume:{responseId,startingAfter}` (`GET /v1/responses/{id}?stream=true&starting_after=N`).

## Client
`src/services/aiClient.ts` (`aiStream`, `aiJson(req, handlers)`), `src/hooks/useAIStream.ts`, `src/components/ui/StreamingOutput.tsx`, parser `src/lib/streaming/streamClient.ts`.

Non-visible pipelines (scheduled autopilot, batch apply, webhook completion) intentionally stay non-streaming and are listed in `scripts/streaming-allowlist.txt`.

## AI controls sweep (every UI AI control must stream)
`tests/playwright/ai-sweep.spec.ts` builds the app (production build, `VITE_STREAM_GUARD=1`, `VITE_SUPABASE_URL` pointing at the drip server), serves it with `vite preview`, answers every `/.netlify/functions/*` and Supabase `/functions/v1/*` call with a real dripping SSE stream (`tests/playwright/helpers/aiSweepDrip.ts`, 150-300 ms between events) and clicks each control listed in `tests/playwright/helpers/aiSweepControls.ts` (contact sidebar, every contact-detail tab, all 14 SDR agents, the 12 agent "Run" buttons, contacts-list controls, New Contact research). Per control it asserts: (a) every request asked for a stream (`Accept: text/event-stream`, `stream:true` or `?stream=true`, checked server-side on the real request), (b) `window.__streamViolations` stays empty, (c) when output appears on screen it grows across >= 3 snapshots while the stream is still open. Controls that cannot produce output (dead handlers, external links, no deal in the demo data) are recorded SKIPPED with the reason, never as a pass; a documented non-streaming pipeline is also SKIPPED. A completeness test fails when a mounted UI file that consumes an AI endpoint has no control.

```
npx playwright test -c tests/playwright/ai-sweep.config.ts                      # build + serve + sweep (~13 min)
AI_SWEEP_SKIP_BUILD=1 npx playwright test -c tests/playwright/ai-sweep.config.ts # reuse the build in $AI_SWEEP_DIST
AI_SWEEP_ONLY='^sdr\.' npx playwright test -c tests/playwright/ai-sweep.config.ts # subset by control id
```
Report: `$AI_SWEEP_REPORT` (JSON, default in the session scratchpad) plus a printed table; light/dark screenshots of a subset go to `$SHOTS`. Ports: app 5311 (`AI_SWEEP_PORT`), drip server 5312 (`AI_SWEEP_DRIP_PORT`). Set `CHROME_PATH` to use another browser (default `/usr/bin/google-chrome`, `--no-sandbox`).

## Unmounted AI panels
Components that consume an AI endpoint but are intentionally not mounted in the app (so the sweep cannot click them) are listed, with the harness that covers each and how to mount one, in [UNMOUNTED_PANELS.md](./UNMOUNTED_PANELS.md).
