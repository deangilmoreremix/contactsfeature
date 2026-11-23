# Unmounted AI panels

These UI components call an AI endpoint but are **intentionally not mounted** anywhere reachable from `src/main.tsx`
(design unchanged; nothing is wired into a route, modal or sidebar). Because the app never renders them, the controls
sweep (`tests/playwright/ai-sweep.spec.ts`) cannot click them. They are tracked in `UNMOUNTED` in
`tests/playwright/helpers/aiSweepControls.ts` and verified through a harness or unit test instead (streaming rules still
apply: see [STREAMING.md](./STREAMING.md)).

`tests/unmounted-panels-doc.test.ts` parses the table below and fails when the names differ from `UNMOUNTED`, so update
both together.

| Panel | Endpoint(s) | Covered by |
| --- | --- | --- |
| `HeatmapPanel` | `deal-heatmap` | `tests/playwright/panel-endpoints.spec.ts` (`panels.config.ts` harness); `src/tests/heatmap-panel.test.tsx` |
| `MemoryPanel` | `memory-get` | `tests/playwright/panel-endpoints.spec.ts` (`panels.config.ts` harness) |
| `SkillsPanel` | `skills-api` | `tests/playwright/panel-endpoints.spec.ts` (`panels.config.ts` harness) |
| `MoodPanel` | `mood-preview` | `tests/playwright/panel-endpoints.spec.ts` (`panels.config.ts` harness) |
| `VideoAgentPanel` | `video-agent` | `tests/playwright/panel-endpoints.spec.ts` (`panels.config.ts` harness); `src/tests/video-agent-panel.test.tsx` |
| `VoiceAgentPanel` | `voice-agent` | `tests/playwright/panel-endpoints.spec.ts` (`panels.config.ts` harness); `src/tests/voice-agent-panel.test.tsx` |
| `PlaybooksPanel` | `playbooks-ai` | `tests/playwright/panel-endpoints.spec.ts` (`panels.config.ts` harness); `src/tests/playbooks-panel.test.tsx` |
| `AutopilotControlPanel` | `run-agent` | `tests/playwright/callers-streaming.spec.ts` (`callers.config.ts` harness) |
| `GTMPromptHub` | `generate-with-prompt` | `tests/playwright/callers-streaming.spec.ts` (`callers.config.ts` harness) |
| `SalesForecastingWidget` | `sales-forecasting` | `tests/playwright/streaming-panels.spec.ts` (`streaming.config.ts` harness) |
| `FeatureAnalysisStudio` | `ai-task` | `tests/playwright/callers-streaming.spec.ts` (`callers.config.ts` harness) |
| `AISalesIntelligencePanel` | `ai-stream` | `tests/playwright/callers-streaming.spec.ts` (lead-nurturing); `src/tests/ai-sales-intelligence-panel.test.tsx` |
| `AutomationBuilder` | `ai-stream` via `generateAutomationRule(prompt, live)` (`automation_rule`) | not covered by a harness; `tests/automation-core.test.ts` covers the service (`live` is a required argument) |
| `AgentRunner` | `agent-runner` | not covered by a harness |
| `SmartAIControls` | `ai-stream` | not covered by a harness |
| `EnhancedAISDRPanel` | SDR agent functions | not covered by a harness |

## Also test-only: `AIEnhancedContactCard`

`src/components/contacts/AIEnhancedContactCard.tsx` is only rendered in tests (`src/tests/ai-buttons.test.tsx`,
`src/tests/performance.test.tsx`); the live contact list uses other card components. It is not in `UNMOUNTED` because it
has no direct AI endpoint of its own in the sweep.

## How to mount one

1. Import the component where it should live (a route in `src/App.tsx`, a tab in a modal, or a sidebar entry) and render it
   with its props (most take an optional `contact` / `contactId`).
2. Pass live callbacks through the service call (`live.run((opts) => service(input, opts))` via `src/hooks/useLiveCall.ts`)
   so the request streams; a plain request is a `STREAM_VIOLATION` in dev.
3. Add a control for it in `tests/playwright/helpers/aiSweepControls.ts` and remove its entry from `UNMOUNTED`, then remove
   its row from the table above (the doc test enforces both lists stay equal).
4. Run the sweep for it: `AI_SWEEP_ONLY='^<control id>$' npx playwright test -c tests/playwright/ai-sweep.config.ts`.
