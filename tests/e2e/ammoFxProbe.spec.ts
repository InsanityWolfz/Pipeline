import { expect, test, type Page } from '@playwright/test';
import type { Quality } from '../../src/data/settings';
import { openWorld, spawnPack, toRegion } from './lightingPage';

// 078's performance probe (PROBE=1; a measurement, not a check: real-time frame times on a shared machine or a CI
// runner would flake). In one page, interleaved (070's method), a five-entrance fight in the Stormcrown (bombs, arrows,
// ley bolts with their tags and tiers into a pack):
// - Low against `fxOff` (as `?fx=off`: no trails, impacts, marks or sparks): Low's mean frame time is to be at most
//   1.1× fx off's, and its ticks per real second at least 0.9×;
// - Low, Medium and High frame times in the same fight.
// The numbers are printed and attached to the test's results.

type Look = Quality | 'off';

interface Window {
  look: Look;
  mean: number;
  p95: number;
  ticksPerSecond: number;
  /** Impacts played in the window: the fight was on. */
  impacts: number;
}

const VOLLEY = ['bomb+steel+cluster', 'arrow+stormsteel+fire', 'ley-bolt+glass+split', 'arrow+lightning', 'ley-bolt+storm-glass+homing'];
const STORM_PACK = ['static-mite', 'storm-sentinel', 'thunderhawk', 'gale-ram', 'thunderhawk'];

/** Real-time play for `ms`: the loop runs the sim, the volley fired at the pack (left click held). Off is Low with the effects skipped. */
async function measure(page: Page, look: Look, ms: number): Promise<Window> {
  await page.evaluate((l) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.fxOff(l === 'off');
    g.setLook({ quality: l === 'off' ? 'low' : l });
  }, look);
  return page.evaluate(
    async ([l, span]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      g.resume();
      for (let i = 0; i < 10; i++) await new Promise((r) => requestAnimationFrame(r));
      const ds: number[] = [];
      const tick0 = g.getState().tick;
      const played0 = g.ui().ammoFx.played;
      const t0 = performance.now();
      let last = t0;
      while (performance.now() - t0 < span) {
        g.setPlayerHealth(100);
        await new Promise((r) => requestAnimationFrame(r));
        const now = performance.now();
        ds.push(now - last);
        last = now;
      }
      const ticks = g.getState().tick - tick0;
      const secs = (performance.now() - t0) / 1000;
      ds.sort((a, b) => a - b);
      return { look: l, mean: ds.reduce((a, b) => a + b, 0) / ds.length, p95: ds[Math.floor(ds.length * 0.95)] ?? 0, ticksPerSecond: ticks / secs, impacts: g.ui().ammoFx.played - played0 };
    },
    [look, ms] as const,
  );
}

async function interleave(page: Page, looks: readonly Look[], rounds: number, ms: number, refill: () => Promise<void>): Promise<Record<string, { mean: number; p95: number; ticksPerSecond: number; impacts: number }>> {
  const all: Window[] = [];
  for (let r = 0; r < rounds; r++) {
    for (const l of looks) {
      await refill();
      all.push(await measure(page, l, ms));
    }
  }
  const out: Record<string, { mean: number; p95: number; ticksPerSecond: number; impacts: number }> = {};
  for (const l of looks) {
    const w = all.filter((x) => x.look === l);
    const median = (f: (x: Window) => number) => {
      const v = w.map(f).sort((a, b) => a - b);
      return Math.round((v[Math.floor(v.length / 2)] ?? 0) * 10) / 10;
    };
    out[l] = { mean: median((x) => x.mean), p95: median((x) => x.p95), ticksPerSecond: median((x) => x.ticksPerSecond), impacts: median((x) => x.impacts) };
  }
  return out;
}

/** Keeps the pack in the fight (more spawned when fewer than half are alive) and the entrances full. */
const keepUp = (page: Page) => async () => {
  const alive = await page.evaluate((v) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.loadEntrances(v);
    const s = g.getState();
    return s.enemies.filter((e) => e.room === s.room && e.health > 0 && Math.hypot(e.x - s.player.x, e.y - s.player.y) < 400).length;
  }, VOLLEY);
  if (alive < STORM_PACK.length / 2) await spawnPack(page, STORM_PACK);
};

test.describe('shot effects probe (078)', () => {
  test.skip(!process.env.PROBE, 'set PROBE=1 to measure frame times');

  test('Low against the effects off, and the three tiers, in a Stormcrown five-entrance fight', async ({ page }, info) => {
    test.setTimeout(1_200_000);
    await openWorld(page);
    await toRegion(page, 'stormcrown');
    await page.evaluate(() => window.__GAME__?.step(1, { selectSlot: 4 }));
    const box = await page.locator('canvas').boundingBox();
    if (!box) throw new Error('no canvas');
    const k = box.width / 640;
    await page.mouse.move(box.x + box.width / 2 + 140 * k, box.y + box.height / 2);
    await page.mouse.down();
    const ab = await interleave(page, ['off', 'low'], 6, 2500, keepUp(page));
    const tiers = await interleave(page, ['low', 'medium', 'high'], 3, 2500, keepUp(page));
    await page.mouse.up();
    const report = { ab, tiers, frameRatio: (ab.low?.mean ?? 0) / (ab.off?.mean ?? 1), tickRatio: (ab.low?.ticksPerSecond ?? 0) / (ab.off?.ticksPerSecond ?? 1) };
    console.log('ammo fx', JSON.stringify(report));
    await info.attach('ammo-fx.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect.soft(report.frameRatio).toBeLessThanOrEqual(1.1);
    expect.soft(report.tickRatio).toBeGreaterThanOrEqual(0.9);
  });
});
