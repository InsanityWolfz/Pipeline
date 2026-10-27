import { expect, test } from '@playwright/test';
import { pauseRows } from '../../src/render/craftMenuLayout';
import { watchErrors } from './helpers';
import { bootTitle, clickRow, clickView, flowIs } from './flowPage';

// Fix: New game after Quit to title showed a black screen with a blank button (Shaun, 2026-10-22).

test('New game, Quit to title, then New game again starts a working game', async ({ page }) => {
  const errors = watchErrors(page);
  await bootTitle(page);
  await clickRow(page, 'newGame');
  await flowIs(page, 'play');
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  await page.keyboard.press('Escape');
  await flowIs(page, 'paused');
  const quit = pauseRows()[2];
  if (!quit) throw new Error('no quit row');
  await clickView(page, quit.x + 40, quit.y + 10);
  await flowIs(page, 'confirm');
  await clickRow(page, 'yes');
  await flowIs(page, 'title');
  await clickRow(page, 'newGame');
  await flowIs(page, 'play');
  await page.waitForFunction(() => window.__GAME__?.ui().ready === true);
  // The new game runs: its world steps on its own. 070: given 20 s, as a busy two-core runner beside a heavy test file
  // (landmarks.spec.ts, in this shard since 070's files) steps it at about 6 ticks a second, on main as on 070.
  await expect.poll(() => page.evaluate(() => window.__GAME__?.getState()?.tick ?? -1), { timeout: 20_000 }).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});
