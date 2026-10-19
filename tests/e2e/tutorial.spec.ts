import { expect, test, type Page } from '@playwright/test';
import { boot, watchErrors } from './helpers';
import { OBJECTIVES } from '../../src/data/objectives';
import { AFTER_STEPS, FOUNDRY_STEPS } from '../fixtures/foundrySteps';

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

const FILL = OBJECTIVES.findIndex((o) => o.text === AFTER_STEPS);

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
        const have = (id: string) => (s.inventory[id] ?? 0) + s.intake.entrances.reduce((n, e) => n + (e.ammo === id ? e.count : 0), 0);
        // Piercing ammo first (029: arrows pierce now, ley bolts don't).
        const ammo = have('arrow') > 0 ? 'arrow' : have('ley-bolt') > 0 ? 'ley-bolt' : 'bomb';
        if (s.tube.ammo !== ammo) s = g.step(1, { selectAmmo: ammo });
        const kite = d < 80;
        const close = d > 150;
        s = g.step(1, {
          moveX: kite ? toward(near.x, p.x) : close ? toward(p.x, near.x) : 0,
          moveY: kite ? toward(near.y, p.y) : close ? toward(p.y, near.y) : 0,
          dodge: near.mode === 'windup' && d < 90 && t % 20 === 0,
          fire: true,
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

  // 5. The meadow vein grows back three times over (waited out): crystals for ley bolts. The arrow line (027)
  // needs four of each raw to fill an entrance, so a tree, a rubble pile and reeds once more; then down the
  // foundry's stairs (the tube attunes).
  const raws = await page.evaluate(() => {
    const h = window.__helpers;
    const g = window.__GAME__;
    for (let i = 0; i < 3; i++) {
      g?.step(1800);
      h?.harvest(8, 3);
    }
    for (const node of [1, 5, 6]) h?.harvest(node, 1);
    h?.toFoundry();
    return g?.getState().inventory;
  });
  for (const raw of ['wood', 'stone', 'fiber']) expect(raws?.[raw] ?? 0, JSON.stringify(raws)).toBeGreaterThanOrEqual(4);
  expect(await done(page)).toBe(5);

  // 6. Craft a bomb and a ley bolt.
  await run(page, () => {
    const g = window.__GAME__;
    for (const r of ['ley-shard', 'casing', 'fuse', 'bomb', 'ley-bolt']) g?.craft(r);
  });
  expect(await done(page)).toBe(6);

  // 7-13. The foundry steps (027), one at a time: an arrow line up into the intake's middle mouth tile (019),
  // hoppers on row 5, the part machines on row 4, the assembler across row 3, and conduits up into the mouth.
  const texts = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    const stand = () => h.walkTo(15.5 * tile, 6.5 * tile);
    const text = () => g.step(1).objective?.text ?? '';
    const put = (pieceId: string, tx: number, ty: number) => g.step(1, { place: { pieceId, tx, ty, facing: 'up' } });
    /** Just below the hopper, in reach, every one of `itemId` carried goes in. */
    const fill = (tx: number, ty: number, itemId: string) => {
      h.walkTo((tx + 0.5) * tile, (ty + 1.25) * tile);
      const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === ty);
      if (!hopper) throw new Error(`no hopper at ${tx},${ty}`);
      g.step(1, { deposit: { id: hopper.id, itemId, amount: 'all' } });
      stand();
    };
    /** Steps until the line moves on (a machine's craft takes a while). */
    const next = (from: string) => {
      let now = text();
      for (let t = 0; t < 600 && now === from; t++) now = text();
      return now;
    };
    stand();
    const seen = [text()];
    put('hopper', 11, 5);
    seen.push(text());
    fill(11, 5, 'wood');
    seen.push(text());
    put('cutter', 11, 4);
    seen.push(next(seen[seen.length - 1] ?? ''));
    put('hopper', 12, 5);
    fill(12, 5, 'stone');
    put('knapper', 12, 4);
    seen.push(next(seen[seen.length - 1] ?? ''));
    put('hopper', 13, 5);
    fill(13, 5, 'fiber');
    put('spinner', 13, 4);
    seen.push(next(seen[seen.length - 1] ?? ''));
    put('assembler', 12, 3);
    seen.push(next(seen[seen.length - 1] ?? ''));
    put('conduit', 12, 2);
    put('conduit', 12, 1);
    seen.push(next(seen[seen.length - 1] ?? ''));
    return seen;
  }, T);
  expect(texts).toEqual([...FOUNDRY_STEPS, AFTER_STEPS]);
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

  // The raws left over go into the line's hoppers, so it keeps the entrance topped up through the fights ahead,
  // and the meadow vein's crystals are hand-crafted into ley bolts.
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) return;
    for (const [tx, raw] of [[11, 'wood'], [12, 'stone'], [13, 'fiber']] as const) {
      h.walkTo((tx + 0.5) * tile, 6.25 * tile);
      const hopper = g.getState().foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === 5);
      if (hopper) g.step(1, { deposit: { id: hopper.id, itemId: raw, amount: 'all' } });
    }
    for (let i = 0; i < 20 && (g.getState().inventory['ley-crystal'] ?? 0) > 0; i++) g.craft('ley-shard');
    for (let i = 0; i < 40 && (g.getState().inventory['ley-shard'] ?? 0) > 0; i++) g.craft('ley-bolt');
  }, T);

  // 15. Identify the first Husk's armor at the bench (tile 1,12), and wear it for the fights ahead.
  await page.evaluate((tile) => {
    const g = window.__GAME__;
    window.__helpers?.walkTo(2.5 * tile, 12.5 * tile);
    const piece = g?.step(1, { identify: true }).armorPieces[0];
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
    h.walkTo(68.5 * tile, g.getState().player.y);
    h.walkTo(68.5 * tile, 9.5 * tile);
    h.walkTo(66.5 * tile, 9.5 * tile);
    g.step(1, { interact: true });
    g.step(130);
  }, T);
  expect(await done(page)).toBe(FILL + 3);

  // 17. Home by the pylon; the Warden's core came home in hand, and E at the intake spends it to open the side entrances (024).
  const opened = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.step(1, { pylon: 'travel' });
    g.step(1, { takeStash: { itemId: null } });
    const cores = g.getState().inventory['warden-core'] ?? 0;
    // Beside the arrow line's conduit, on the floor under the intake's east end.
    h.walkTo(14.5 * tile, 1.5 * tile);
    const s = g.step(1, { interact: true });
    return { cores, after: s.inventory['warden-core'] ?? 0, open: s.intake.entrances.map((e) => e.open) };
  }, T);
  expect(opened).toEqual({ cores: 1, after: 0, open: [true, true, true] });
  expect(await done(page)).toBe(FILL + 4);

  // 18. Lines into the side entrances: a hopper of ley bolts, hand-crafted from the crystals left, and a conduit up
  // into each side mouth, so two entrances feed whatever the arrow line has left in the centre.
  const volley = await page.evaluate((tile) => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    for (let i = 0; i < 20 && (g.getState().inventory['ley-crystal'] ?? 0) > 0; i++) g.craft('ley-shard');
    for (let i = 0; i < 40 && (g.getState().inventory['ley-shard'] ?? 0) > 0; i++) g.craft('ley-bolt');
    for (const tx of [13, 11]) {
      g.step(1, { place: { pieceId: 'conduit', tx, ty: 1, facing: 'up' } });
      g.step(1, { place: { pieceId: 'hopper', tx, ty: 2, facing: 'up' } });
    }
    for (const [tx, amount] of [[13, 'half'], [11, 'all']] as const) {
      h.walkTo((tx + (tx > 12 ? 1.5 : -0.5)) * tile, 2.5 * tile);
      const s = g.step(1);
      const hopper = s.foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === tx && p.ty === 2);
      const ammo = ['ley-bolt', 'arrow', 'bomb'].find((id) => (s.inventory[id] ?? 0) > 0);
      if (!hopper || !ammo) throw new Error(`no hopper or no ammo carried: ${JSON.stringify(s.inventory)}`);
      g.step(1, { deposit: { id: hopper.id, itemId: ammo, amount } });
    }
    let s = g.step(1);
    for (let t = 0; t < 900 && s.intake.volley.length < 2; t++) s = g.step(1);
    return s.intake.volley.length;
  }, T);
  expect(volley, JSON.stringify(volley)).toBeGreaterThanOrEqual(2);
  expect(await done(page)).toBe(FILL + 5);

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
