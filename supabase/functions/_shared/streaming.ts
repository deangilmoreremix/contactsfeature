/**
 * Streaming core for Supabase Edge Functions (Deno) — pure TypeScript, NO Deno globals, so the same file runs
 * under Node in tests/supabase-openai-shared.test.ts.
 *
 * Port of netlify/functions/_responses.js `createStreamMapper` + netlify/functions/_stream/{partialJson,sse}.js.
 * Both mappers MUST produce identical events for identical Responses stream events (enforced by the test).
 * Event contract: docs/STREAMING.md.
 */

// deno-lint-ignore no-explicit-any
type Any = any;

export type UiEvent = { type: string; seq?: number; [k: string]: unknown };

// ---------------------------------------------------------------- response helpers (shared with openai.ts)
export function extractText(response: Any): string {
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

export function extractCitations(response: Any) {
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

export function parseJson(text: string): Any {
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

// ---------------------------------------------------------------- tolerant partial JSON
export function completePartialJson(input: string): string {
  const s = String(input || "");
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let out = "";

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    out += c;
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") stack.pop();
  }

  if (inString) {
    if (escaped) out = out.slice(0, -1);
    out = out.replace(/\\u[0-9a-fA-F]{0,3}$/, "");
    out += '"';
  }

  out = out.replace(/[\s,]+$/, "");
  out = out.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, "");
  if (stack[stack.length - 1] === "{") {
    out = out.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*$/, (m: string, off: number) => {
      const before = out.slice(0, off).replace(/\s+$/, "");
      return m.trimStart().startsWith(",") || before.endsWith("{") || off === 0 ? "" : m;
    });
  }
  out = out.replace(/[\s,]+$/, "");
  out = out.replace(
    /(?:^|[:,\[\s])(?:t(?:r(?:ue?)?)?|f(?:a(?:l(?:se?)?)?)?|n(?:u(?:ll?)?)?)$/,
    (m: string) => m.slice(0, 1) === "t" || m.slice(0, 1) === "f" || m.slice(0, 1) === "n" ? "" : m.slice(0, 1),
  );
  out = out.replace(/[-+.eE]$/, "");
  out = out.replace(/[\s,]+$/, "");
  out = out.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, "");
  out = out.replace(/[\s,]+$/, "");

  for (let i = stack.length - 1; i >= 0; i--) out += stack[i] === "{" ? "}" : "]";
  return out;
}

export function parsePartialJson(input: string): Any {
  const s = String(input || "").trim();
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch (_) { /* fall through */ }
  try {
    return JSON.parse(completePartialJson(s));
  } catch (_) {
    return undefined;
  }
}

// ---------------------------------------------------------------- event mapper
const TOOL_LABELS: Record<string, Record<string, string>> = {
  web_search: { in_progress: "Starting web search…", searching: "Searching the web…", completed: "Finished searching the web" },
  file_search: { in_progress: "Searching documents…", searching: "Searching documents…", completed: "Finished searching documents" },
  image_generation: { in_progress: "Starting image generation…", generating: "Generating image…", completed: "Image ready" },
};

export interface MapperOptions {
  schema?: unknown;
  reasoningSummary?: boolean;
}

