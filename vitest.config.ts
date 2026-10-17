import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/{sim,data,render,scripts}/**/*.test.ts'] },
});
