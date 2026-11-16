import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PANELS_PORT || 5441);
/** Live panel endpoints (Skills / Memory / Heatmap): `npx playwright test -c tests/playwright/panels.config.ts` */
export default defineConfig({
  testDir: './',
  testMatch: /panel-endpoints\.spec\.ts/,
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
    command: `npx vite --config tests/playwright/harness/vite.config.ts`,
    url: `http://127.0.0.1:${PORT}/tests/playwright/harness/panels.html`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'anon-key', HARNESS_PORT: String(PORT), DRIP_PORT: process.env.PANELS_DRIP_PORT || '5491' },
  },
});
