import { expect, test, type Page } from '@playwright/test';
import { EMBERWORKS } from '../../src/data/emberworks';
import { landmarkDef } from '../../src/data/landmarks';
import { polar } from '../../src/data/worldShape';
import { boot, cameraSettled } from './helpers';
import { clickRow, flowIs } from './flowPage';

// Review screenshots for 060 (REVIEW_SHOTS=1, into docs/review/060): the Emberworks from the top of a ramp, the
// Cinder Vents flaring open, and the Ash Kilns claimed. Later slices add the Fire rune's, the Forgewright's and the
// fourth entrance's.

const SHOTS = 'docs/review/060';

/** `?start=hollows` with every enemy gone (the Bulwark too: the Emberworks' barrier is down), the end card closed. */
async function emberworks(page: Page): Promise<void> {
  await boot(page, '?start=hollows');
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) g.setEnemyHealth(e.id, 0);
    g.step(200);
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
async function bannersGone(page: Page): Promise<void> {
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

test.describe('review screenshots (060)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/060');

  test('the Emberworks from the top of the west ramp', async ({ page }) => {
    test.setTimeout(120_000);
    await emberworks(page);
    const ramp = EMBERWORKS.ramps.find((r) => r.id === 'west-ramp') ?? { bearing: 0 };
    await walkTo(page, polar(ramp.bearing, EMBERWORKS.ramp.to));
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-emberworks-from-ramp.png` });
  });

  test('the Cinder Vents flaring open', async ({ page }) => {
    test.setTimeout(120_000);
    await emberworks(page);
    const vents = landmarkDef('cinder-vents');
    // Among the vents, on open ash between them.
    const mid = { tx: vents.area.x0 + 5, ty: vents.area.y0 + 5 };
    await walkTo(page, mid);
    await bannersGone(page);
    // Until most of the vents in view are open at once (their cycles overlap by a third at most): step the sim.
    const open = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let best = 0;
      for (let t = 0; t < 1200; t++) {
        const n = g.step(1).nodes.filter((x) => x.nodeId === 'cinder-vent' && x.vent === 'open').length;
        if (n >= 2) return n;
        best = Math.max(best, n);
      }
      return best;
    });
    expect(open).toBeGreaterThanOrEqual(1);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/02-cinder-vents-open.png` });
  });

  test('the Ash Kilns claimed', async ({ page }) => {
    test.setTimeout(120_000);
    await emberworks(page);
    const pylon = landmarkDef('ash-kilns').pylon ?? { tx: 0, ty: 0 };
    await walkTo(page, { tx: pylon.tx, ty: pylon.ty + 1 });
    await page.evaluate(() => {
      window.__GAME__?.claim('ash-kilns');
      window.__GAME__?.step(90);
    });
    await walkTo(page, { tx: pylon.tx + 4, ty: pylon.ty + 2 });
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/03-ash-kilns-claimed.png` });
  });
});
