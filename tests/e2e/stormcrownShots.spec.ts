import { expect, test, type Page } from '@playwright/test';
import { landmarkDef } from '../../src/data/landmarks';
import { STORMCROWN } from '../../src/data/stormcrown';
import { polar } from '../../src/data/worldShape';
import { boot, cameraSettled } from './helpers';
import { clickRow, flowIs } from './flowPage';
import { SPAWN_GROUP } from '../../src/sim/sandbox';
import { bootSandbox, hidePanel, openPanel, setRound } from './sandboxPage';

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

  test('a lightning arc across a sandbox pack', async ({ page }) => {
    test.setTimeout(120_000);
    await bootSandbox(page);
    await openPanel(page);
    await setRound(page, 0, 'arrow+lightning');
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const n = g.getState().loadout?.length ?? 0;
      for (let i = 1; i < n; i++) g.step(1, { sandbox: { kind: 'loadout', entrance: i, round: null } });
      g.step(1, { sandbox: { kind: 'god', on: true } });
      // Face east, so the pack stands beside the player, clear of the HUD.
      g.step(4, { moveX: 1, aimX: g.getState().player.x + 200, aimY: g.getState().player.y });
      g.step(1, { sandbox: { kind: 'spawn', enemyId: 'husk', ring: 3, champion: false, count: 5 } });
    });
    await hidePanel(page);
    // Shoot the nearest until a hit arcs two on, then hold the bolts for the shot.
    const arcs = await page.evaluate((group) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      for (let t = 0; t < 600; t++) {
        const s = g.getState();
        const p = s.player;
        const pack = s.enemies.filter((e) => e.group === group);
        const near = pack.reduce((a, b) => (Math.hypot(b.x - p.x, b.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? b : a), pack[0] ?? { x: p.x + 100, y: p.y });
        const after = g.step(1, { fire: t % 2 === 0, aimX: near.x, aimY: near.y - 10 });
        if (after.events.arcs.length >= 2) {
          g.tweenSpeed(0.02);
          return after.events.arcs.length;
        }
      }
      return 0;
    }, SPAWN_GROUP);
    expect(arcs).toBeGreaterThanOrEqual(1);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().lightningArcs ?? 0)).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/03-lightning-arc.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });
});
