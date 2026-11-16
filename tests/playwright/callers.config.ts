import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.CALLERS_PORT || 5232);
const DRIP = process.env.CALLERS_DRIP_PORT || '5291';
/** Direct-caller streaming specs: `npx playwright test -c tests/playwright/callers.config.ts` */
export default defineConfig({
  testDir: './',
  testMatch: /callers-streaming\.spec\.ts/,
  reporter: 'list',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], headless: true } }],
  webServer: {
    cwd: '../..',
    command: `npx vite --config tests/playwright/harness/callers.vite.config.ts`,
    url: `http://127.0.0.1:${PORT}/tests/playwright/harness/callers.html`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { VITE_SUPABASE_URL: `http://127.0.0.1:${DRIP}`, VITE_SUPABASE_ANON_KEY: 'anon-key', CALLERS_PORT: String(PORT), CALLERS_DRIP_PORT: DRIP },
  },
});
