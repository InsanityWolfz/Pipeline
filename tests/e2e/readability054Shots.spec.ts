import { expect, test } from '@playwright/test';
import { BULWARK } from '../../src/data/bulwark';
import { HOLLOWS } from '../../src/data/hollows';
import { cameraSettled, quietScreen } from './helpers';
import { frames, intoForum, sandbox, spawn, stepUntil } from './hollowsSandbox';
import { burningArrow, starShot, withBlastfletch } from './combatPage';

// Review screenshots for 054 (REVIEW_SHOTS=1, into docs/review/054): a burrowed Burrower's blue bar with its shield,
// the Bulwark's back wave shaded red, an arrow burning after a Pool, a star shot's Shards in flight, and the new art
// on the contact sheet. Under the hook the sim holds still between steps, so each shot holds its moment.

const SHOTS = 'docs/review/054';
const A = HOLLOWS.arena;

test.describe('review screenshots (054)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/054');

  test('a burrowed Burrower: its bar blue with the shield, beside a hurt Husk’s normal bar', async ({ page }) => {
    test.setTimeout(120_000);
    await sandbox(page);
    const husk = await spawn(page, 'husk', -90, 30);
    await page.evaluate((id) => window.__GAME__?.setEnemyHealth(id, 24), husk);
    const id = await spawn(page, 'burrower', 110, 30);
    await stepUntil(page, id, 'chase', 12);
    await quietScreen(page);
    await expect.poll(() => page.evaluate((eid) => window.__GAME__?.ui().enemyBars.find((b) => b.id === eid)?.immune, id)).toBe(true);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/01-immune-burrower.png` });
  });

  test('the back wave building, its area shaded red', async ({ page }) => {
    test.setTimeout(120_000);
    await intoForum(page);
    // West of it, so it faces west and its wave builds east, across the middle of the shot (as 041's shot).
    await page.evaluate(
      ([tx, ty]) => {
        const h = window.__helpers;
        const g = window.__GAME__;
        if (!h || !g) throw new Error('no game');
        h.walkTo((tx - 4 + 0.5) * 32, (ty + 0.5) * 32);
        g.setPlayerHealth(100);
      },
      [A.start.tx, A.start.ty] as const,
    );
    const ok = await page.evaluate((windup) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 2400; t++) {
        const s = g.step(1);
        g.setPlayerHealth(100);
        const b = s.bosses[0];
        if ((b?.waveTicks ?? 0) >= windup * 0.6 && b?.mode !== 'stomp-windup' && b?.mode !== 'windup' && s.enemyBombs.length === 0) return true;
      }
      return false;
    }, BULWARK.wave.windupTicks);
    expect(ok).toBe(true);
    await cameraSettled(page, 20_000);
    await quietScreen(page);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().hollowsEnemies.waveShades)).toBe(1);
    await page.screenshot({ path: `${SHOTS}/02-back-wave-shaded.png` });
  });

  test('an arrow burning on past the Pool it took, then its hit flash', async ({ page }) => {
    test.setTimeout(120_000);
    await withBlastfletch(page);
    expect(await burningArrow(page, 5)).toBe(true);
    await quietScreen(page);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().tagged.burning)).toBeGreaterThan(0);
    await frames(page, 8);
    await page.screenshot({ path: `${SHOTS}/03-burning-arrow.png` });
    const hit = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const a = g.getState().arrows.find((r) => r.burning);
      if (!a) return false;
      g.spawnEnemy('husk', a.x + 16, a.y);
      g.tweenSpeed(0.05);
      for (let t = 0; t < 30; t++) if (g.step(1).events.hits.some((h) => h.target === 'enemy' && h.burning)) return true;
      return false;
    });
    expect(hit).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().talentFx.burningFlashes)).toBeGreaterThan(0);
    await frames(page, 6);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0));
    await page.screenshot({ path: `${SHOTS}/03b-burning-hit.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('a star shot’s Shards flying out from the struck Husk', async ({ page }) => {
    test.setTimeout(180_000);
    expect(await starShot(page, 5)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().tagged.shards)).toBeGreaterThan(0);
    await frames(page, 6);
    await page.screenshot({ path: `${SHOTS}/04-star-shards.png` });
  });

  test('the new art on the contact sheet', async ({ page }) => {
    await page.goto('/sheet.html');
    const fig = (name: string) => page.locator('figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${name}$`) }) });
    for (const [i, name] of ['enemy-immune', 'burning-tip', 'burning-flash', 'shard'].entries()) {
      await expect(fig(name)).toBeVisible();
      await fig(name).screenshot({ path: `${SHOTS}/sheet-${String(i + 1).padStart(2, '0')}-${name}.png` });
    }
  });
});
