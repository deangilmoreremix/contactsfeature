const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(url, options = {}, config = {}) {
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);

      if (response.ok) return response;

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        let delay;

        if (retryAfter && !isNaN(Number(retryAfter))) {
          delay = Number(retryAfter) * 1000;
        } else {
          delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        }

        await sleep(Math.min(delay, 30000));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;

      if (err.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${timeoutMs}ms`);
      }

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOpenAI(messages, config = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const model = config.model || process.env.SMARTCRM_MODEL || 'gpt-5.2';
  const temperature = config.temperature ?? 0.7;
  const maxTokens = config.maxTokens ?? 1000;

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    },
    { maxRetries: 2, timeoutMs: 45000, baseDelayMs: 2000 }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OpenAI API error ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

function parseJSONResponse(content, fallback) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    return fallback;
  }
}

module.exports = { fetchWithRetry, fetchWithTimeout, callOpenAI, parseJSONResponse };
