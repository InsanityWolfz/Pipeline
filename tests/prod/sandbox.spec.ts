import { expect, test, type Page } from '@playwright/test';

// fix-playtest-ui (Shaun: "every sandbox link I try doesn't work"): the production build, served under GitHub Pages'
// sub-path, opens a New game's title, the sandbox (`?sandbox`) and the playtest start with no page error, no failed
// request (a missing asset or a wrong base path) and a game scene drawing. Production has no test hook (`__GAME__`),
// so the page's `data-game` (set once a frame has drawn) says which game runs.

/** Opens `path` and records the page's errors and failed requests. */
async function open(page: Page, path: string): Promise<string[]> {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console error: ${m.text()}`);
  });
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  await page.goto(path);
  return problems;
}

/** Waits for `n` animation frames to be drawn. */
const frames = (page: Page, n: number) =>
  page.evaluate((count) => new Promise<void>((done) => {
    let left = count;
    const tick = () => (--left <= 0 ? done() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }), n);

for (const [query, kind] of [
  ['?sandbox', 'sandbox'],
  ['?playtest', 'play'],
] as const) {
  test(`the production build opens ${query} under /Pipeline/`, async ({ page }) => {
    test.setTimeout(60_000);
    const problems = await open(page, `/Pipeline/${query}`);
    await expect(page.locator('#game')).toHaveAttribute('data-game', kind, { timeout: 30_000 });
    // It keeps running: input reaches it and nothing throws a moment later.
    await page.keyboard.down('KeyD');
    await page.mouse.move(400, 300);
    await page.keyboard.up('KeyD');
    await frames(page, 30);
    expect(problems).toEqual([]);
    expect(await page.evaluate(() => '__GAME__' in window)).toBe(false);
  });
}

test('the production build shows the title with no error', async ({ page }) => {
  const problems = await open(page, '/Pipeline/');
  await expect.poll(() => page.locator('canvas').count(), { timeout: 30_000 }).toBe(1);
  await frames(page, 30);
  expect(await page.locator('#game').getAttribute('data-game')).toBeNull();
  expect(problems).toEqual([]);
});
