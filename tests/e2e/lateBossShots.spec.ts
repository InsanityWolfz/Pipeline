import { expect, test } from '@playwright/test';
import { ANVIL_ARENA } from '../../src/data/arenas';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { cameraSettled } from './helpers';
import { breakRods, fireAtConductor, intoSpire } from './conductorPage';
import { intoHall } from './forgePage';

// Review screenshots for 068's tougher late bosses (REVIEW_SHOTS=1, into docs/review/068), in the sandbox: the
// Forgewright vented while its Forge Flood's pools are out (its heat now fills through vents, so floods come on their
// rhythm); the Conductor shielded with 4 rods standing (shots clanging off, the boss bar blue); and the Conductor
// exposed with 2 standing (shots landing).

const SHOTS = 'docs/review/068';

test.describe('review screenshots (068, the late bosses)', () => {
  test.skip(!process.env.REVIEW_SHOTS, 'set REVIEW_SHOTS=1 to capture docs/review/068');

  test('the Forgewright flooding its hall during a vent', async ({ page }) => {
    test.setTimeout(300_000);
    await intoHall(page);
    // The fan at its body from 7.5 tiles off, face-on, stepping back out to that range whenever it has walked in: it
    // vents now and then while its heat fills. Held until a vent comes while a flood's pools are still out (god mode
    // keeps the player up in them).
    const caught = await page.evaluate((r) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      const seen = { vents: 0, floods: 0, ticks: 0 };
      for (let t = 0; t < 9000; t++) {
        const f = g.getState().enemies.find((e) => e.enemyId === 'forgewright');
        if (!f) return seen;
        const p = g.getState().player;
        if (t % 60 === 0 && Math.hypot(p.x - f.x, p.y - f.y) < 200) {
          const west = f.x - 240 > (r.x0 + 1) * 32;
          h.walkTo(west ? f.x - 240 : f.x + 240, f.y);
        }
        const s = g.step(1, { fire: true, aimX: f.x, aimY: f.y - 24 });
        const boss = s.bosses.find((b) => b.enemyId === 'forgewright');
        Object.assign(seen, { vents: seen.vents + s.events.vents.length, floods: seen.floods + s.events.floods.length, ticks: t });
        if ((boss?.vent ?? 0) > 300 && s.floodPools.length > 0) return true;
      }
      return seen;
    }, ANVIL_ARENA.inside);
    expect(caught).toBe(true);
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().emberworks))?.forge).toMatchObject({ core: true, pools: 1 });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/01-forgewright-flood-during-vent.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('the Conductor shielded with 4 rods standing', async ({ page }) => {
    test.setTimeout(120_000);
    await intoSpire(page);
    const broke = await breakRods(page, 2);
    expect(broke.rods.filter((r) => r)).toHaveLength(2);
    // Back to the middle, shots ringing off his body, the sparks held still for the capture.
    await page.evaluate((m) => window.__helpers?.walkTo((m.tx + 0.5) * 32, (m.ty + 0.5) * 32), CROWN_SPIRE.middle);
    const shot = await fireAtConductor(page, 40);
    expect(shot.blocks).toBeGreaterThan(0);
    expect(shot.lost).toBe(0);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().bossBar))?.shielded).toBe(true);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/02-conductor-shielded-4-rods.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });

  test('the Conductor exposed with 2 rods standing', async ({ page }) => {
    test.setTimeout(120_000);
    await intoSpire(page);
    const broke = await breakRods(page, 4);
    expect(broke.rods.filter((r) => r)).toHaveLength(4);
    await page.evaluate((m) => window.__helpers?.walkTo((m.tx + 0.5) * 32, (m.ty + 0.5) * 32), CROWN_SPIRE.middle);
    const shot = await fireAtConductor(page, 120);
    expect(shot.lost).toBeGreaterThan(0);
    await page.evaluate(() => window.__GAME__?.tweenSpeed(0.05));
    await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().bossBar))?.shielded).toBe(false);
    await cameraSettled(page, 20_000);
    await page.screenshot({ path: `${SHOTS}/03-conductor-exposed-2-rods.png` });
    await page.evaluate(() => window.__GAME__?.tweenSpeed(1));
  });
});
