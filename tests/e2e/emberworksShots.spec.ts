import { expect, test, type Page } from '@playwright/test';
import { EMBERWORKS } from '../../src/data/emberworks';
import { landmarkDef } from '../../src/data/landmarks';
import { polar } from '../../src/data/worldShape';
import { boot, cameraSettled, quietScreen } from './helpers';
import { clickRow, flowIs } from './flowPage';
import { SPAWN_GROUP } from '../../src/sim/sandbox';
import { feedLines, restoreEntrance, ui } from './intakePage';
import { bootSandbox, hidePanel, openPanel, setRound } from './sandboxPage';

// Review screenshots for 060 (REVIEW_SHOTS=1, into docs/review/060): the Emberworks from the top of a ramp, the
// Cinder Vents flaring open, the Ash Kilns claimed, a pack set burning by Fire bombs in the sandbox, the intake
// with its four entrances open and fed, and a four-lane volley. Later slices add the Forgewright's.

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

  test('a Fire bomb pack burning', async ({ page }) => {
    test.setTimeout(120_000);
    await bootSandbox(page);
    await openPanel(page);
    await setRound(page, 0, 'bomb+fire');
    await hidePanel(page);
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { sandbox: { kind: 'loadout', entrance: 1, round: null } });
      g.step(1, { sandbox: { kind: 'loadout', entrance: 2, round: null } });
      g.step(1, { sandbox: { kind: 'loadout', entrance: 3, round: null } });
      g.step(1, { sandbox: { kind: 'god', on: true } });
      g.step(1, { sandbox: { kind: 'spawn', enemyId: 'husk', ring: 3, champion: false, count: 5 } });
    });
    // Lob into the pack's middle as it comes on, then let the first beat land while it's still a few tiles off.
    const burning = await page.evaluate((group) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      let lit = 0;
      for (let t = 0; t < 1200; t++) {
        const pack = g.getState().enemies.filter((e) => e.group === group);
        const x = pack.reduce((n, e) => n + e.x, 0) / Math.max(1, pack.length);
        const y = pack.reduce((n, e) => n + e.y, 0) / Math.max(1, pack.length);
        const st = g.step(1, { fire: lit < 3, aimX: x, aimY: y });
        lit = Math.max(lit, st.enemies.filter((e) => e.burn > 0).length);
        if (lit >= 3 && st.events.hits.some((h) => h.target === 'enemy' && h.burn)) return st.enemies.filter((e) => e.burn > 0).length;
      }
      return 0;
    }, SPAWN_GROUP);
    expect(burning).toBeGreaterThanOrEqual(3);
    // Hold the burn numbers still for the capture.
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().enemyFlames ?? 0)).toBeGreaterThanOrEqual(3);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/04-fire-bomb-pack-burning.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('the four-entrance intake, every cap restored and each entrance fed', async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, '?playtest');
    for (const tx of [11, 13, 14]) await restoreEntrance(page, tx);
    await expect.poll(async () => (await ui(page))?.intakeCaps).toBe(0);
    // Four ammo, four gauge colours, west to east.
    await feedLines(page, [
      { tx: 11, itemId: 'arrow', amount: 'half' },
      { tx: 12, itemId: 'bomb', amount: 'all' },
      { tx: 13, itemId: 'ley-bolt', amount: 'all' },
      { tx: 14, itemId: 'landmine', amount: 'all' },
    ], 12);
    // South of the lines, the pipe in the top of the view, with the schematic banner played out.
    await page.evaluate(() => {
      window.__helpers?.walkTo(16.5 * 32, 5.5 * 32);
      window.__GAME__?.step(1, { aimX: 13 * 32, aimY: 0 });
    });
    await quietScreen(page);
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/05-four-entrance-intake.png` });
  });

  test('a four-lane volley', async ({ page }) => {
    test.setTimeout(120_000);
    await bootSandbox(page);
    await hidePanel(page);
    await cameraSettled(page, 20_000);
    // An arrow, a ley bolt, a Fire arrow and a Frost arrow, west to east: four lanes a few ticks out, each its own colour.
    const fresh = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { sandbox: { kind: 'god', on: true } });
      ['arrow', 'ley-bolt', 'arrow+fire', 'arrow+frost'].forEach((round, entrance) => g.step(1, { sandbox: { kind: 'loadout', entrance, round } }));
      const p = g.step(1).player;
      const known = new Set(g.step(0).arrows.map((a) => a.id));
      const shot = g.step(1, { fire: true, aimX: p.x + 220, aimY: p.y });
      g.step(10);
      return shot.arrows.filter((a) => !known.has(a.id)).map((a) => a.ammoId);
    });
    expect(fresh).toEqual(['arrow', 'ley-bolt', 'arrow+fire', 'arrow+frost']);
    await page.screenshot({ path: `${SHOTS}/06-four-lane-volley.png` });
  });
});
