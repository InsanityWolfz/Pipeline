import { expect, test, type Page } from '@playwright/test';
import { HOLLOWS } from '../../src/data/hollows';
import { boot, cameraSettled } from './helpers';

// Review screenshots for 034 (REVIEW_SHOTS=1, into docs/review/034): the barrier and
// breached, the Ley-iron Cut, the aqueduct and the Cistern Terrace, the Bulwark facing the
// player, mid-turn, mid-lob with its circles and its pound circle, a blocked hit's spark,
// the altar dim and awake (with its offering) and summoning, and the art on the contact
// sheet. Under the hook the sim holds still between steps. (The armed mine and the cluster
// burst are 038's.)

const SHOTS = 'docs/review/034';
const T = 32;
const A = HOLLOWS.arena;

/** Kills every enemy but those whose id is in `keep` (by enemy id), so a walk is quiet. */
async function quiet(page: Page, keep: readonly string[] = []): Promise<void> {
  await page.evaluate((k) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) if (!k.includes(e.enemyId)) g.setEnemyHealth(e.id, 0);
    g.step(1);
  }, keep);
}

async function walk(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  await page.evaluate((pts) => {
    const h = window.__helpers;
    const g = window.__GAME__;
    if (!h || !g) throw new Error('no helpers');
    for (const [tx, ty] of pts) {
      h.walkTo((tx + 0.5) * 32, (ty + 0.5) * 32);
      g.setPlayerHealth(100);
    }
  }, points);
}

/** Lets the discovery banners play out (fast, on the tween clock), so none covers the shot. */
async function bannersGone(page: Page): Promise<void> {
  await page.evaluate(() => window.__GAME__?.tweenSpeed(10));
  // Queued banners show in turn, briefly none between two: gone means none over several frames running.
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
}

/** Into the forum with only the Bulwark left, standing `dy` tiles below its start. */
async function forum(page: Page, dy: number): Promise<void> {
  await boot(page, '?start=hollows');
  await quiet(page, ['bulwark']);
  await walk(page, [[25, 27], [12, 27], [12, 30], [A.start.tx, A.start.ty + dy]]);
  await bannersGone(page);
}

