import { expect, test } from '@playwright/test';
import { BULWARK } from '../../src/data/bulwark';
import { HOLLOWS } from '../../src/data/hollows';
import { watchErrors } from './helpers';
import { intoForum } from './hollowsSandbox';

// The arena lock (043): with `?start=hollows`, walk into the Sunken Forum; the Bulwark wakes
// and a ley barrier seals the way in, in getState() and drawn; the player can't walk out
// through it. E at the sealed door leaves: the player stands just outside, the Bulwark is
// back at its start at full health, and the seal drops.

const A = HOLLOWS.arena;
const T = 32;
const SEAL_ROW = A.seal.tiles[0]?.ty ?? 0;

test('?start=hollows: the forum seals as the Bulwark wakes; E at the seal leaves and resets the fight', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await intoForum(page);
  const sealed = await page.evaluate(() => window.__GAME__?.getState());
  expect(sealed?.bosses[0]?.engaged).toBe(true);
  expect(sealed?.arenas).toEqual([{ id: A.id, sealed: true, seal: A.seal.tiles.map((t) => ({ tx: t.tx, ty: t.ty })) }]);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.seal).toBe('shut');

  // Walking out: the seal stops the player's feet.
  const tried = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    for (let t = 0; t < 60; t++) {
      g.step(1, { moveY: -1 });
      g.setPlayerHealth(100);
    }
    return g.getState().player.y;
  });
  expect(tried).toBeGreaterThanOrEqual((SEAL_ROW + 1) * T);

  // Hurt it, then E at the door: out, and the fight resets.
  const hurt = await page.evaluate((hp) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    const id = g.getState().bosses[0]?.id ?? -1;
    g.setEnemyHealth(id, hp);
    return g.step(1).bosses[0]?.health;
  }, Math.floor(BULWARK.maxHealth / 3));
  expect(hurt).toBeLessThan(BULWARK.maxHealth);
  // Under the hook the sim takes its commands from step (as the altar's summon does).
  const left = await page.evaluate(() => window.__GAME__?.step(1, { interact: true }));
  expect(left?.events.arenaLeaves).toEqual([{ arena: A.id }]);
  expect(left?.arenas[0]?.sealed).toBe(false);
  const after = await page.evaluate(() => window.__GAME__?.step(1));
  expect(after?.player.y).toBeLessThan(SEAL_ROW * T);
  expect(after?.bosses[0]).toMatchObject({ health: BULWARK.maxHealth, mode: 'idle', engaged: false, addsRisen: false });
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().hollows))?.seal).toBe('down');
  expect(errors).toEqual([]);
});
