import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.AI_SWEEP_PORT || 5311);
const DIST = process.env.AI_SWEEP_DIST || path.join(os.tmpdir(), 'smartcrm-ai-sweep-dist');
/**
 * AI controls sweep: production build (guard compiled in) served by `vite preview`, Netlify functions answered by a
 * real dripping SSE server. Run: `npx playwright test -c tests/playwright/ai-sweep.config.ts`
 * (set AI_SWEEP_SKIP_BUILD=1 to reuse an existing build in $AI_SWEEP_DIST).
 */
export default defineConfig({
  testDir: './',
  testMatch: /ai-sweep\.spec\.ts/,
  reporter: 'list',
  workers: 1,
  timeout: 10 * 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1400, height: 900 },
    launchOptions: { executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 }, headless: true } }],
  webServer: {
    cwd: '../..',
    command: `${process.env.AI_SWEEP_SKIP_BUILD ? '' : 'npx vite build --config tests/playwright/harness/ai-sweep.vite.config.ts && '}npx vite preview --config tests/playwright/harness/ai-sweep.vite.config.ts`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: true,
    timeout: 300_000,
    env: { VITE_STREAM_GUARD: '1', VITE_SUPABASE_URL: `http://127.0.0.1:${process.env.AI_SWEEP_DRIP_PORT || '5312'}`, VITE_SUPABASE_ANON_KEY: 'anon-key', AI_SWEEP_PORT: String(PORT), AI_SWEEP_DIST: DIST, AI_SWEEP_DRIP_PORT: process.env.AI_SWEEP_DRIP_PORT || '5312' },
  },
});
