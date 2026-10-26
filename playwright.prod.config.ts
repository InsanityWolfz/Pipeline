import { defineConfig } from '@playwright/test';

// fix-playtest-ui: the production build's smoke tests (tests/prod), against `npm run build`'s dist served as GitHub
// Pages serves it: under a sub-path (/Pipeline/), with no dev server and no test hook. Run `npm run build` first;
// CI's prod job does. PROD_PORT picks the port (default 4317).
const port = Number(process.env.PROD_PORT ?? 4317);

export default defineConfig({
  testDir: 'tests/prod',
  use: { baseURL: `http://localhost:${port}`, launchOptions: { args: ['--font-render-hinting=none'] } },
  webServer: {
    command: `npx vite preview --port ${port} --strictPort --base /Pipeline/`,
    url: `http://localhost:${port}/Pipeline/`,
    reuseExistingServer: false,
  },
});
