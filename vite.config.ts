import { defineConfig } from 'vite';

// Relative base so the same build works at the Pages root and under /branch/<name>/.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