/** Pure mapper: Responses stream events -> our UI events. Keep in lock-step with createStreamMapper (_responses.js). */
export function createStreamMapper(opts: MapperOptions = {}) {
  let full = "";
  let started = false;
  let lastPartial = "";

  function map(event: Any): UiEvent[] {
    const out: UiEvent[] = [];
    const seq = typeof event.sequence_number === "number" ? event.sequence_number : undefined;
    const emit = (e: UiEvent) => out.push(seq === undefined ? e : { ...e, seq });
    const type = event.type || "";

    switch (type) {
      case "response.created":
      case "response.queued":
      case "response.in_progress":
        if (!started) {
          started = true;
          emit({ type: "status", phase: "started", label: "Thinking…", id: event.response && event.response.id });
        }
        break;
      case "response.output_text.delta": {
        full += event.delta || "";
        emit({ type: "delta", text: event.delta || "" });
        if (opts.schema) {
          const json = parsePartialJson(full);
          const key = json === undefined ? "" : JSON.stringify(json);
          if (key && key !== lastPartial) {
            lastPartial = key;
            emit({ type: "partial", json });
          }
        }
        break;
      }
      case "response.reasoning_summary_text.delta":
        if (opts.reasoningSummary && event.delta) emit({ type: "reasoning", text: event.delta });
        break;
      case "response.output_item.added": {
        const item = event.item || {};
        if (item.type === "reasoning") emit({ type: "status", phase: "reasoning", label: "Thinking it through…" });
        else if (item.type === "function_call") emit({ type: "status", tool: item.name, phase: "calling", label: `Running ${item.name}…` });
        else if (item.type === "mcp_call") emit({ type: "status", tool: item.name, phase: "calling", label: `Running ${item.name}…` });
        break;
      }
      case "response.output_item.done": {
        const item = event.item || {};
        if (item.type === "image_generation_call" && typeof item.result === "string" && item.result) {
          emit({ type: "image", index: event.output_index || 0, b64: item.result, partial: false });
        }
        break;
      }
      case "response.image_generation_call.partial_image":
        emit({ type: "image", index: event.partial_image_index || 0, b64: event.partial_image_b64, partial: true });
        break;
      case "response.completed":
      case "response.incomplete": {
        const r = event.response || {};
        const citations = extractCitations(r);
        const text = full || extractText(r);
        emit({
          type: "done",
          id: r.id || null,
          text,
          usage: r.usage || null,
          citations,
          json: opts.schema ? parseJson(text) : null,
          ...(type === "response.incomplete" ? { incomplete: (r.incomplete_details && r.incomplete_details.reason) || true } : {}),
        });
        break;
      }
      case "response.failed":
        emit({ type: "error", message: (event.response && event.response.error && event.response.error.message) || "Response failed" });
        break;
      case "error":
        emit({ type: "error", message: event.message || "Stream error" });
        break;
      default: {
        const m = /^response\.(web_search|file_search|image_generation)_call\.(in_progress|searching|generating|completed)$/.exec(type);
        if (m) emit({ type: "status", tool: m[1], phase: m[2], label: (TOOL_LABELS[m[1]] || {})[m[2]] || `${m[1]} ${m[2]}` });
        break;
      }
    }
    return out;
  }
  return { map, get text() { return full; } };
}

// ---------------------------------------------------------------- SSE plumbing
/** Parse OpenAI's `data: {json}` SSE lines from a byte stream into event objects. */
export async function* parseOpenAISse(body: ReadableStream<Uint8Array>): AsyncGenerator<Any> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const data = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).replace(/^ /, "")).join("\n");
        if (!data || data === "[DONE]") continue;
        try {
          yield JSON.parse(data);
        } catch (_) { /* ignore malformed frame */ }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (_) { /* ignore */ }
  }
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

export function frame(event: UiEvent): string {
  const id = event && typeof event.seq === "number" ? `id: ${event.seq}\n` : "";
  return `${id}data: ${JSON.stringify(event)}\n\n`;
}

/** Wrap an async iterable of UI events into an SSE ReadableStream with heartbeats; always ends with [DONE]. */
export function toSseStream(
  events: AsyncIterable<UiEvent>,
  opts: { heartbeatMs?: number; onEnd?: () => void | Promise<void>; publicError?: string } = {},
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const heartbeatMs = opts.heartbeatMs === undefined ? 15000 : opts.heartbeatMs;
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (s: string) => {
        if (!closed) controller.enqueue(enc.encode(s));
      };
      if (heartbeatMs > 0) timer = setInterval(() => write(": ping\n\n"), heartbeatMs);
      try {
        for await (const ev of events) {
          if (closed) break;
          write(frame(ev));
        }
      } catch (_) {
        write(frame({ type: "error", message: opts.publicError || "AI request failed" }));
      }
      if (timer) clearInterval(timer);
      try {
        if (opts.onEnd) await opts.onEnd();
      } catch (_) { /* never break the stream on cleanup */ }
      write("data: [DONE]\n\n");
      if (!closed) controller.close();
      closed = true;
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });
}

/** True when the caller asked for SSE: `Accept: text/event-stream`, `body.stream === true` or `?stream=true`. */
export function isStreamRequested(req: Request, body?: Any): boolean {
  const accept = req.headers.get("accept") || "";
  if (/text\/event-stream/i.test(accept)) return true;
  if (body && (body.stream === true || body.streaming === true)) return true;
  try {
    return new URL(req.url).searchParams.get("stream") === "true";
  } catch (_) {
    return false;
  }
}
