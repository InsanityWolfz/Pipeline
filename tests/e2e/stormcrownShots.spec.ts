import { expect, test, type Page } from '@playwright/test';
import { landmarkDef } from '../../src/data/landmarks';
import { STORMCROWN } from '../../src/data/stormcrown';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { polar } from '../../src/data/worldShape';
import { boot, cameraSettled, quietScreen } from './helpers';
import { feedLines, restoreEntrance, ui } from './intakePage';
import { clickRow, flowIs } from './flowPage';
import { SPAWN_GROUP } from '../../src/sim/sandbox';
import { bootSandbox, hidePanel, openPanel, setRound } from './sandboxPage';
import { breakFiveRods, intoSpire } from './conductorPage';

// Review screenshots for 064 (REVIEW_SHOTS=1, into docs/review/064): the Stormcrown from the top of a ramp and the Rod
// Field charged; the lightning arc; the five-entrance intake; the Conductor's blink, storm call, rod chain and grounding.

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

/** Into the Crown Spire by its door (E), the Conductor awake; then steps until `until` holds of its boss summary (the player kept up). */
async function inSpire(page: Page, until: 'blink' | 'call' | 'chain'): Promise<boolean> {
  await stormcrown(page);
  await walkTo(page, CROWN_SPIRE.door.leaveTo);
  await page.evaluate(() => window.__GAME__?.step(1, { interact: true }));
  await bannersGone(page);
  await page.evaluate((m) => window.__helpers?.walkTo((m.tx + 0.5) * 32, (m.ty - 2.5) * 32), CROWN_SPIRE.middle);
  await cameraSettled(page, 20_000);
  const spot = { x: (CROWN_SPIRE.middle.tx + 0.5) * 32, y: (CROWN_SPIRE.middle.ty - 2.5) * 32 };
  return page.evaluate(
    async ([want, at]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const toward = (d: number): -1 | 0 | 1 => (Math.abs(d) < 6 ? 0 : d > 0 ? 1 : -1);
      for (let t = 0; t < 2400; t++) {
        // A few ticks a frame, so only the last frames' bolts and flares are still on show.
        if (t % 4 === 0) await new Promise((r) => requestAnimationFrame(r));
        g.setPlayerHealth(100);
        // Back to its spot after each knock, so the camera holds.
        const p = g.getState().player;
        const s = g.step(1, { moveX: toward(at.x - p.x), moveY: toward(at.y - p.y) });
        const c = s.bosses.find((b) => b.enemyId === 'conductor');
        // At a rod in the top of the view (the east, west and both north ones), so it's in the shot.
        if (!c || ![0, 3, 4, 5].includes(c.rod)) continue;
        if (want === 'blink' && [0, 3, 4, 5].includes(c.blinkTo) && c.blinkWarn <= 25) return true;
        if (want === 'call' && c.attack === 1 && c.mode === 'windup' && c.modeTicks >= 30) return true;
        if (want === 'chain' && c.attack === 2 && c.mode === 'swipe' && c.modeTicks >= 4) return true;
      }
      return false;
    },
    [until, spot] as const,
  );
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
    // About 16.5 s here, with another build's tests running beside it (2026-10-26).
    test.setTimeout(60_000);
    await stormcrown(page);
    const ramp = STORMCROWN.ramps.find((r) => r.id === 'storm-north-ramp') ?? { bearing: 0 };
    await walkTo(page, polar(ramp.bearing, STORMCROWN.ramp.to));
    await bannersGone(page);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-stormcrown-from-ramp.png` });
  });

  test('the Rod Field charged, a rod struck', async ({ page }) => {
    // About 20.5 s here, with another build's tests running beside it (2026-10-26).
    test.setTimeout(60_000);
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
    // About 30 s here, with another build's tests running beside it (2026-10-26).
    test.setTimeout(90_000);
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

  test('the five-entrance intake, every cap restored and each entrance fed', async ({ page }) => {
    // About 14.8 s here, with another build's tests running beside it (2026-10-26).
    test.setTimeout(60_000);
    await boot(page, '?playtest');
    for (const tx of [11, 13, 14, 15]) await restoreEntrance(page, tx);
    await expect.poll(async () => (await ui(page))?.intakeCaps).toBe(0);
    // Five ammo, five gauge colours, west to east.
    await feedLines(page, [
      { tx: 11, itemId: 'arrow', amount: 'half' },
      { tx: 12, itemId: 'bomb', amount: 'all' },
      { tx: 13, itemId: 'ley-bolt', amount: 'all' },
      { tx: 14, itemId: 'landmine', amount: 'all' },
      { tx: 15, itemId: 'arrow', amount: 'all' },
    ], 12);
    // South of the lines, the pipe in the top of the view, with the schematic banner played out.
    await page.evaluate(() => {
      window.__helpers?.walkTo(16.5 * 32, 5.5 * 32);
      window.__GAME__?.step(1, { aimX: 13 * 32, aimY: 0 });
    });
    await quietScreen(page);
    await cameraSettled(page);
    await page.screenshot({ path: `${SHOTS}/04-five-entrance-intake.png` });
  });

  test('a five-lane volley', async ({ page }) => {
    // About 6.7 s here, with another build's tests running beside it (2026-10-26).
    test.setTimeout(45_000);
    await bootSandbox(page);
    await hidePanel(page);
    await cameraSettled(page, 20_000);
    // An arrow, a ley bolt, a Fire arrow, a Frost arrow and a Lightning arrow, west to east: the design's five-arrow spread.
    const fresh = await page.evaluate(() => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.step(1, { sandbox: { kind: 'god', on: true } });
      ['arrow', 'ley-bolt', 'arrow+fire', 'arrow+frost', 'arrow+lightning'].forEach((round, entrance) => g.step(1, { sandbox: { kind: 'loadout', entrance, round } }));
      const p = g.step(1).player;
      const known = new Set(g.step(0).arrows.map((a) => a.id));
      const shot = g.step(1, { fire: true, aimX: p.x + 220, aimY: p.y });
      g.step(10);
      return shot.arrows.filter((a) => !known.has(a.id)).map((a) => a.ammoId);
    });
    expect(fresh).toEqual(['arrow', 'ley-bolt', 'arrow+fire', 'arrow+frost', 'arrow+lightning']);
    await page.screenshot({ path: `${SHOTS}/05-five-lane-volley.png` });
  });

  test('the Conductor about to blink, the rod it goes to flashing', async ({ page }) => {
    // About 56.6 s here, with another build's tests running beside it (2026-10-26).
    test.setTimeout(180_000);
    expect(await inSpire(page, 'blink')).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().stormcrown.conductor.target ?? -1)).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: `${SHOTS}/06-conductor-blink.png` });
  });

  test('the storm call’s circles on and round the player', async ({ page }) => {
    // About 28 s here, with another build's tests running beside it (2026-10-26).
    test.setTimeout(90_000);
    expect(await inSpire(page, 'call')).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().stormcrown.conductor.strikes ?? 0)).toBe(5);
    await page.screenshot({ path: `${SHOTS}/07-storm-call.png` });
  });

  test('the rod chain’s lightning between the rods', async ({ page }) => {
    // About 22.3 s here, with another build's tests running beside it (2026-10-26).
    test.setTimeout(90_000);
    expect(await inSpire(page, 'chain')).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__GAME__?.ui().stormcrown.conductor.chain ?? false)).toBe(true);
    await page.screenshot({ path: `${SHOTS}/08-rod-chain.png` });
  });

  test('the Conductor grounded, five of its rods broken', async ({ page }) => {
    // About 18.1 s here, with another build's tests running beside it (2026-10-26).
    test.setTimeout(60_000);
    await intoSpire(page);
    expect((await breakFiveRods(page)).grounded).toBe(true);
    // Back by the middle, the Conductor and its broken rods in view.
    await page.evaluate((m) => window.__helpers?.walkTo((m.tx + 0.5) * 32, (m.ty - 1.5) * 32), CROWN_SPIRE.middle);
    await cameraSettled(page);
    // The breaks' sparks and the blinks' flares (all drawn in one frame, the sim stepped ahead) fade first.
    await expect.poll(() => page.evaluate(() => (window.__GAME__?.ui().particles ?? 1) + (window.__GAME__?.ui().stormcrown.conductor.bolts ?? 1)), { timeout: 20_000 }).toBe(0);
    await page.screenshot({ path: `${SHOTS}/09-conductor-grounded.png` });
  });
});
