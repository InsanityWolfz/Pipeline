import { expect, test } from '@playwright/test';
import { BULWARK } from '../../src/data/bulwark';
import { HOLLOWS } from '../../src/data/hollows';
import { watchErrors } from './helpers';
import { intoForum } from './hollowsSandbox';

// The arena lock (043) on the forum's door (055): with `?start=hollows`, E at the Sunken Forum's door goes in; the
// Bulwark wakes and the forum locks (043's seal over the door), in getState() and drawn; the player can't walk out
// through the door. E at it leaves: the player stands just outside, the Bulwark is back at its start at full health,
// and the seal drops.

const A = HOLLOWS.arena;
const T = 32;
const SEAL_ROW = A.door.tiles[0]?.ty ?? 0;
const forumDoor = (ui: { arenaDoors: { id: string; seal: string }[] } | undefined) => ui?.arenaDoors.find((d) => d.id === A.id)?.seal;

test('?start=hollows: E at the door goes in, the forum locks as the Bulwark wakes; E at the door leaves and resets the fight', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await intoForum(page);
  const sealed = await page.evaluate(() => window.__GAME__?.getState());
  expect(sealed?.bosses[0]?.engaged).toBe(true);
  expect(sealed?.arenas.find((a) => a.id === A.id)).toEqual({ id: A.id, locked: true, unlocked: true, inside: true, door: A.door.tiles.map((t) => ({ tx: t.tx, ty: t.ty })) });
  await expect.poll(async () => forumDoor(await page.evaluate(() => window.__GAME__?.ui()))).toBe('shut');

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
  expect(left?.arenas.find((a) => a.id === A.id)?.locked).toBe(false);
  const after = await page.evaluate(() => window.__GAME__?.step(1));
  expect(after?.player.y).toBeLessThan(SEAL_ROW * T);
  expect(after?.bosses[0]).toMatchObject({ health: BULWARK.maxHealth, mode: 'idle', engaged: false, addsRisen: false });
  // The seal fades as the barrier collapses (900 ms on the tween clock, slower in frames under a loaded machine).
  await expect.poll(async () => forumDoor(await page.evaluate(() => window.__GAME__?.ui()))).not.toBe('shut');
  await expect.poll(async () => forumDoor(await page.evaluate(() => window.__GAME__?.ui())), { timeout: 20_000 }).toBe('down');
  expect(errors).toEqual([]);
});
