import { expect, test, type Page } from '@playwright/test';
import { landmarkDef } from '../../src/data/landmarks';
import { boot, cameraSettled } from './helpers';
import { clickRow, flowIs } from './flowPage';
import { frames, stepUntil } from './hollowsSandbox';
import { bootSandbox } from './sandboxPage';

// Review screenshots for 065 (REVIEW_SHOTS=1, into docs/review/065), on the Stormcrown's slate: a mixed pack; a
// thunderhawk's dive line; a static mite trio discharging; a storm sentinel's circle; a gale ram's gust cone, then its
// gust; the slowed player; the Weathervane's guards; and the four on the contact sheet. Under the hook the sim holds
// still between steps, so a telegraph holds.

const SHOTS = 'docs/review/065';

/** Open slate in the Stormcrown's south (tests/sim/stormPackBot.ts' ring 5 pack ground), with room east for spawns. */
const OPEN_SLATE = { tx: 148, ty: 268 };

/** `?start=hollows` with every enemy gone but the Conductor (and, if `keepGuards`, the Weathervane's guards), every barrier down, the end card closed, the player at `at`. */
async function stormcrown(page: Page, at: { tx: number; ty: number }, keepGuards = false): Promise<void> {
  await boot(page, '?start=hollows');
  await page.evaluate((keep) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let k = 0; k < 3; k++) {
      for (const e of g.getState().enemies) if (e.enemyId !== 'conductor' && !(keep && e.group === 'weathervane')) g.setEnemyHealth(e.id, 0);
      g.step(1);
    }
    g.step(240);
  }, keepGuards);
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
  await page.evaluate((p) => {
    window.__helpers?.walkTo((p.tx + 0.5) * 32, (p.ty + 0.5) * 32);
    window.__GAME__?.setPlayerHealth(100);
  }, at);
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
  await cameraSettled(page, 20_000);
}

/** Spawns enemies `dx`, `dy` px from the player through the dev hook (one pack, `dev`); returns their ids. */
async function spawnAll(page: Page, list: readonly (readonly [string, number, number])[]): Promise<number[]> {
  return page.evaluate((all) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const p = g.getState().player;
    return all.map(([id, x, y]) => {
      const s = g.spawnEnemy(id, p.x + x, p.y + y);
      return s.enemies[s.enemies.length - 1]?.id ?? -1;
    });
  }, list);
}

test.describe('review screenshots (065)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/065');

  test('a mixed pack on the slate', async ({ page }) => {
    test.setTimeout(180_000);
    await stormcrown(page, OPEN_SLATE);
    await spawnAll(page, [
      ['thunderhawk', 120, -60],
      ['static-mite', 110, 40],
      ['static-mite', 124, 48],
      ['static-mite', 112, 56],
      ['storm-sentinel', 250, -10],
      ['gale-ram', 180, 30],
    ]);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/01-mixed-pack.png` });
  });

  test("a thunderhawk's dive line", async ({ page }) => {
    test.setTimeout(180_000);
    await stormcrown(page, OPEN_SLATE);
    const [id = -1] = await spawnAll(page, [['thunderhawk', 170, -40]]);
    await stepUntil(page, id, 'windup', 34);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/02-hawk-dive-line.png` });
  });

  test('a static mite trio discharging', async ({ page }) => {
    test.setTimeout(180_000);
    await stormcrown(page, OPEN_SLATE);
    const [first = -1] = await spawnAll(page, [
      ['static-mite', 140, 0],
      ['static-mite', 168, 10],
      ['static-mite', 190, -12],
    ]);
    await frames(page);
    // The kill, then the bolts held for the shot (on the tween clock).
    const discharges = await page.evaluate((id) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.setEnemyHealth(id, 0);
      const after = g.step(1);
      g.tweenSpeed(0.02);
      return after.events.discharges.length;
    }, first);
    expect(discharges).toBeGreaterThanOrEqual(2);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().lightningArcs)) ?? 0).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/03-mite-discharge.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test("a storm sentinel's circle", async ({ page }) => {
    test.setTimeout(180_000);
    await stormcrown(page, OPEN_SLATE);
    const [id = -1] = await spawnAll(page, [['storm-sentinel', 230, 60]]);
    await stepUntil(page, id, 'windup', 40);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/04-sentinel-circle.png` });
  });

  test("a gale ram's gust cone, then its gust", async ({ page }) => {
    test.setTimeout(180_000);
    await stormcrown(page, OPEN_SLATE);
    const [id = -1] = await spawnAll(page, [['gale-ram', 76, 0]]);
    await stepUntil(page, id, 'windup', 40);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/05-ram-cone.png` });
    await stepUntil(page, id, 'swipe', 3);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/06-ram-gust.png` });
  });

  test('the slowed player', async ({ page }) => {
    test.setTimeout(180_000);
    // In the sandbox with god mode on, so ring 5's gust (×8 damage) lands without a KO.
    await bootSandbox(page);
    await page.evaluate(() => window.__GAME__?.step(1, { sandbox: { kind: 'god', on: true } }));
    const id = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const p = g.getState().player;
      const s = g.spawnEnemy('gale-ram', p.x + 70, p.y);
      return s.enemies[s.enemies.length - 1]?.id ?? -1;
    });
    await stepUntil(page, id, 'swipe', 2);
    // Pushed back and slowed: the wind curls round the player and over the HP bar.
    await page.evaluate((eid) => {
      const g = window.__GAME__;
      g?.step(24);
      g?.setEnemyHealth(eid, 0);
      g?.step(30);
    }, id);
    await expect.poll(async () => page.evaluate(() => ({ swirl: window.__GAME__?.ui().slowSwirl, bar: window.__GAME__?.ui().health.slowed }))).toEqual({ swirl: true, bar: true });
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/07-slowed-player.png` });
  });

  test("the Weathervane's guards", async ({ page }) => {
    test.setTimeout(180_000);
    const pylon = landmarkDef('weathervane').pylon ?? { tx: 0, ty: 0 };
    // East of the pylon, the whole site in view.
    await stormcrown(page, { tx: pylon.tx + 4, ty: pylon.ty }, true);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/08-weathervane-guards.png` });
  });

  test('the four on the contact sheet', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/sheet.html');
    for (const [i, id] of ['thunderhawk', 'static-mite', 'storm-sentinel', 'gale-ram'].entries()) {
      const row = page.locator('h2', { hasText: new RegExp(`^${id}$`) }).locator('xpath=following-sibling::div[1]');
      await expect(row).toBeVisible({ timeout: 30_000 });
      await row.screenshot({ path: `${SHOTS}/${String(9 + i).padStart(2, '0')}-sheet-${id}.png` });
    }
  });
});
