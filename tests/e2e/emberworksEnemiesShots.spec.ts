import { expect, test, type Page } from '@playwright/test';
import { landmarkDef } from '../../src/data/landmarks';
import { boot, cameraSettled } from './helpers';
import { clickRow, flowIs } from './flowPage';
import { frames, stepUntil } from './hollowsSandbox';

// Review screenshots for 061 (REVIEW_SHOTS=1, into docs/review/061), on the Emberworks' ash: a mixed pack; a cinder
// mote swelling; a mote's death burst setting a pack burning; a bellows hound's lane, then its trail; a slag golem
// splitting; a kiln-tender's beam on a hurt golem; the Ash Kilns' guards; and the five on the contact sheet. Under the
// hook the sim holds still between steps, so a telegraph holds.

const SHOTS = 'docs/review/061';

/** Open ash in the Emberworks' north (tests/sim/packBot.ts' ring 4 pack ground), with room east for spawns. */
const OPEN_ASH = { tx: 128, ty: 23 };

/** `?start=hollows` with every enemy gone but the Forgewright (and, if `keepGuards`, the Ash Kilns' guards), the end card closed, the player at `at`. */
async function emberworks(page: Page, at: { tx: number; ty: number }, keepGuards = false): Promise<void> {
  await boot(page, '?start=hollows');
  await page.evaluate((keep) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    // The golem's whelps rise as it falls: again for them.
    for (let k = 0; k < 3; k++) {
      for (const e of g.getState().enemies) if (e.enemyId !== 'forgewright' && !(keep && e.group === 'ash-kilns')) g.setEnemyHealth(e.id, 0);
      g.step(1);
    }
    g.step(197);
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

test.describe('review screenshots (061)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/061');

  test('a mixed pack on the ash', async ({ page }) => {
    test.setTimeout(180_000);
    await emberworks(page, OPEN_ASH);
    await spawnAll(page, [
      ['cinder-mote', 110, -30],
      ['cinder-mote', 140, 60],
      ['bellows-hound', 170, 10],
      ['slag-golem', 200, 50],
      ['kiln-tender', 230, 0],
    ]);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/01-mixed-pack.png` });
  });

  test('a mote swelling, its burst circle growing under it', async ({ page }) => {
    test.setTimeout(180_000);
    await emberworks(page, OPEN_ASH);
    const [id = -1] = await spawnAll(page, [['cinder-mote', 34, -6]]);
    await stepUntil(page, id, 'windup', 32);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/02-mote-swelling.png` });
  });

  test("a killed mote's death burst setting the pack round it burning", async ({ page }) => {
    test.setTimeout(180_000);
    await emberworks(page, OPEN_ASH);
    const [mote = -1] = await spawnAll(page, [
      ['cinder-mote', 160, 0],
      ['bellows-hound', 130, -20],
      ['slag-golem', 190, 20],
      ['kiln-tender', 165, 40],
    ]);
    // The burst, then a few ticks for its hit flash to clear: the flames stay.
    await page.evaluate((id) => {
      window.__GAME__?.setEnemyHealth(id, 0);
      window.__GAME__?.step(8);
    }, mote);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().enemyFlames)) ?? 0).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: `${SHOTS}/03-mote-death-burst.png` });
  });

  test("a hound's lane as it plants, then the trail its dash left", async ({ page }) => {
    test.setTimeout(180_000);
    await emberworks(page, OPEN_ASH);
    const [id = -1] = await spawnAll(page, [['bellows-hound', 170, 0]]);
    await stepUntil(page, id, 'windup', 30);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/04-hound-lane.png` });
    await page.evaluate(() => window.__GAME__?.step(16, { moveY: 1 }));
    await stepUntil(page, id, 'recover', 2);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/05-hound-trail.png` });
  });

  test('a golem splitting into its whelps', async ({ page }) => {
    test.setTimeout(180_000);
    await emberworks(page, OPEN_ASH);
    const [id = -1] = await spawnAll(page, [['slag-golem', 140, 0]]);
    await frames(page);
    await page.evaluate((g) => {
      window.__GAME__?.setEnemyHealth(g, 0);
      window.__GAME__?.step(1);
    }, id);
    await frames(page, 3);
    await page.screenshot({ path: `${SHOTS}/06-golem-split.png` });
    // A moment on: the whelps waddle out from where it fell.
    await page.evaluate(() => window.__GAME__?.step(24));
    await frames(page, 12);
    await page.screenshot({ path: `${SHOTS}/07-golem-whelps.png` });
  });

  test("a tender's beam on a hurt golem", async ({ page }) => {
    test.setTimeout(180_000);
    await emberworks(page, OPEN_ASH);
    const [golem = -1, tender = -1] = await spawnAll(page, [
      ['slag-golem', 120, 50],
      ['kiln-tender', 190, -60],
    ]);
    await page.evaluate((g) => window.__GAME__?.setEnemyHealth(g, 150), golem);
    await stepUntil(page, tender, 'swipe', 20);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/08-tender-beam.png` });
  });

  test("the Ash Kilns' guards", async ({ page }) => {
    test.setTimeout(180_000);
    const pylon = landmarkDef('ash-kilns').pylon ?? { tx: 0, ty: 0 };
    // At the site's east edge, the whole of it in view.
    await emberworks(page, { tx: pylon.tx + 8, ty: pylon.ty }, true);
    await frames(page);
    await page.screenshot({ path: `${SHOTS}/09-ash-kilns-guards.png` });
  });

  test('the five on the contact sheet', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/sheet.html');
    for (const [i, id] of ['cinder-mote', 'bellows-hound', 'slag-golem', 'slag-whelp', 'kiln-tender'].entries()) {
      const row = page.locator('h2', { hasText: new RegExp(`^${id}$`) }).locator('xpath=following-sibling::div[1]');
      await expect(row).toBeVisible({ timeout: 30_000 });
      await row.screenshot({ path: `${SHOTS}/${String(10 + i).padStart(2, '0')}-sheet-${id}.png` });
    }
  });
});
