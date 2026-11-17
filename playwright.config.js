import { defineConfig, devices } from '@playwright/test';

// Playwright runs against the demo build (VITE_DEMO=1): in-memory data, no network, never the
// real Supabase project and never SendGrid.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'off',
  },
  webServer: {
    command: 'npm run build:demo && npx vite preview --outDir dist-demo --port 4174 --strictPort',
    url: 'http://localhost:4174/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
