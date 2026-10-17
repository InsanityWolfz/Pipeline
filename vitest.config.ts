import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/{sim,data,scripts}/**/*.test.ts'] },
});
