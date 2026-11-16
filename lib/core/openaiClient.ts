/**
 * Server-side OpenAI Responses API client for lib/ (plain fetch, no SDK, no browser key).
 *
 * - Model ids/effort come from src/config/models.json (roles: default | thinking | fast | pro)
 * - Mirrors netlify/functions/_responses.js: reasoning models never receive temperature/top_p
 *   unless effort === "none"; structured output via text.format json_schema (strict).
 * - Reads OPENAI_API_KEY from process.env (never VITE_* / browser keys).
 */
import models from "../../src/config/models.json";

export type ModelRole = "default" | "thinking" | "fast" | "pro";
export type Effort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

const EFFORTS = new Set(["none", "minimal", "low", "medium", "high", "xhigh"]);
const OPENAI_BASE = "https://api.openai.com/v1";

type TextRoles = Record<string, { model: string; effort: string }>;
const TEXT_ROLES = (models as any).text as TextRoles;

export function resolveModel(roleOrModel: string = "default", effortOverride?: string) {
  const entry = TEXT_ROLES[roleOrModel];
  let model: string;
  let effort: string | undefined;
  if (entry) {
    const key = roleOrModel.toUpperCase();
    model =
      process.env[`SMARTCRM_${key}_MODEL`] ||
      (roleOrModel === "default" ? process.env.SMARTCRM_MODEL : undefined) ||
      (roleOrModel === "thinking" ? process.env.SMARTCRM_THINKING_MODEL : undefined) ||
      (roleOrModel === "fast" ? process.env.SMARTCRM_FAST_MODEL : undefined) ||
      entry.model;
    effort = process.env[`SMARTCRM_${key}_EFFORT`] || entry.effort;
  } else {
    model = roleOrModel;
    effort = TEXT_ROLES.default.effort;
  }
  if (effortOverride) effort = effortOverride;
  if (!effort || !EFFORTS.has(effort)) effort = undefined;
  return { model, effort: effort as Effort | undefined };
}

/** Make a JSON schema OpenAI-strict (additionalProperties:false, all props required). */
export function strictify(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(strictify);
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

export interface CreateResponseOptions {
  role?: ModelRole | string;
  model?: string;
  effort?: Effort;
  instructions?: string;
  input: string | any[];
  schema?: any;
  schemaName?: string;
  tools?: any[];
  toolChoice?: any;
  maxOutputTokens?: number;
  previousResponseId?: string;
  temperature?: number;
  verbosity?: "low" | "medium" | "high";
  include?: string[];
  store?: boolean;
  timeoutMs?: number;
  retries?: number;
}

export interface FunctionCall {
  callId: string;
  name: string;
  arguments: any;
}

export interface NormalizedUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

export interface ResponseResult {
  id: string;
  status: string;
  text: string;
  json: any;
  citations: { url: string; title: string }[];
  functionCalls: FunctionCall[];
  usage: NormalizedUsage | null;
  output: any[];
  model: string;
  raw: any;
}

export function buildParams(opts: CreateResponseOptions): Record<string, any> {
  const { model, effort } = resolveModel(opts.model || opts.role || "default", opts.effort);
  const params: Record<string, any> = { model, input: opts.input };
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
  if (opts.verbosity) params.text = { ...(params.text || {}), verbosity: opts.verbosity };
  if (opts.tools?.length) params.tools = opts.tools;
  if (opts.toolChoice) params.tool_choice = opts.toolChoice;
  if (opts.previousResponseId) params.previous_response_id = opts.previousResponseId;
  params.store = typeof opts.store === "boolean" ? opts.store : false;
  const include = new Set<string>(opts.include || []);
  if ((opts.tools || []).some((t) => t?.type === "web_search")) include.add("web_search_call.action.sources");
  if (include.size) params.include = [...include];
  return params;
}

export function extractText(response: any): string {
  if (!response) return "";
  if (typeof response.output_text === "string" && response.output_text) return response.output_text;
  const parts: string[] = [];
  for (const item of response.output || []) {
    if (item.type !== "message") continue;
    for (const c of item.content || []) {
      if (c.type === "output_text" && typeof c.text === "string") parts.push(c.text);
    }
  }
  return parts.join("");
}

export function extractCitations(response: any): { url: string; title: string }[] {
  const seen = new Set<string>();
  const out: { url: string; title: string }[] = [];
  for (const item of response?.output || []) {
    if (item.type !== "message") continue;
    for (const c of item.content || []) {
      for (const a of c.annotations || []) {
        if (a.type === "url_citation" && a.url && !seen.has(a.url)) {
          seen.add(a.url);
          out.push({ url: a.url, title: a.title || a.url });
        }
      }
    }
  }
  return out;
}

export function extractFunctionCalls(response: any): FunctionCall[] {
  return (response?.output || [])
    .filter((i: any) => i.type === "function_call")
    .map((i: any) => {
      let args: any = {};
      try {
        args = JSON.parse(i.arguments || "{}");
      } catch {
        /* leave empty */
      }
      return { callId: i.call_id, name: i.name, arguments: args };
    });
}

/** Responses API usage is snake_case; normalise to camelCase with safe defaults. */
export function normalizeUsage(usage: any): NormalizedUsage | null {
  if (!usage) return null;
  const inputTokens = Number(usage.input_tokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? 0);
  return {
    inputTokens,
    outputTokens,
    reasoningTokens: Number(usage.output_tokens_details?.reasoning_tokens ?? 0),
    cachedTokens: Number(usage.input_tokens_details?.cached_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? inputTokens + outputTokens),
  };
}

export function parseJson(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      /* continue */
    }
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* continue */
    }
  }
  return null;
}

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

class OpenAIHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function postJson(path: string, body: unknown, timeoutMs: number, retries: number): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${OPENAI_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new OpenAIHttpError(res.status, `OpenAI ${res.status}: ${t.slice(0, 500)}`);
      }
      return await res.json();
    } catch (err: any) {
      lastErr = err;
      const status = err?.status;
      const retryable = status === 429 || (status >= 500 && status < 600) || (!status && err?.name !== "Error");
      if (attempt === retries || !retryable) break;
      await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

export async function createResponse(opts: CreateResponseOptions): Promise<ResponseResult> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const retries = opts.retries ?? 2;
  const params = buildParams(opts);
  const response = await postJson("/responses", params, timeoutMs, retries);
  const text = extractText(response);
  return {
    id: response.id,
    status: response.status,
    text,
    json: opts.schema ? parseJson(text) : null,
    citations: extractCitations(response),
    functionCalls: extractFunctionCalls(response),
    usage: normalizeUsage(response.usage),
    output: response.output || [],
    model: response.model || params.model,
    raw: response,
  };
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; id: string | null; text: string; usage: NormalizedUsage | null }
  | { type: "error"; message: string };

/** Streaming Responses call (SSE). Yields delta events, then done (or error). */
export async function* streamResponse(opts: CreateResponseOptions): AsyncGenerator<StreamEvent> {
  const params = { ...buildParams(opts), stream: true };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 120_000);
  let full = "";
  try {
    const res = await fetch(`${OPENAI_BASE}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify(params),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      yield { type: "error", message: `OpenAI ${res.status}: ${t.slice(0, 300)}` };
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        let ev: any;
        try {
          ev = JSON.parse(dataLine.slice(5).trim());
        } catch {
          continue;
        }
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") {
          full += ev.delta;
          yield { type: "delta", text: ev.delta };
        } else if (ev.type === "response.completed") {
          yield {
            type: "done",
            id: ev.response?.id ?? null,
            text: full || extractText(ev.response),
            usage: normalizeUsage(ev.response?.usage),
          };
          return;
        } else if (ev.type === "response.failed") {
          yield { type: "error", message: ev.response?.error?.message || "Response failed" };
          return;
        } else if (ev.type === "error") {
          yield { type: "error", message: ev.message || "Stream error" };
          return;
        }
      }
    }
    yield { type: "done", id: null, text: full, usage: null };
  } catch (err: any) {
    yield { type: "error", message: err?.message || "Stream failed" };
  } finally {
    clearTimeout(timer);
  }
}

/** Text-to-speech. Returns raw audio bytes. */
export async function synthesizeSpeech(input: string, voice = "alloy"): Promise<ArrayBuffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  try {
    const res = await fetch(`${OPENAI_BASE}/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify({
        model: process.env.SMARTCRM_TTS_MODEL || (models as any).audio.tts,
        voice,
        input,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new OpenAIHttpError(res.status, `OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

/** Speech-to-text for a raw audio buffer. */
export async function transcribeBuffer(buffer: Buffer, filename = "audio.mp3", mime = "audio/mpeg"): Promise<string> {
  const form = new FormData();
  form.append("model", process.env.SMARTCRM_TRANSCRIBE_MODEL || (models as any).audio.transcribe);
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mime }), filename);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  try {
    const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new OpenAIHttpError(res.status, `OpenAI transcription ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json: any = await res.json();
    return String(json.text ?? "");
  } finally {
    clearTimeout(timer);
  }
}
