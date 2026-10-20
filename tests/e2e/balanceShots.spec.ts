import { expect, test, type Page } from '@playwright/test';
import { BULWARK } from '../../src/data/bulwark';
import { HOLLOWS } from '../../src/data/hollows';
import { HOLLOWS_LOOK } from '../../src/data/hollowsAssets';
import { boot, cameraSettled } from './helpers';

// Review screenshots for 041 (REVIEW_SHOTS=1, into docs/review/041): the enraged Bulwark
// (red seam and runes, steam), the stomp's rear half-disc, its adds rising through their
// cracked circles, and the boss bar while it's enraged. Under the hook the sim holds still
// between steps, so each shot holds its moment.

const SHOTS = 'docs/review/041';
const A = HOLLOWS.arena;

/** Into the forum with only the Bulwark left, standing `dy` tiles below its start, it awake; returns its id. */
async function forum(page: Page, dy: number): Promise<number> {
  await boot(page, '?start=hollows');
  const id = await page.evaluate(
    ([tx, ty]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark') g.setEnemyHealth(e.id, 0);
      g.step(1);
      for (const [x, y] of [[25, 27], [12, 27], [12, 30], [tx, ty]] as const) h.walkTo((x + 0.5) * 32, (y + 0.5) * 32);
      for (let t = 0; t < 120 && !g.getState().bosses[0]?.engaged; t++) g.step(1);
      return g.getState().bosses[0]?.id ?? -1;
    },
    [A.start.tx, A.start.ty + dy] as const,
  );
  // Banners off the shot: played out fast on the tween clock.
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          for (let i = 0; i < 8; i++) {
            if (window.__GAME__?.ui().landmarks.banner !== null) return false;
            await new Promise((r) => requestAnimationFrame(r));
          }
          return true;
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  return id;
}

test.describe('review screenshots (041)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/041');

  test('the adds rising through their cracked circles', async ({ page }) => {
    test.setTimeout(120_000);
    const id = await forum(page, 3);
    await page.evaluate(
      ([bid, hp, half]) => {
        const g = window.__GAME__;
        if (!g) throw new Error('no game');
        g.setEnemyHealth(bid, hp);
        g.step(half);
      },
      [id, Math.floor(BULWARK.maxHealth * BULWARK.adds.below) - 1, Math.floor(BULWARK.adds.riseTicks / 2)] as const,
    );
    expect((await page.evaluate(() => window.__GAME__?.getState().enemies.filter((e) => e.rising > 0).length)) ?? 0).toBe(2);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-adds-rising.png` });
  });

  test('the enraged Bulwark: red seam and runes, steam; and its boss bar', async ({ page }) => {
    test.setTimeout(120_000);
    const id = await forum(page, 3);
    await page.evaluate(
      ([bid, hp]) => {
        const g = window.__GAME__;
        if (!g) throw new Error('no game');
        g.setEnemyHealth(bid, hp);
      },
      [id, Math.floor(BULWARK.maxHealth * BULWARK.enrage.below) - 1] as const,
    );
    // Past its roar, the player kept up for the photo; its adds taken out of the shot (this one is the Bulwark's).
    const ok = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 600; t++) {
        const s = g.step(1);
        g.setPlayerHealth(100);
        if (s.bosses[0]?.enraged && s.bosses[0].mode === 'chase') {
          for (const e of s.enemies) if (e.group === 'bulwark-adds') g.setEnemyHealth(e.id, 0);
          g.step(1);
          return true;
        }
      }
      return false;
    });
    expect(ok).toBe(true);
    await cameraSettled(page, 20_000);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().bossBar))?.enraged).toBe(true);
    await page.screenshot({ path: `${SHOTS}/02-bulwark-enraged.png` });
    const bar = HOLLOWS_LOOK.bossBar;
    const scale = await page.evaluate(() => (document.querySelector('canvas')?.getBoundingClientRect().width ?? 640) / 640);
    const box = await page.locator('canvas').boundingBox();
    await page.screenshot({
      path: `${SHOTS}/04-boss-bar-enraged.png`,
      clip: { x: (box?.x ?? 0) + ((640 - bar.w) / 2 - 20) * scale, y: (box?.y ?? 0) + 0, width: (bar.w + 40) * scale, height: (bar.top + bar.h + 12) * scale },
    });
  });

  test('the enraged Bulwark from behind: its seam burning red, steam rising', async ({ page }) => {
    test.setTimeout(120_000);
    const id = await forum(page, -3);
    await page.evaluate(
      ([bid, hp]) => {
        const g = window.__GAME__;
        if (!g) throw new Error('no game');
        g.setEnemyHealth(bid, hp);
        for (let t = 0; t < 600; t++) {
          const s = g.step(1);
          g.setPlayerHealth(100);
          if (s.bosses[0]?.enraged && s.bosses[0].mode === 'chase') break;
        }
        for (const e of g.getState().enemies) if (e.group === 'bulwark-adds') g.setEnemyHealth(e.id, 0);
        g.step(1);
      },
      [id, Math.floor(BULWARK.maxHealth * BULWARK.enrage.below) - 1] as const,
    );
    // Round to its back while it turns (110°/s enraged), until its back is to the camera.
    const ok = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 600; t++) {
        const s = g.getState();
        const b = s.bosses[0];
        const e = s.enemies.find((x) => x.id === b?.id);
        if (!b || !e) return false;
        if (e.facing === 'up' && s.player.y > e.y) return true;
        g.step(1, { moveY: s.player.y < e.y + 90 ? 1 : 0, moveX: s.player.x < e.x - 4 ? 1 : s.player.x > e.x + 4 ? -1 : 0 });
        g.setPlayerHealth(100);
      }
      return false;
    });
    await cameraSettled(page, 20_000);
    if (ok) await page.screenshot({ path: `${SHOTS}/05-bulwark-enraged-back.png` });
  });

  test('the stomp winding up: its red half-disc over its back', async ({ page }) => {
    test.setTimeout(120_000);
    await forum(page, -3);
    // Behind it and held there, so the stomp comes; photographed partway through its wind-up.
    const ok = await page.evaluate((windup) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const sign = (v: number): -1 | 0 | 1 => (Math.abs(v) < 3 ? 0 : v > 0 ? 1 : -1);
      for (let t = 0; t < 1200; t++) {
        const s = g.getState();
        const b = s.bosses[0];
        const e = s.enemies.find((x) => x.id === b?.id);
        if (!b || !e) return false;
        if (b.mode === 'stomp-windup' && b.modeTicks >= windup * 0.6) return true;
        const bearing = Math.atan2(s.player.y - e.y, s.player.x - e.x);
        const back = (b.angle * Math.PI) / 180 + Math.PI;
        const d = Math.atan2(Math.sin(back - bearing), Math.cos(back - bearing));
        const along = bearing + Math.sign(d || 1) * Math.min(0.7, Math.abs(d));
        const goal = b.mode === 'stomp-windup' ? { x: s.player.x, y: s.player.y } : { x: e.x + Math.cos(along) * 110, y: e.y + Math.sin(along) * 110 };
        g.step(1, { moveX: sign(goal.x - s.player.x), moveY: sign(goal.y - s.player.y) });
        g.setPlayerHealth(100);
      }
      return false;
    }, BULWARK.stomp.windupTicks);
    expect(ok).toBe(true);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/03-stomp-half-disc.png` });
  });
});
