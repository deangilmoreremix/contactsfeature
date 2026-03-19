import { logger } from "./logger";

const MCP_BASE_URL = process.env.MCP_BASE_URL || "";
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60000;

function getCircuitBreaker(server: string): CircuitBreakerState {
  if (!circuitBreakers.has(server)) {
    circuitBreakers.set(server, { failures: 0, lastFailure: 0, isOpen: false });
  }
  return circuitBreakers.get(server)!;
}

function checkCircuitBreaker(server: string): boolean {
  const cb = getCircuitBreaker(server);
  if (!cb.isOpen) return true;
  if (Date.now() - cb.lastFailure > CIRCUIT_RESET_MS) {
    cb.isOpen = false;
    cb.failures = 0;
    return true;
  }
  return false;
}

function recordSuccess(server: string): void {
  const cb = getCircuitBreaker(server);
  cb.failures = 0;
  cb.isOpen = false;
}

function recordFailure(server: string): void {
  const cb = getCircuitBreaker(server);
  cb.failures++;
  cb.lastFailure = Date.now();
  if (cb.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    cb.isOpen = true;
    logger.warn("Circuit breaker opened", { server, failures: cb.failures });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeTool(
  server: string,
  method: string,
  args: unknown
): Promise<unknown> {
  if (!MCP_BASE_URL) {
    throw new Error("MCP_BASE_URL not configured");
  }

  if (!checkCircuitBreaker(server)) {
    throw new Error(`Circuit breaker open for MCP server: ${server}`);
  }

  const url = `${MCP_BASE_URL}/mcp/${server}/${method}`;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      logger.debug("Executing MCP tool", { url, attempt });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
        signal: controller.signal,
      });

      if (res.ok) {
        const json = await res.json();
        recordSuccess(server);
        logger.debug("MCP tool result", { server, method });
        return json;
      }

      if (RETRYABLE_STATUS_CODES.has(res.status) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        logger.warn("MCP tool retrying", { server, method, status: res.status, attempt });
        await sleep(delay);
        continue;
      }

      const text = await res.text().catch(() => "");
      lastError = new Error(`MCP tool error: ${res.status} ${text.substring(0, 200)}`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        lastError = new Error(`MCP tool timeout after ${DEFAULT_TIMEOUT_MS}ms: ${server}/${method}`);
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        await sleep(delay);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  recordFailure(server);
  logger.error("MCP tool failed after retries", { server, method, error: lastError?.message });
  throw lastError || new Error(`MCP tool failed: ${server}/${method}`);
}
