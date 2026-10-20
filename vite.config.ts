import { defineConfig } from 'vite';

// The build id saves and feedback notes carry (042): the branch and commit on CI, else "dev".
const sha = process.env.GITHUB_SHA?.slice(0, 7);
const BUILD_ID = sha ? `${process.env.GITHUB_REF_NAME ?? 'build'}@${sha}` : 'dev';

// Relative base so the same build works at the Pages root and under /branch/<name>/.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID) },
});
