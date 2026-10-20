import { expect, test, type Page } from '@playwright/test';
import { TILE_SIZE } from '../../src/data/config';
import { HOLLOWS } from '../../src/data/hollows';
import { SANDBOX_PENS, WARDEN_ARENA } from '../../src/data/sandbox';
import { cameraSettled } from './helpers';
import { bootSandbox, clickPanel, openPanel, setRound, spawnPack } from './sandboxPage';

// Review screenshots for 044 (REVIEW_SHOTS=1, into docs/review/044): the sandbox's room (the
// spawn, a pen, the Warden's arena and the sealed forum), the Sandbox panel, a mixed volley in
// flight, and a ring 3 champion pack.

const SHOTS = 'docs/review/044';
const T = TILE_SIZE;

/** Walks the player to a tile's centre, god mode on so nothing in the way matters, and waits for the camera. */
async function standAt(page: Page, tx: number, ty: number): Promise<void> {
  await page.evaluate(
    ([x, y]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { sandbox: { kind: 'god', on: true } });
      window.__helpers?.walkTo(x ?? 0, y ?? 0);
    },
    [(tx + 0.5) * T, (ty + 0.5) * T],
  );
  await cameraSettled(page, 20_000);
}

test.describe('review screenshots (044)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/044');

  test('the room: the spawn, a pen, and the two arenas', async ({ page }) => {
    test.setTimeout(240_000);
    await bootSandbox(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-spawn.png` });
    // Just outside the Husk's pen, its Husk waking.
    const pen = SANDBOX_PENS[0];
    if (!pen) throw new Error('no pen');
    await standAt(page, pen.home.tx, pen.bounds.y1 + 1);
    await page.screenshot({ path: `${SHOTS}/02-pen.png` });
    // In the Warden's arena's way in, the Warden waking.
    await standAt(page, WARDEN_ARENA.start.tx, WARDEN_ARENA.bounds.y0 + 3);
    await page.screenshot({ path: `${SHOTS}/03-warden-arena.png` });
    // Inside the Sunken Forum: the Bulwark wakes and the seal shuts behind the player (043).
    await standAt(page, HOLLOWS.arena.start.tx, HOLLOWS.arena.bounds.y0 + 2);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.seal).toBe('shut');
    await page.screenshot({ path: `${SHOTS}/04-forum-sealed.png` });
  });

  test('the panel, a mixed volley in flight, and a ring 3 champion pack', async ({ page }) => {
    test.setTimeout(180_000);
    await bootSandbox(page);
    await openPanel(page);
    await setRound(page, 0, 'arrow+frost');
    await setRound(page, 1, 'ley-bolt+frost+split');
    await setRound(page, 2, 'bomb+cluster');
    await clickPanel(page, 'god');
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/05-panel.png` });

    // Close the panel and fire the volley east, into the open middle.
    await page.keyboard.press('Backquote');
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().sandbox?.open)).toBe(false);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      g.step(26, { fire: true, aimX: p.x + 220, aimY: p.y + 20 });
    });
    await page.screenshot({ path: `${SHOTS}/06-mixed-volley.png` });

    // Five ring 3 champion Chargers, a short way in front (to the east, clear of the HUD).
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      g.step(1, { moveX: 1, aimX: p.x + 200, aimY: p.y });
    });
    await openPanel(page);
    await spawnPack(page, 'charger', 3, true, 5);
    await page.keyboard.press('Backquote');
    await page.evaluate(() => window.__GAME__?.step(2));
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().champions.length)).toBe(5);
    await page.screenshot({ path: `${SHOTS}/07-ring3-champion-pack.png` });
  });
});
