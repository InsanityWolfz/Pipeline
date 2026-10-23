import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';
import { fanUntilVent, intoHall } from './forgePage';

// 060: venting the Forgewright with a three-lane fan in the sandbox. From 7.5 tiles face-on, the fan's outer lanes
// break both bellows (its plating blocking the middle lane); it vents, staggering with its core aglow, its boss bar
// red again, and hits land; both bellows come back whole as the vent ends.

test('a three-lane fan from 7.5 tiles breaks both bellows and vents the Forgewright; hits land until it ends', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await intoHall(page);
  const before = await page.evaluate(() => window.__GAME__?.getState().bosses.find((b) => b.enemyId === 'forgewright'));
  expect(before).toMatchObject({ engaged: true, plated: true, health: 4000 });
  const ticks = await fanUntilVent(page);
  expect(ticks).toBeGreaterThan(0);
  const venting = await page.evaluate(() => window.__GAME__?.getState().bosses.find((b) => b.enemyId === 'forgewright'));
  expect(venting).toMatchObject({ mode: 'vent', plated: false, heat: 0 });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().bossBar))?.shielded).toBe(false);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().emberworks))?.forge).toMatchObject({ core: true, bellows: ['broken', 'broken'] });
  // Its health falls while it vents.
  const after = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 120; t++) {
      const f = g.getState().enemies.find((e) => e.enemyId === 'forgewright');
      g.step(1, { fire: true, aimX: f?.x ?? 0, aimY: (f?.y ?? 0) - 24 });
    }
    return g.getState().bosses.find((b) => b.enemyId === 'forgewright')?.health ?? 4000;
  });
  expect(after).toBeLessThan(4000);
  // The vent runs out: plated again, both bellows whole.
  const ended = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 400; t++) if (g.step(1).events.ventEnds.length > 0) break;
    return g.getState().bosses.find((b) => b.enemyId === 'forgewright');
  });
  expect(ended).toMatchObject({ plated: true, bellows: [{ health: 150, patch: 0 }, { health: 150, patch: 0 }] });
  expect(errors).toEqual([]);
});
