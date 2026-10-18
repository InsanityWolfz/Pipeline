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

test('the whole prototype plays through from the start stone', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await boot(page, '');
  // Page-side helpers for this run: leaving the foundry, the route to the shrine and fighting a group clear (017).
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
    /** From the foundry's stairs, east along the dirt path and in through the shrine's gap (src/data/overworld.ts). */
    w.toShrine = () => {
      for (const [tx, ty] of [[41.5, 22.5], [52.5, 21.5], [60.5, 18.5], [66.5, 17.5], [66.5, 13.5]]) h.walkTo((tx ?? 0) * tile, (ty ?? 0) * tile);
    };
    /** Fights until a group is dead, kiting and rolling, picking ammo it has; anything else that comes close is fought first. */
    w.clearGroup = (group: string) => {
      let s = g.getState();
      let stuck = 0;
      for (let t = 0; t < 20000; t++) {
        const foes = s.enemies.filter((e) => e.group === group);
        if (foes.length === 0) break;
        if (s.events.ko) throw new Error(`knocked out clearing ${group}`);
        const p = s.player;
        const dist = (e: { x: number; y: number }) => Math.hypot(e.x - p.x, e.y - p.y);
        const near = s.enemies.filter((e) => dist(e) < 150).sort((a, b) => dist(a) - dist(b))[0] ?? foes.sort((a, b) => dist(a) - dist(b))[0];
        if (!near) break;
        const d = dist(near);
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
        // Closing in but stuck on something (018: groves, ponds and rocks): go round it.
        stuck = close && Math.hypot(s.player.x - p.x, s.player.y - p.y) < 0.1 ? stuck + 1 : 0;
        if (stuck > 20) {
          stuck = 0;
          try {
            h.walkTo(near.x, near.y + 64);
          } catch {
            // Unreachable from here; the fight goes on.
          }
          s = g.getState();
        }
      }
      h.collect();
    };
  }, T);

  // 1. Pick up the tube from its stone (tile 40,33), just north of where the player wakes.
  await page.evaluate((tile) => {
    window.__helpers?.walkTo(40.5 * tile, 34.5 * tile);
    window.__GAME__?.step(1, { interact: true });
  }, T);
  expect(await done(page)).toBe(1);

  // 2. Gather in the meadow (nodes 0-8, src/data/overworld.ts): the ley vein, then east and back west.
  await run(page, () => {
    const h = window.__helpers;
    for (const i of [8, 3, 7, 5, 6, 1, 0]) h?.harvest(i, 3);
  });
  expect(await done(page)).toBe(2);

  // 3. Craft arrows.
  await run(page, () => {
    const g = window.__GAME__;
    for (const r of ['shaft', 'shaft', 'shaft', 'arrowhead', 'arrowhead', 'arrowhead', 'rope', 'rope', 'rope']) g?.craft(r);
    for (let i = 0; i < 6; i++) g?.craft('arrow');
  });
  expect(await done(page)).toBe(3);

  // 4. Up the path round the mound's east side into the ruin field, and clear the Husk pack.
  await page.evaluate(() => {
    const w = window as unknown as { clearGroup: (group: string) => void };
    const h = window.__helpers;
    h?.walkTo(41.5 * 32, window.__GAME__?.getState().player.y ?? 0);
    h?.walkTo(41.5 * 32, 22.5 * 32);
    h?.walkTo(43.5 * 32, 22.5 * 32);
    h?.walkTo(43.5 * 32, 17.5 * 32);
    w.clearGroup('field');
  });
  expect(await done(page)).toBe(4);

  // 5. The meadow vein has grown back twice by now (waited out): more crystals for the line, then
  // down the foundry's stairs (the tube attunes).
  await page.evaluate(() => {
    const h = window.__helpers;
    const g = window.__GAME__;
    for (let i = 0; i < 2; i++) {
      g?.step(1800);
      h?.harvest(8, 3);
    }
    h?.toFoundry();
  });
  expect(await done(page)).toBe(5);

  // 6. Craft a bomb and a ley bolt.
  await run(page, () => {
    const g = window.__GAME__;
    for (const r of ['ley-shard', 'casing', 'fuse', 'bomb', 'ley-bolt']) g?.craft(r);
  });
  expect(await done(page)).toBe(6);

  // 7-8. A ley bolt line up into the intake's middle mouth tile (019), fed until the tube is full.
  const filled = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(14.5 * tile, 5.5 * tile);
    for (const [pieceId, ty] of [['hopper', 4], ['grinder', 3], ['focuser', 2], ['conduit', 1]] as const) {
      g.step(1, { place: { pieceId, tx: 12, ty, facing: 'up' } });
    }
    // Just below the hopper, well in reach (USE_REACH), to fill it with every ley crystal carried.
    h.walkTo(12.5 * tile, 5.25 * tile);
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

  // 10. Up the stairs, along the path to the shrine (its gap opened with the full line), clear it and claim the pylon.
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    const w = window as unknown as { through: (...a: unknown[]) => void; toShrine: () => void; clearGroup: (group: string) => void };
    if (!g || !h) throw new Error('no game');
    w.through(23, 8, 1, 0, 'overworld');
    w.toShrine();
    w.clearGroup('shrine');
    // Around the pylon's east side, so it never stands in the way.
    h.walkTo(68.5 * tile, g.getState().player.y);
    h.walkTo(68.5 * tile, 9.5 * tile);
    h.walkTo(66.5 * tile, 9.5 * tile);
    g.step(1, { interact: true });
    g.step(130);
  }, T);
  expect(await done(page)).toBe(10);

  // 11. Home by the pylon, and a gravity stager (the Warden's core) facing the intake.
  await page.evaluate(() => {
    const g = window.__GAME__;
    g?.step(1, { pylon: 'travel' });
    g?.step(1, { takeStash: { itemId: null } });
  });
  // The Warden's core came home in hand; place the stager under the intake's east mouth tile, facing up into it.
  await page.evaluate(() => {
    window.__GAME__?.step(1, { place: { pieceId: 'gravity-stager', tx: 13, ty: 1, facing: 'up' } });
  });
  expect(await done(page)).toBe(11);

  // 12. Head back out and let the foundry run.
  const end = await page.evaluate(() => {
    const w = window as unknown as { through: (...a: unknown[]) => void };
    w.through(23, 8, 1, 0, 'overworld');
    const s = window.__GAME__?.step(620);
    return s ? { complete: s.prototypeComplete, objective: s.objective } : null;
  });
  expect(end).toEqual({ complete: true, objective: null });
  expect(errors).toEqual([]);
});
