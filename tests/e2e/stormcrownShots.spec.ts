import { expect, test, type Page } from '@playwright/test';
import { landmarkDef } from '../../src/data/landmarks';
import { STORMCROWN } from '../../src/data/stormcrown';
import { polar } from '../../src/data/worldShape';
import { boot, cameraSettled } from './helpers';
import { clickRow, flowIs } from './flowPage';

// Review screenshots for 064 (REVIEW_SHOTS=1, into docs/review/064): the Stormcrown from the top of a ramp and the Rod
// Field charged. Later slices add the lightning arc, the Conductor and the five-entrance intake.

const SHOTS = 'docs/review/064';

/** `?start=hollows` with every enemy gone but the Conductor (the Bulwark and the Forgewright too: both barriers down), the end card closed. */
export async function stormcrown(page: Page): Promise<void> {
  await boot(page, '?start=hollows');
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let k = 0; k < 3; k++) {
      for (const e of g.getState().enemies) if (e.enemyId !== 'conductor') g.setEnemyHealth(e.id, 0);
      g.step(1);
    }
    g.step(240);
  });
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
}

async function walkTo(page: Page, t: { tx: number; ty: number }): Promise<void> {
  await page.evaluate((p) => window.__helpers?.walkTo((p.tx + 0.5) * 32, (p.ty + 0.5) * 32), t);
}

/** Lets the discovery banners play out (fast, on the tween clock), so none covers the shot. */
export async function bannersGone(page: Page): Promise<void> {
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
}

test.describe('review screenshots (064)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/064');

  test('the Stormcrown from the top of the north-west ramp', async ({ page }) => {
    test.setTimeout(180_000);
    await stormcrown(page);
    const ramp = STORMCROWN.ramps.find((r) => r.id === 'storm-north-ramp') ?? { bearing: 0 };
    await walkTo(page, polar(ramp.bearing, STORMCROWN.ramp.to));
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-stormcrown-from-ramp.png` });
  });

  test('the Rod Field charged, a rod struck', async ({ page }) => {
    test.setTimeout(180_000);
    await stormcrown(page);
    const rods = landmarkDef('rod-field');
    await walkTo(page, { tx: rods.area.x0 + 3, ty: rods.area.y0 + 7 });
    await bannersGone(page);
    // Until two rods are charged at once and one was struck just now (its strike frame shows): step the sim.
    const charged = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let best = 0;
      for (let t = 0; t < 3000; t++) {
        const s = g.step(1);
        const n = s.nodes.filter((x) => x.nodeId === 'storm-rod' && x.vent === 'open').length;
        if (n >= 2 && s.events.rodStrikes.length > 0) return n;
        best = Math.max(best, n);
      }
      return best;
    });
    expect(charged).toBeGreaterThanOrEqual(1);
    await page.evaluate(() => window.__GAME__?.step(3));
    await page.screenshot({ path: `${SHOTS}/02-rod-field-charged.png` });
  });
});
