import { expect, test } from '@playwright/test';
import { STORMCROWN } from '../../src/data/stormcrown';
import { polar, WORLD_SHAPE } from '../../src/data/worldShape';
import { boot, watchErrors } from './helpers';
import { clickRow, flowIs } from './flowPage';

// The Stormcrown (064): its ley barrier stands across the top of each ramp up through the Emberworks' cliff edge until
// the Forgewright's first kill; then it collapses and the player walks up the ramp into ring 5, region 4.

const RAMP = STORMCROWN.ramps.find((r) => r.id === 'storm-north-ramp') ?? { bearing: 0 };
const FOOT = polar(RAMP.bearing, STORMCROWN.ramp.from + 1);
const TOP = polar(RAMP.bearing, STORMCROWN.ramp.to + 2);

/** Kills a boss through the hook and steps until its gate opens; closes the end card if its kill showed it. */
async function fell(page: import('@playwright/test').Page, boss: string, gate: string): Promise<boolean> {
  const open = await page.evaluate(
    ([b, gt]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const e = g.getState().enemies.find((x) => x.enemyId === b);
      if (!e) throw new Error(`no ${b}`);
      g.setEnemyHealth(e.id, 0);
      for (let t = 0; t < 120; t++) if (g.step(1).events.gates.some((x) => x.gate === gt)) return true;
      return false;
    },
    [boss, gate] as const,
  );
  await page.evaluate(() => window.__GAME__?.step(200));
  if ((await page.evaluate(() => window.__GAME__?.flow().state)) === 'endCard') {
    await clickRow(page, 'keepPlaying');
    await flowIs(page, 'play');
  }
  return open;
}

test('the Forgewright’s first kill drops the Stormcrown’s barrier, and the player walks up into ring 5', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await boot(page, '?start=hollows');
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (const e of g.getState().enemies) if (e.enemyId !== 'bulwark' && e.enemyId !== 'forgewright') g.setEnemyHealth(e.id, 0);
    g.step(1);
  });
  expect(await fell(page, 'bulwark', 'emberworks')).toBe(true);
  // At the Stormcrown ramp's foot with its barrier up: walking up it stops at the barrier.
  const blocked = await page.evaluate(
    ([foot, top, c]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.walkTo((foot.tx + 0.5) * 32, (foot.ty + 0.5) * 32);
      try {
        h.walkTo((top.tx + 0.5) * 32, (top.ty + 0.5) * 32);
      } catch {
        // Expected: the barrier stops the walk.
      }
      const s = g.getState();
      return { gate: s.gates.stormcrown, out: Math.hypot(s.player.x / 32 - 0.5 - c.tx, s.player.y / 32 - 0.5 - c.ty) };
    },
    [FOOT, TOP, WORLD_SHAPE.centre] as const,
  );
  expect(blocked.gate).toBe(false);
  expect(blocked.out).toBeLessThan(STORMCROWN.ramp.gateAt);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().stormcrown))?.barrier).toBe('shut');

  // The Forgewright falls: the barrier drops, and the player walks up into ring 5 and region 4.
  expect(await fell(page, 'forgewright', 'stormcrown')).toBe(true);
  const up = await page.evaluate((top) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo((top.tx + 0.5) * 32, (top.ty + 0.5) * 32);
    const s = g.getState();
    return { tile: { tx: Math.floor(s.player.x / 32), ty: Math.floor(s.player.y / 32) }, ring: s.area.ring, region: s.area.region };
  }, TOP);
  expect(up).toEqual({ tile: TOP, ring: 5, region: 4 });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().stormcrown))?.barrier, { timeout: 20_000 }).toBe('down');
  expect(errors).toEqual([]);
});
