import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  // fix-e2e-wallclock: with the art pass in, CI's two-core software renderer draws far fewer frames, and polls that
  // wait for a frame-driven change (a door's fade, a new game's first ticks) ran out at Playwright's 5 s default. The
  // limits are patience only: every poll still waits for the same state, and a passing run is no slower.
  timeout: 60_000,
  expect: { timeout: 15_000 },
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
