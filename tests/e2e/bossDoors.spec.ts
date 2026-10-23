import { expect, test } from '@playwright/test';
import { SHRINE_ARENA } from '../../src/data/arenas';
import { enemyDef } from '../../src/data/enemies';
import { boot, watchErrors } from './helpers';
import { enterArena } from './arenaHelpers';

// The boss doors (055, D.5): the Warden's walled shrine has a door, sealed in the tutorial until the first line fills
// the tube; with the gates open (?playtest), E at it goes in, the Warden wakes and the shrine locks (043's seal over the
// door); E at the door leaves, and the Warden is back at its start at full health.

const W = SHRINE_ARENA;
const MAX = enemyDef(W.boss).maxHealth;

test("a new game's arena doors are sealed until their gates open", async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  expect(s?.arenas.map((a) => ({ id: a.id, unlocked: a.unlocked }))).toEqual([
    { id: 'shrine', unlocked: false },
    { id: 'sunken-forum', unlocked: false },
    // 060: the Anvil Hall's, unlocked by the Emberworks' barrier.
    { id: 'anvil-hall', unlocked: false },
  ]);
  expect(errors).toEqual([]);
});

test("?playtest: E at the shrine's door goes in, the Warden's fight locks it, and E at the door leaves and resets the Warden", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  // Declared setup, not play: the shrine's other guards and any wanderers are cleared through the hook, so the door
  // and the Warden are what's tested.
  await page.evaluate((boss) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    for (const e of g.getState().enemies) if ((e.group === 'shrine' && e.enemyId !== boss) || e.group.startsWith('pop-')) g.setEnemyHealth(e.id, 0);
    g.step(1);
    // Round the start stone onto the north-east road (053), as claiming.spec does.
    h.walkTo((41.5 + h.ox) * 32, g.getState().player.y);
  }, W.boss);
  await enterArena(page, W);
  const inside = await page.evaluate((boss) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s = g.getState();
    for (let t = 0; t < 180 && !s.arenas.find((a) => a.id === 'shrine')?.locked; t++) {
      s = g.step(1);
      g.setPlayerHealth(100);
    }
    const warden = s.enemies.find((e) => e.enemyId === boss);
    if (warden) g.setEnemyHealth(warden.id, Math.floor(warden.health / 2));
    return { arena: s.arenas.find((a) => a.id === 'shrine'), warden: g.getState().enemies.find((e) => e.enemyId === boss) };
  }, W.boss);
  expect(inside.arena).toMatchObject({ locked: true, unlocked: true, inside: true });
  expect(inside.warden?.health).toBeLessThan(MAX);
  await expect.poll(async () => (await page.evaluate(() => window.__GAME__?.ui().arenaDoors.find((d) => d.id === 'shrine')))?.seal).toBe('shut');

  // Back to the door and E: out, and the Warden is reset.
  const out = await page.evaluate((door) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo((door.tx + 0.5) * 32, (door.ty - 0.5) * 32);
    return g.step(1, { interact: true });
  }, W.door.tiles[1] ?? W.door.leaveTo);
  expect(out.events.arenaLeaves).toEqual([{ arena: 'shrine' }]);
  const left = { x: (W.door.leaveTo.tx + 0.5) * 32, y: (W.door.leaveTo.ty + 0.5) * 32 };
  expect({ x: out.player.x, y: out.player.y }).toEqual(left);
  expect(out.enemies.find((e) => e.enemyId === W.boss)).toMatchObject({ health: MAX, mode: 'idle' });
  expect(out.arenas.find((a) => a.id === 'shrine')).toMatchObject({ locked: false, inside: false });
  expect(errors).toEqual([]);
});
