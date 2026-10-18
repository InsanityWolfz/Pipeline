import { expect, test, type Page } from '@playwright/test';
import { boot, watchErrors } from './helpers';

// The prototype end to end (012): a fresh tutorial start, no ?playtest, every
// beat played through the hook in order, checking each objective advances.

const T = 32;

async function run<R>(page: Page, fn: () => R): Promise<R> {
  return page.evaluate(fn);
}

/** The current objective's index after one more tick (crafts land between ticks), or 12 once all are done. */
async function done(page: Page): Promise<number> {
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  return s?.objective?.index ?? 12;
}

test('the whole prototype plays through from the clearing', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await boot(page, '');
  // Page-side helpers for this run: walking between rooms and fighting a room clear.
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(0);
    const w = window as unknown as Record<string, unknown>;
    const toward = (from: number, to: number): -1 | 0 | 1 => (Math.abs(to - from) < 2 ? 0 : to > from ? 1 : -1);
    /** Walks to a door tile's inside neighbour, then steps through it. */
    w.through = (tx: number, ty: number, dx: -1 | 0 | 1, dy: -1 | 0 | 1, to: string) => {
      h.walkTo((tx - dx + 0.5) * tile, (ty - dy + 0.5) * tile);
      for (let i = 0; i < 90 && g.getState().room !== to; i++) g.step(1, { moveX: dx, moveY: dy });
      if (g.getState().room !== to) throw new Error(`could not reach ${to}`);
    };
    /** Fights every enemy in the player's room, kiting and rolling, picking ammo it has. */
    w.clearRoom = () => {
      let s = g.getState();
      const room = s.room;
      for (let t = 0; t < 20000; t++) {
        const foes = s.enemies.filter((e) => e.room === room);
        if (foes.length === 0) break;
        if (s.room !== room) throw new Error(`left ${room} (dying ${s.player.dying})`);
        const p = s.player;
        const near = foes.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (!near) break;
        const d = Math.hypot(near.x - p.x, near.y - p.y);
        const have = (id: string) => (s.inventory[id] ?? 0) + (s.link.reservoir.item === id ? s.link.reservoir.count : 0);
        const ammo = have('ley-bolt') > 0 ? 'ley-bolt' : have('arrow') > 0 ? 'arrow' : 'bomb';
        if (s.tube.ammo !== ammo) s = g.step(1, { selectAmmo: ammo });
        const kite = d < 80;
        const close = d > 150;
        s = g.step(1, {
          moveX: kite ? toward(near.x, p.x) : close ? toward(p.x, near.x) : 0,
          moveY: kite ? toward(near.y, p.y) : close ? toward(p.y, near.y) : 0,
          dodge: near.mode === 'windup' && d < 90 && t % 20 === 0,
          fire: true,
          aimX: near.x,
          aimY: near.y,
        });
      }
      h.collect();
    };
  }, T);

  // 1. Pick up the tube from its stone (clearing tile 12,11).
  await page.evaluate((tile) => {
    window.__helpers?.walkTo(12.5 * tile, 12.5 * tile);
    window.__GAME__?.step(1, { interact: true });
  }, T);
  expect(await done(page)).toBe(1);

  // 2. Gather: the clearing's nodes are 11-17 (trees, reeds, rubble, ley vein), in an
  // order whose straight walks stay clear of the stone and the nodes themselves.
  await run(page, () => {
    const h = window.__helpers;
    for (const i of [15, 13, 11, 17, 12]) h?.harvest(i, 3);
    h?.walkTo(18.5 * 32, 11 * 32);
    h?.harvest(14, 3);
    h?.walkTo(18.5 * 32, 16.5 * 32);
    h?.harvest(16, 3);
  });
  expect(await done(page)).toBe(2);

  // 3. Craft arrows.
  await run(page, () => {
    const g = window.__GAME__;
    for (const r of ['shaft', 'shaft', 'shaft', 'arrowhead', 'arrowhead', 'arrowhead', 'rope', 'rope', 'rope']) g?.craft(r);
    for (let i = 0; i < 6; i++) g?.craft('arrow');
  });
  expect(await done(page)).toBe(3);

  // 4. Up into the hall, gather its ley veins, and clear the Husk pack.
  await page.evaluate(() => {
    const w = window as unknown as { through: (...a: unknown[]) => void; clearRoom: () => void };
    // Up the clearing's east side, clear of the stone and the ley vein, to its top door.
    window.__helpers?.walkTo(13.5 * 32, 2.5 * 32);
    w.through(12, 0, 0, -1, 'ruin-hall');
    window.__helpers?.harvest(9, 3);
    window.__helpers?.harvest(10, 3);
    w.clearRoom();
  });
  expect(await done(page)).toBe(4);

  // 5. The foundry door is open: walk in (the tube attunes).
  await page.evaluate(() => {
    const w = window as unknown as { through: (...a: unknown[]) => void };
    w.through(0, 12, -1, 0, 'foundry');
  });
  expect(await done(page)).toBe(5);

  // 6. Craft a bomb and a ley bolt.
  await run(page, () => {
    const g = window.__GAME__;
    for (const r of ['ley-shard', 'casing', 'fuse', 'bomb', 'ley-bolt']) g?.craft(r);
  });
  expect(await done(page)).toBe(6);

  // 7-8. A ley bolt line into the tube socket, fed until the tube is full.
  const filled = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(6.5 * tile, 5.5 * tile);
    for (const [pieceId, tx] of [['hopper', 4], ['grinder', 5], ['focuser', 6], ['tube-socket', 7]] as const) {
      g.step(1, { place: { pieceId, tx, ty: 4, facing: 'right' } });
    }
    // Below the hopper, in reach, to fill it with every ley crystal carried.
    h.walkTo(4.5 * tile, 5.5 * tile);
    const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper');
    if (hopper) g.step(1, { deposit: { id: hopper.id, itemId: 'ley-crystal' } });
    let s = g.getState();
    for (let t = 0; t < 4000 && !s.firstLineFull; t++) s = g.step(1);
    return s.firstLineFull;
  }, T);
  expect(filled).toBe(true);
  expect(await done(page)).toBe(8);

  // 9. Identify the first Husk's armor at the bench (tile 1,12).
  await page.evaluate((tile) => {
    window.__helpers?.walkTo(2.5 * tile, 12.5 * tile);
    window.__GAME__?.step(1, { identify: true });
  }, T);
  expect(await done(page)).toBe(9);

  // 10. Out through the hall, up into the shrine, clear it and claim the pylon.
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    const w = window as unknown as { through: (...a: unknown[]) => void; clearRoom: () => void };
    if (!g || !h) throw new Error('no game');
    w.through(23, 8, 1, 0, 'ruin-hall');
    w.through(10, 0, 0, -1, 'shrine');
    w.clearRoom();
    h.walkTo(18.5 * tile, g.getState().player.y);
    h.walkTo(18.5 * tile, 9.5 * tile);
    h.walkTo(15.5 * tile, 9.5 * tile);
    g.step(1, { interact: true });
    g.step(130);
  }, T);
  expect(await done(page)).toBe(10);

  // 11. Home by the pylon, and a gravity stager (the Warden's core) facing the socket.
  await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(1, { pylon: 'travel' });
    g?.step(1, { takeStash: { itemId: null } });
  });
  // The Warden's core came home in hand; place the stager below the socket, facing up into it.
  await page.evaluate(() => {
    window.__GAME__?.step(1, { place: { pieceId: 'gravity-stager', tx: 7, ty: 5, facing: 'up' } });
  });
  expect(await done(page)).toBe(11);

  // 12. Head back out and let the foundry run.
  const end = await page.evaluate(() => {
    const w = window as unknown as { through: (...a: unknown[]) => void };
    w.through(23, 8, 1, 0, 'ruin-hall');
    const s = window.__GAME__?.step(620);
    return s ? { complete: s.prototypeComplete, objective: s.objective } : null;
  });
  expect(end).toEqual({ complete: true, objective: null });
  expect(errors).toEqual([]);
});

