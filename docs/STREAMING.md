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
