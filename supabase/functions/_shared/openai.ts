/**
 * Shared OpenAI Responses API helper for Supabase Edge Functions (Deno, plain fetch).
 *
 * Mirrors netlify/functions/_responses.js:
 *  - roles: default | thinking | fast | pro -> model ids + reasoning effort
 *  - reasoning models never receive temperature/top_p unless effort === "none"
 *  - `instructions` + `input`, `max_output_tokens`, structured output via text.format json_schema (strict)
 *  - hosted `web_search` tool supported via `tools: [{ type: "web_search" }]`
 *  - retry on 429/5xx with backoff, AbortController timeout
 */

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
  if (opts.previousResponseId) params.previous_response_id = opts.previousResponseId;
  if ((opts.tools || []).some((t) => t.type === "web_search")) {
    params.include = ["web_search_call.action.sources"];
  }
  return params;
}

// deno-lint-ignore no-explicit-any
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

// deno-lint-ignore no-explicit-any
export function extractCitations(response: any) {
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

// deno-lint-ignore no-explicit-any
export function parseJson(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) { /* fall through */ }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch (_) { /* continue */ }
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (_) { /* continue */ }
  }
  return null;
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
