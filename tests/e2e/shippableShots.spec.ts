import { mkdirSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { END_CARD } from '../../src/data/endCard';
import { pauseRows } from '../../src/render/craftMenuLayout';
import { boot } from './helpers';
import { bootTitle, clickRow, clickView, flowIs, newGameToFoundry, reloadTitle } from './flowPage';

// Review screenshots for 042 (REVIEW_SHOTS=1, into docs/review/042): the title (Continue greyed, and with a save's
// line), Settings, the key list, the note, the end card, the New game confirm, Quit to title's confirm and the
// farewell card. The 640×360 view at 2×. Pending Shaun's approval by eye.

const SHOTS = 'docs/review/042';

async function shot(page: Page, name: string): Promise<void> {
  // Two frames for the row hover and any redraw to land; the motes and pipe glow keep moving, which is fine.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe('review screenshots (042)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/042');
  test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));

  test('the title, Settings, the key list, the confirms and the farewell card', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await bootTitle(page);
    await page.mouse.move(0, 0);
    await shot(page, '01-title-no-save');
    await newGameToFoundry(page);
    await reloadTitle(page);
    await shot(page, '02-title-with-save');
    await clickRow(page, 'newGame');
    await flowIs(page, 'confirm');
    await shot(page, '03-new-game-confirm');
    await clickRow(page, 'no');
    await clickRow(page, 'settings');
    await flowIs(page, 'settings');
    await page.mouse.move(0, 0);
    await shot(page, '04-settings');
    await clickRow(page, 'keys');
    await clickRow(page, 'dodge');
    await shot(page, '05-key-bindings-waiting');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await flowIs(page, 'title');
    await clickRow(page, 'quit');
    await flowIs(page, 'farewell');
    await shot(page, '06-farewell');
  });

  test('the note in play, Quit to title outside the foundry, and the end card', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await boot(page, '?start=hollows');
    await page.evaluate(() => window.__GAME__?.step(0));
    await page.keyboard.press('f');
    await flowIs(page, 'feedback');
    await page.keyboard.type('The Bulwark fight felt fair, but I lost track of my mines.\nMore of the Hollows, please!');
    await shot(page, '07-feedback-note');
    await page.keyboard.press('Escape');
    await flowIs(page, 'play');
    await page.keyboard.press('Escape');
    await flowIs(page, 'paused');
    await shot(page, '08-pause-menu');
    const quit = pauseRows()[2];
    if (!quit) throw new Error('no quit row');
    await clickView(page, quit.x + 40, quit.y + 10);
    await flowIs(page, 'confirm');
    await shot(page, '09-quit-confirm');
    await clickRow(page, 'no');
    await page.keyboard.press('Escape');
    await flowIs(page, 'play');
    await page.evaluate((n) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
      if (b) g.setEnemyHealth(b.id, 0);
      g.step(n + 1);
    }, END_CARD.delayTicks);
    await flowIs(page, 'endCard');
    await page.mouse.move(0, 0);
    await shot(page, '10-end-card');
  });
});