test.describe('review screenshots (034)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/034');

  test('the barrier shut, collapsing and breached', async ({ page }) => {
    test.setTimeout(180_000);
    await boot(page);
    await walk(page, [[52, 27], [43, 27]]);
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    expect((await page.evaluate(() => window.__GAME__?.ui().hollows))?.barrier).toBe('shut');
    await page.screenshot({ path: `${SHOTS}/01-barrier-shut.png` });
    await page.evaluate(() => {
      window.__GAME__?.tweenSpeed(0.08);
      window.__GAME__?.claim('shrine');
      window.__GAME__?.step(1);
    });
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.barrierAlpha ?? 1, { intervals: [20] }).toBeLessThan(0.6);
    await page.screenshot({ path: `${SHOTS}/02-barrier-collapsing.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.barrier).toBe('down');
    await walk(page, [[37, 27]]);
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/03-barrier-breached.png` });
  });

  const views: [string, string, (readonly [number, number])[]][] = [
    ['04-ley-iron-cut', 'ley-iron-cut', [[25, 27], [25, 14], [25, 9]]],
    ['05-broken-aqueduct', 'broken-aqueduct', [[25, 27], [16, 24]]],
  ];
  for (const [file, id, points] of views) {
    test(`the landmark ${id}`, async ({ page }) => {
      test.setTimeout(120_000);
      await boot(page, '?start=hollows');
      await quiet(page);
      await walk(page, points);
      await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.getState()))?.discovered.includes(id)).toBe(true);
      await bannersGone(page);
      await cameraSettled(page, 20_000);
      await page.screenshot({ path: `${SHOTS}/${file}.png` });
    });
  }

  test('the Cistern Terrace with its pylon and guards', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?start=hollows');
    await walk(page, [[25, 27], [25, 17]]);
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/06-cistern-terrace.png` });
  });

  test('the Bulwark facing the player, with its boss bar', async ({ page }) => {
    test.setTimeout(120_000);
    // From the south, so its shield's face is toward the camera.
    await forum(page, 3);
    // It wakes as the player comes in, and turns its shield to face them.
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 400; t++) {
        const s = g.step(1);
        const b = s.bosses[0];
        if (!b) throw new Error('no Bulwark');
        g.setPlayerHealth(100);
        const want = (Math.atan2(s.player.y - (s.enemies.find((e) => e.id === b.id)?.y ?? 0), s.player.x - (s.enemies.find((e) => e.id === b.id)?.x ?? 0)) * 180) / Math.PI;
        if (Math.abs(((b.angle - want + 540) % 360) - 180) < 5 && b.mode === 'chase') return;
      }
    });
    await cameraSettled(page, 20_000);
    expect((await page.evaluate(() => window.__GAME__?.ui().bossBar))?.name).toBe('Bulwark');
    await page.screenshot({ path: `${SHOTS}/07-bulwark-facing.png` });
  });

  test('the Bulwark mid-turn as the player circles behind it', async ({ page }) => {
    test.setTimeout(120_000);
    await forum(page, -3);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(60);
      // Round its east side, so it turns after the player.
      for (let t = 0; t < 70; t++) {
        g.step(1, { moveX: 1, moveY: t > 20 ? 1 : 0 });
        g.setPlayerHealth(100);
      }
    });
    await page.screenshot({ path: `${SHOTS}/08-bulwark-mid-turn.png` });
  });

  test('the Bulwark mid-lob: each bomb a red ring with its circle growing', async ({ page }) => {
    test.setTimeout(120_000);
    await forum(page, 3);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 600 && (g.getState().enemyBombs[0]?.progress ?? 0) < 0.45; t++) {
        g.step(1, { moveX: t % 80 < 40 ? 1 : -1 });
        g.setPlayerHealth(100);
      }
    });
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.enemyBombs.length ?? 0).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/09-bulwark-lob-circles.png` });
  });

  test('the Bulwark winding up its pound: the red circle round it', async ({ page }) => {
    test.setTimeout(120_000);
    await forum(page, -3);
    await page.evaluate(([sx, sy]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.walkTo(sx, sy - 56);
      for (let t = 0; t < 400; t++) {
        const s = g.step(1);
        g.setPlayerHealth(100);
        if (s.bosses[0]?.mode === 'windup' && (s.bosses[0]?.modeTicks ?? 0) >= 40) return;
      }
    }, [(A.start.tx + 0.5) * T, (A.start.ty + 0.5) * T] as const);
    await page.screenshot({ path: `${SHOTS}/10-bulwark-pound-circle.png` });
  });

  test('a blocked hit: the brass spark on the shield', async ({ page }) => {
    test.setTimeout(120_000);
    await forum(page, -3);
    // Woken, step back toward the way in: it turns its shield north toward the player. Since 043 the way in is
    // sealed while it fights, so the player stands on the row just inside the seal, which frames them both.
    await page.evaluate(([tx, ty]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      g.step(1);
      h.walkTo((tx + 0.5) * 32, (ty + 1.5) * 32);
      for (let t = 0; t < 300 && Math.abs((g.getState().bosses[0]?.angle ?? 0) - 270) > 5; t++) g.step(1);
    }, [A.start.tx, A.bounds.y0] as const);
    await cameraSettled(page, 20_000);
    const blocked = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
      if (!b) throw new Error('no Bulwark');
      // Effects on a slowed tween clock (particles run on it), so the sparks fly out over a few frames however slow they are.
      g.tweenSpeed(0.2);
      for (let t = 0; t < 60; t++) {
        const s = g.step(1, { fire: true, aimX: b.x, aimY: b.y - 20, selectAmmo: t === 0 ? 'arrow' : null });
        if (s.events.blocked.length > 0) return true;
      }
      return false;
    });
    expect(blocked).toBe(true);
    // Four frames for the sparks to fly out, then the tween clock stopped, so they hold mid-flight.
    await page.evaluate(async () => {
      for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(r));
      window.__GAME__?.tweenSpeed(0);
    });
    await page.screenshot({ path: `${SHOTS}/11-blocked-spark.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('the altar dim, then awake with its offering, then summoning', async ({ page }) => {
    test.setTimeout(150_000);
    await boot(page, '?start=hollows');
    await quiet(page, ['bulwark']);
    await walk(page, [[25, 27], [12, 27], [12, 30], [A.altar.tx + 2, A.altar.ty + 1]]);
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    expect((await page.evaluate(() => window.__GAME__?.ui().hollows))?.altar).toBe('dim');
    await page.screenshot({ path: `${SHOTS}/12-altar-dim.png` });
    // The first kill wakes it: E at it opens the offering.
    await page.evaluate(([tx, ty]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const b = g.getState().enemies.find((e) => e.enemyId === 'bulwark');
      if (b) g.setEnemyHealth(b.id, 0);
      g.step(1);
      h.walkTo((tx + 1.5) * 32, (ty + 0.5) * 32);
      g.step(1);
    }, [A.altar.tx, A.altar.ty] as const);
    await page.keyboard.press('e');
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().altarPanel))?.enabled).toBe(true);
    expect((await page.evaluate(() => window.__GAME__?.ui().hollows))?.altar).toBe('awake');
    await page.screenshot({ path: `${SHOTS}/13-altar-awake-offering.png` });
    await page.keyboard.press('e');
    await page.evaluate(() => window.__GAME__?.step(70));
    expect((await page.evaluate(() => window.__GAME__?.ui().hollows))?.summonCircle).toBe(true);
    await page.screenshot({ path: `${SHOTS}/14-altar-summoning.png` });
  });

  test('the new art on the contact sheet, at 4x', async ({ page }) => {
    await page.goto('/sheet.html');
    const row = (title: string) => page.locator('h2', { hasText: title }).locator('xpath=following-sibling::div[1]');
    await expect(row('Stonefall Hollows (034)')).toBeVisible();
    await row('Stonefall Hollows (034)').screenshot({ path: `${SHOTS}/15-sheet-hollows.png` });
    await row('bulwark').screenshot({ path: `${SHOTS}/16-sheet-bulwark.png` });
  });
});
