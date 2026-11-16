/**
 * Shared OpenAI Responses API helper for Supabase Edge Functions (Deno, plain fetch).
 *
 * Mirrors netlify/functions/_responses.js:
 *  - roles: default | thinking | fast | pro -> model ids + reasoning effort
 *  - reasoning models never receive temperature/top_p unless effort === "none"
 *  - `instructions` + `input`, `max_output_tokens`, structured output via text.format json_schema (strict)
 *  - hosted `web_search` tool supported via `tools: [{ type: "web_search" }]`
 *  - retry on 429/5xx with backoff, AbortController timeout
 *  - streamResponse(): Responses `stream:true` -> our UI events (status/delta/partial/image/done/error),
 *    mapper in ./streaming.ts (identical to netlify/functions/_responses.js createStreamMapper)
 *  - respondDual(): JSON (unchanged) or SSE (`Accept: text/event-stream`, body.stream:true, ?stream=true) with a
 *    final `result` event holding exactly the JSON payload
 */
import { AsyncLocalStorage } from "node:async_hooks";
import {
  createStreamMapper,
  extractCitations,
  extractText,
  type MapperOptions,
  parseJson,
  parseOpenAISse,
  SSE_HEADERS,
  toSseStream,
  type UiEvent,
  isStreamRequested,
} from "./streaming.ts";

export { extractCitations, extractText, isStreamRequested, parseJson };
export type { UiEvent };

// MUST stay in sync with src/config/models.json (text roles). Enforced by tests/supabase-openai-shared.test.ts.
export const MODEL_ROLES: Record<string, { model: string; effort: string }> = {
  default: { model: "gpt-6.1-sol", effort: "medium" },
  thinking: { model: "gpt-6-astra", effort: "high" },
  fast: { model: "gpt-6-luna", effort: "none" },
  pro: { model: "gpt-6-astra", effort: "xhigh" },
};

const EFFORTS = new Set(["none", "minimal", "low", "medium", "high", "xhigh"]);

export type Effort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

export interface CreateResponseOptions {
  role?: string;
  model?: string;
  effort?: Effort;
  instructions?: string;
  input: string | unknown[];
  schema?: Record<string, unknown>;
  schemaName?: string;
  tools?: Record<string, unknown>[];
  maxOutputTokens?: number;
  previousResponseId?: string;
  temperature?: number;
  timeoutMs?: number;
  retries?: number;
  toolChoice?: unknown;
  /** stream only: request reasoning summaries (`reasoning` events) */
  reasoningSummary?: boolean;
}

export interface OpenAIResult {
  id: string;
  text: string;
  // deno-lint-ignore no-explicit-any
  json: any;
  citations: { url: string; title: string }[];
  // deno-lint-ignore no-explicit-any
  usage: any;
}

export class OpenAIError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function resolveModel(roleOrModel = "default", effortOverride?: string) {
  const entry = MODEL_ROLES[roleOrModel];
  let model: string;
  let effort: string | undefined;
  if (entry) {
    const key = roleOrModel.toUpperCase();
    const env = (k: string) => Deno.env.get(k) || undefined;
    model = env(`SMARTCRM_${key}_MODEL`) ||
      (roleOrModel === "default" ? env("SMARTCRM_MODEL") : undefined) ||
      (roleOrModel === "thinking" ? env("SMARTCRM_THINKING_MODEL") : undefined) ||
      (roleOrModel === "fast" ? env("SMARTCRM_FAST_MODEL") : undefined) ||
      entry.model;
    effort = env(`SMARTCRM_${key}_EFFORT`) || entry.effort;
  } else {
    model = roleOrModel;
    effort = MODEL_ROLES.default.effort;
  }
  if (effortOverride) effort = effortOverride;
  if (!effort || !EFFORTS.has(effort)) effort = undefined;
  return { model, effort };
}

// deno-lint-ignore no-explicit-any
export function strictify(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(strictify);
  // deno-lint-ignore no-explicit-any
  const out: any = { ...schema };
  if (out.type === "object" && out.properties) {
    const keys = Object.keys(out.properties);
    out.properties = Object.fromEntries(keys.map((k) => [k, strictify(out.properties[k])]));
    out.required = keys;
    out.additionalProperties = false;
  }
  if (out.items) out.items = strictify(out.items);
  for (const k of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(out[k])) out[k] = out[k].map(strictify);
  }
  return out;
}

