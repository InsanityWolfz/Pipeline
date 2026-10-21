import { defineConfig } from 'vite';

// The build id saves and feedback notes carry (042): the branch and commit for a CI build, else "dev"
// (the dev server is always "dev", also when CI runs it for the e2e tests).
const sha = process.env.GITHUB_SHA?.slice(0, 7);

// Relative base so the same build works at the Pages root and under /branch/<name>/.
export default defineConfig(({ command }) => ({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(command === 'build' && sha ? `${process.env.GITHUB_REF_NAME ?? 'build'}@${sha}` : 'dev') },
}));
