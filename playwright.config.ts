import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    // Text widths depend on the machine's font hinting (CI's runner hints fully, a bare container doesn't), and the
    // summary-fit tests sit near their wrap edge, so every machine measures text the same way.
    launchOptions: { args: ['--font-render-hinting=none'] },
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
