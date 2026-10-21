import { expect, test, type Page } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { OBJECTIVES } from '../../src/data/objectives';
import { AFTER_REFILL, REFILL_GOAL, SECOND_LINE_GOAL } from '../fixtures/foundrySteps';

// The prototype end to end (012): a fresh tutorial start, no ?playtest, every
// beat played through the hook in order, checking each objective advances.

const T = 32;

async function run<R>(page: Page, fn: () => R): Promise<R> {
  return page.evaluate(fn);
}

/** The current objective's index after one more tick (crafts land between ticks), or the count once all are done (the frontier line). */
async function done(page: Page): Promise<number> {
  const s = await page.evaluate(() => window.__GAME__?.step(1));
  return s?.objective?.index ?? OBJECTIVES.length;
}

const REFILL = OBJECTIVES.findIndex((o) => o.text === REFILL_GOAL);
const FILL = OBJECTIVES.findIndex((o) => o.text === AFTER_REFILL);
const SECOND = OBJECTIVES.findIndex((o) => o.text === SECOND_LINE_GOAL);

test('the whole prototype plays through from the start stone', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await boot(page, '?start=tutorial');
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
      for (const [tx, ty] of [[41.5, 22.5], [52.5, 21.5], [60.5, 18.5], [66.5, 17.5], [66.5, 13.5]]) h.walkTo(((tx ?? 0) + h.ox) * tile, (ty ?? 0) * tile);
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
        const have = (id: string) => (s.inventory[id] ?? 0) + s.intake.entrances.reduce((n, e) => n + (e.ammo === id ? e.count : 0), 0);
        // Piercing ammo first (029: arrows pierce now, ley bolts don't).
        const ammo = have('arrow') > 0 ? 'arrow' : have('ley-bolt') > 0 ? 'ley-bolt' : 'bomb';
        if ((s.hotbar.slots[s.hotbar.selected] ?? '') !== ammo) window.__helpers?.hold(ammo);
    s = g.step(0);
        // Out of every ammo, the fire button punches (023): close right in rather than keeping range.
        const dry = have('arrow') + have('ley-bolt') + have('bomb') === 0;
        const kite = !dry && d < 80;
        const close = dry ? d > 18 : d > 150;
        s = g.step(1, {
          moveX: kite ? toward(near.x, p.x) : close ? toward(p.x, near.x) : 0,
          moveY: kite ? toward(near.y, p.y) : close ? toward(p.y, near.y) : 0,
          dodge: near.mode === 'windup' && d < 90 && t % 20 === 0,
          fire: true,
          use: true,
          // At the body, not the feet: a Wisp's hurtbox floats above its feet, where a shot's ground point passes under it.
          aimX: near.x,
          aimY: near.y - 8,
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

  // 1. Pick up the tube from its stone (tile 40,33; +40 since 034), just north of where the player wakes.
  await page.evaluate((tile) => {
    window.__helpers?.walkTo((40.5 + (window.__helpers?.ox ?? 0)) * tile, 34.5 * tile);
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
    const X = h?.ox ?? 0;
    h?.walkTo((41.5 + X) * 32, window.__GAME__?.getState().player.y ?? 0);
    h?.walkTo((41.5 + X) * 32, 22.5 * 32);
    h?.walkTo((43.5 + X) * 32, 22.5 * 32);
    h?.walkTo((43.5 + X) * 32, 17.5 * 32);
    w.clearGroup('field');
  });
  expect(await done(page)).toBe(4);

  // 5. The meadow vein grows back three times over (waited out): crystals for ley bolts. Raws to refill the example
  // line later (046), and the bomb's casing takes a stone, so a tree and reeds once more and a rubble pile twice (the
  // Husks' raws are a seeded roll, not to be counted on).
  const raws = await page.evaluate(() => {
    const h = window.__helpers;
    const g = window.__GAME__;
    for (let i = 0; i < 3; i++) {
      g?.step(1800);
      h?.harvest(8, 3);
    }
    for (const node of [1, 6]) h?.harvest(node, 1);
    h?.harvest(5, 2);
    return g?.getState().inventory;
  });
  for (const raw of ['wood', 'stone', 'fiber']) expect(raws?.[raw] ?? 0, JSON.stringify(raws)).toBeGreaterThanOrEqual(raw === 'stone' ? 5 : 4);

  // 6. Craft a bomb and a ley bolt, before the foundry (051, B.3: their recipes are known once its stairs open).
  await run(page, () => {
    const g = window.__GAME__;
    for (const r of ['ley-dust', 'casing', 'fuse', 'bomb', 'ley-bolt']) g?.craft(r);
  });
  expect(await done(page)).toBe(5);

  // 7. Down the foundry's stairs: the tube attunes, and the example line stands there, running.
  await page.evaluate(() => window.__helpers?.toFoundry());
  const line = await page.evaluate(() => window.__GAME__?.getState().foundry.pieces.length);
  expect(line).toBe(9);
  // The refill goal waits while the example line runs (046): the line shows filling the tube.
  expect(await done(page)).toBe(FILL);

  // 14. The line runs until the centre entrance is full.
  const filled = await page.evaluate(() => {
    const g = window.__GAME__;
    let s = g?.getState();
    for (let t = 0; t < 4000 && s && !s.firstLineFull; t++) s = g?.step(1);
    return { full: s?.firstLineFull, inventory: s?.inventory, entrance: s?.intake.entrances[1] };
  });
  expect(filled.full, JSON.stringify(filled)).toBe(true);
  expect(await done(page)).toBe(FILL + 1);

  // The meadow vein's crystals are hand-crafted into ley bolts; the raws are kept for the refill.
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) return;
    for (let i = 0; i < 20 && (g.getState().inventory['ley-crystal'] ?? 0) > 0; i++) g.craft('ley-dust');
    for (let i = 0; i < 40 && (g.getState().inventory['ley-dust'] ?? 0) > 0; i++) g.craft('ley-bolt');
  });

  // 15. Identify the first Husk's armor at the bench (tile 1,12), and wear it for the fights ahead.
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    window.__helpers?.walkTo(2.5 * tile, 12.5 * tile);
    const piece = g?.step(1, { identify: true }).gear[0];
    if (piece) g?.step(1, { equip: { id: piece.id } });
  }, T);
  expect(await done(page)).toBe(FILL + 2);

  // 16. Up the stairs, along the path to the shrine (its gap opened with the full line), clear it and claim the pylon.
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    const w = window as unknown as { through: (...a: unknown[]) => void; toShrine: () => void; clearGroup: (group: string) => void };
    if (!g || !h) throw new Error('no game');
    w.through(23, 8, 1, 0, 'overworld');
    w.toShrine();
    w.clearGroup('shrine');
    // Around the pylon's east side, so it never stands in the way.
    h.walkTo((68.5 + h.ox) * tile, g.getState().player.y);
    h.walkTo((68.5 + h.ox) * tile, 9.5 * tile);
    h.walkTo((66.5 + h.ox) * tile, 9.5 * tile);
    // A roaming pack that wandered up meanwhile is fought off first, so the claim's hold isn't broken (039: with the
    // Warden no longer pushed by arrows, the shrine fight's timing moved and a population pack can arrive here).
    for (let i = 0; i < 3; i++) {
      const s = g.getState();
      const near = s.enemies.find((e) => e.room === s.room && Math.hypot(e.x - s.player.x, e.y - s.player.y) < 200);
      if (!near) break;
      w.clearGroup(near.group);
      h.walkTo((66.5 + h.ox) * tile, 9.5 * tile);
    }
    g.step(1, { interact: true });
    g.step(130);
  }, T);
  // The shrine's pylon is claimed; the example line ran dry through the fights (046), so its refill goal, earlier in
  // the chain, now shows ahead of the next.
  const claimed = await page.evaluate(() => window.__GAME__?.step(1));
  expect(claimed?.lineRanDry).toBe(true);
  expect(claimed?.objective).toEqual({ index: REFILL, text: REFILL_GOAL });
  expect(claimed?.claims).toContain('shrine');
  // 034: the shrine's claim dropped Stonefall Hollows' barrier.
  expect((await page.evaluate(() => window.__GAME__?.getState()))?.gates.hollows).toBe(true);

  // 17. Home by the pylon; the Warden's core came home in hand, and at the east cap the restore panel's Restore spends
  // it on one more entrance (033: one per core).
  const opened = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1, { pylon: 'travel' });
    g.step(1, { takeStash: { itemId: null } });
    const cores = g.getState().inventory['warden-core'] ?? 0;
    // Beside the arrow line's conduit, on the floor under the intake's east end.
    h.walkTo(14.5 * tile, 1.5 * tile);
    const s = g.step(1, { restore: 'entrance-2' });
    return { cores, after: s.inventory['warden-core'] ?? 0, open: s.intake.entrances.map((e) => e.open) };
  }, T);
  expect(opened).toEqual({ cores: 1, after: 0, open: [false, true, true] });

  // The refill goal still shows; the raws kept from the meadow go back into the example line's hoppers by hand.
  expect(await done(page)).toBe(REFILL);
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    for (const [tx, raw] of [[11, 'wood'], [12, 'stone'], [13, 'fiber']] as const) {
      h.walkTo((tx + 0.5) * tile, 6.25 * tile);
      const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === 5);
      if (!hopper) throw new Error(`no hopper at ${tx},5`);
      g.step(1, { deposit: { id: hopper.id, itemId: raw, amount: 'all' } });
    }
  }, T);
  // 18. After the Warden (046.3): a second arrow line into the new entrance. The line's first conduit gives way to a
  // splitter (on the bar from the start), whose side runs a conduit up into the east mouth.
  expect(await done(page)).toBe(SECOND);
  const volley = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    h.walkTo(15.5 * tile, 3.5 * tile);
    g.step(1, { pickUp: { tx: 12, ty: 2 } });
    g.step(1, { place: { pieceId: 'splitter', tx: 12, ty: 2, facing: 'up' } });
    g.step(1, { place: { pieceId: 'conduit', tx: 13, ty: 2, facing: 'up' } });
    g.step(1, { place: { pieceId: 'conduit', tx: 13, ty: 1, facing: 'up' } });
    let s = g.step(1);
    for (let t = 0; t < 2400 && s.intake.volley.length < 2; t++) s = g.step(1);
    return { volley: s.intake.volley.length, ammo: s.intake.entrances.map((e) => e.ammo) };
  }, T);
  expect(volley, JSON.stringify(volley)).toEqual({ volley: 2, ammo: [null, 'arrow', 'arrow'] });
  expect(await done(page)).toBe(SECOND + 2);

  // 19. Head back out and let the foundry run.
  const end = await page.evaluate(() => {
    const w = window as unknown as { through: (...a: unknown[]) => void };
    w.through(23, 8, 1, 0, 'overworld');
    const s = window.__GAME__?.step(620);
    return s ? { complete: s.prototypeComplete, objective: s.objective } : null;
  });
  // The prototype is done, and the line goes on to Milestone 1's first goal (028) rather than going blank.
  const port = OBJECTIVES.findIndex((o) => o.check.kind === 'portDelivered');
  expect(end).toEqual({ complete: true, objective: { index: port, text: 'Run a supply port into your line' } });
  expect(errors).toEqual([]);
});
