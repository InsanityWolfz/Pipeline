import { defineConfig } from 'vitest/config';

// `npm run measure`: balance measurements (process rule 4), report only. Each test logs its
// per-seed numbers and fails only on a crash; the summary table prints at the end.
export default defineConfig({
  test: {
    include: ['tests/measure/**/*.measure.ts'],
    reporters: ['default', './tests/measure/reporter.ts'],
    testTimeout: 120_000,
  },
});