export function buildParams(opts: CreateResponseOptions) {
  const { model, effort } = resolveModel(opts.model || opts.role || "default", opts.effort);
  const params: Record<string, unknown> = { model, input: opts.input, store: false };
  if (opts.instructions) params.instructions = opts.instructions;
  if (effort) params.reasoning = { effort };
  if (effort === "none" && typeof opts.temperature === "number") params.temperature = opts.temperature;
  if (opts.maxOutputTokens) params.max_output_tokens = opts.maxOutputTokens;
  if (opts.schema) {
    params.text = {
      format: {
        type: "json_schema",
        name: String(opts.schemaName || "result").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64),
        strict: true,
        schema: strictify(opts.schema),
      },
    };
  }
  if (opts.tools?.length) params.tools = opts.tools;
  if (opts.toolChoice) params.tool_choice = opts.toolChoice;
  if (opts.previousResponseId) params.previous_response_id = opts.previousResponseId;
  if ((opts.tools || []).some((t) => t.type === "web_search")) {
    params.include = ["web_search_call.action.sources"];
  }
  return params;
}

/** Non-streaming Responses API call. Throws OpenAIError on failure (never returns fake data). */
export async function createResponse(opts: CreateResponseOptions): Promise<OpenAIResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new OpenAIError("OPENAI_API_KEY is not configured", 500);

  const params = buildParams(opts);
  const retries = opts.retries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(params),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new OpenAIError(`OpenAI API error ${res.status}: ${body.slice(0, 500)}`, res.status);
      }
      const response = await res.json();
      if (response.status === "failed") {
        throw new OpenAIError(response.error?.message || "OpenAI response failed", 502);
      }
      const text = extractText(response);
      return {
        id: response.id,
        text,
        json: opts.schema ? parseJson(text) : null,
        citations: extractCitations(response),
        usage: response.usage ?? null,
      };
    } catch (err) {
      lastErr = err instanceof OpenAIError
        ? err
        : new OpenAIError(
          (err as Error)?.name === "AbortError" ? "OpenAI request timed out" : `OpenAI request failed: ${(err as Error)?.message}`,
          (err as Error)?.name === "AbortError" ? 504 : 502,
        );
      const status = (lastErr as OpenAIError).status;
      const retryable = status === 429 || status >= 500;
      if (attempt === retries || !retryable) break;
      await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/**
 * Streaming Responses API call (plain fetch + SSE). Async generator of UI events; never throws:
 * failures become a terminal `{type:'error'}` event. Retries only the initial connection on 429/5xx.
 */
export async function* streamResponse(opts: CreateResponseOptions): AsyncGenerator<UiEvent> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    yield { type: "error", message: "OPENAI_API_KEY is not configured" };
    return;
  }
  const params = buildParams(opts) as Record<string, unknown>;
  params.stream = true;
  const reasoning = params.reasoning as Record<string, unknown> | undefined;
  if (opts.reasoningSummary && reasoning) params.reasoning = { ...reasoning, summary: "auto" };

  const mapperOpts: MapperOptions = { schema: opts.schema, reasoningSummary: opts.reasoningSummary };
  const mapper = createStreamMapper(mapperOpts);
  const retries = opts.retries ?? 1;
  const timeoutMs = opts.timeoutMs ?? 300_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let sawTerminal = false;
  try {
    let res: Response | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(params),
        signal: ctrl.signal,
      });
      if (res.ok) break;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === retries) {
        const text = await res.text().catch(() => "");
        yield { type: "error", message: `OpenAI API error ${res.status}: ${text.slice(0, 300)}` };
        return;
      }
      await res.body?.cancel();
      await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
    }
    if (!res || !res.body) {
      yield { type: "error", message: "OpenAI returned no stream" };
      return;
    }
    for await (const event of parseOpenAISse(res.body)) {
      for (const e of mapper.map(event)) {
        if (e.type === "done" || e.type === "error") sawTerminal = true;
        yield e;
      }
      if (sawTerminal) return;
    }
    if (!sawTerminal) {
      yield {
        type: "done", id: null, text: mapper.text, usage: null, citations: [],
        json: opts.schema ? parseJson(mapper.text) : null,
      };
    }
  } catch (err) {
    yield {
      type: "error",
      message: (err as Error)?.name === "AbortError" ? "OpenAI request timed out" : ((err as Error)?.message || "Stream failed"),
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface DualOptions {
  req: Request;
  /** parsed request body (for `stream:true`) */
  // deno-lint-ignore no-explicit-any
  body?: any;
  options: CreateResponseOptions;
  /** Build the JSON payload (same object in both modes). May be async. Throwing -> 500 (JSON) / `error` event (SSE). */
  // deno-lint-ignore no-explicit-any
  finalize: (r: OpenAIResult) => any | Promise<any>;
  /** CORS headers etc. merged into every response */
  headers: Record<string, string>;
  /** SSE mode: runs once when the stream ends (cleanup) */
  onEnd?: () => void | Promise<void>;
}

/**
 * One call, two shapes. JSON (default): `finalize(createResponse(...))` as JSON, exactly as before.
 * SSE: streamResponse events, then `{type:'result', data}` (= the JSON payload) just before `done`.
 */
export async function respondDual(o: DualOptions): Promise<Response> {
  if (!isStreamRequested(o.req, o.body)) {
    const r = await createResponse(o.options);
    const data = await o.finalize(r);
    return new Response(JSON.stringify(data), { headers: { ...o.headers, "Content-Type": "application/json" } });
  }
  async function* events(): AsyncGenerator<UiEvent> {
    for await (const ev of streamResponse(o.options)) {
      if (ev.type === "done") {
        try {
          const r: OpenAIResult = {
            id: String(ev.id ?? ""),
            text: String(ev.text ?? ""),
            json: ev.json ?? null,
            citations: (ev.citations as OpenAIResult["citations"]) ?? [],
            usage: ev.usage ?? null,
          };
          yield { type: "status", phase: "finalizing", label: "Finishing up…" };
          yield { type: "result", data: await o.finalize(r) };
        } catch (err) {
          yield { type: "error", message: (err as Error)?.message || "Could not build the result" };
          return;
        }
      }
      yield ev;
      if (ev.type === "error") return;
    }
  }
  return new Response(toSseStream(events(), { onEnd: o.onEnd }), { headers: { ...o.headers, ...SSE_HEADERS } });
}

// ---------------------------------------------------------------- multi-call tasks (several model calls, one SSE stream)
interface TaskCtx {
  push: (ev: UiEvent) => void;
}
const taskStore = new AsyncLocalStorage<TaskCtx>();

/**
 * Model call that is stream-aware inside respondDualTask(): in SSE mode its live events are forwarded to the
 * client (`forward`: "all" | "status" (status/reasoning only, for parallel calls) | "none"); outside a task it is
 * a plain createResponse(). Always resolves with the final result so callers keep their JSON-mode logic.
 */
export async function respond(
  options: CreateResponseOptions,
  opts: { forward?: "all" | "status" | "none" } = {},
): Promise<OpenAIResult> {
  const ctx = taskStore.getStore();
  if (!ctx) return await createResponse(options);
  const forward = opts.forward ?? "all";
  for await (const ev of streamResponse(options)) {
    if (ev.type === "done") {
      return {
        id: String(ev.id ?? ""),
        text: String(ev.text ?? ""),
        json: ev.json ?? null,
        citations: (ev.citations as OpenAIResult["citations"]) ?? [],
        usage: ev.usage ?? null,
      };
    }
    if (ev.type === "error") throw new OpenAIError(String(ev.message || "AI request failed"), 502);
    if (forward === "all" || (forward === "status" && (ev.type === "status" || ev.type === "reasoning"))) ctx.push(ev);
  }
  throw new OpenAIError("AI stream ended without a result", 502);
}

export interface DualTaskOptions {
  req: Request;
  // deno-lint-ignore no-explicit-any
  body?: any;
  headers: Record<string, string>;
  /** Does the work (any number of `respond()` calls) and returns the JSON payload. */
  // deno-lint-ignore no-explicit-any
  run: () => Promise<any>;
  onEnd?: () => void | Promise<void>;
}

/** respondDual for functions that make several model calls: JSON = `run()` result; SSE = live events, `result`, `done`. */
export async function respondDualTask(o: DualTaskOptions): Promise<Response> {
  if (!isStreamRequested(o.req, o.body)) {
    const data = await o.run();
    return new Response(JSON.stringify(data), { headers: { ...o.headers, "Content-Type": "application/json" } });
  }
  async function* events(): AsyncGenerator<UiEvent> {
    const queue: UiEvent[] = [];
    let wake: (() => void) | null = null;
    let finished = false;
    let failure: unknown = null;
    // deno-lint-ignore no-explicit-any
    let result: any;
    const notify = () => {
      const w = wake;
      wake = null;
      if (w) w();
    };
    const work = taskStore.run({ push: (e) => { queue.push(e); notify(); } }, async () => {
      try {
        result = await o.run();
      } catch (e) {
        failure = e;
      } finally {
        finished = true;
        notify();
      }
    });
    for (;;) {
      while (queue.length) yield queue.shift()!;
      if (finished) break;
      await new Promise<void>((r) => { wake = r; });
    }
    await work;
    if (failure) {
      yield { type: "error", message: (failure as Error)?.message || "Request failed" };
      return;
    }
    yield { type: "result", data: result };
    yield { type: "done", id: null, text: "", usage: null, citations: [], json: null };
  }
  return new Response(toSseStream(events(), { onEnd: o.onEnd }), { headers: { ...o.headers, ...SSE_HEADERS } });
}
