import { expect, type Page } from '@playwright/test';
import type { FoundryMoodShown } from '../../src/render/foundry/FoundryMood';
import { boot } from './helpers';

// 079's e2e scenes, shared by foundryMood.spec.ts, its shots and its probe: a busy foundry from `?playtest` (every
// machine unlocked, the tube attuned), built through the sim's commands as the build bar would. Each forge unit is a
// column: a crate, a conduit up into it, the machine facing up, a hopper of its first input behind it and one of
// cinderite at its west side; the coil's unit is fed ley-steel by a Smelter below it and stormglass from its east. A
// hopper of arrows sends a conduit line into the intake's open mouth (tile 12, 0), so the intake fills.

/** The units' columns (each also takes the column west of it for its side hopper) and the band rows (the crate's). */
export const UNITS: readonly { x: number; y: number }[] = [
  ...[3, 5, 7, 9, 15, 17].map((x) => ({ x, y: 2 })),
  ...[3, 5, 7, 9, 15, 17].map((x) => ({ x, y: 8 })),
];
/** The coil's unit (its crate's tile). */
export const COIL_UNIT = { x: 20, y: 8 } as const;

export interface LineIds {
  forges: number[];
  coil: number;
  coilSmelter: number;
}

export const foundryMood = (page: Page): Promise<FoundryMoodShown> =>
  page.evaluate(() => {
    const m = window.__GAME__?.ui().foundryMood;
    if (!m) throw new Error('no game');
    return m;
  });

/**
 * Boots ?playtest (plus `query`), walks into the foundry and builds `units` forge units (Smelters and kilns in turn;
 * 12 at most), the coil's unit if `coil`, and the arrow line into the intake if `intake`; each hopper is filled with
 * `per` of its input by hand (E, ten at a time), the extra cinderite dropped at the player's feet first. Returns the
 * machines' ids. Nothing runs past the build: the caller steps.
 */
export async function forgeLine(page: Page, opts: { units?: number; per?: number; coil?: boolean; intake?: boolean; query?: string } = {}): Promise<LineIds> {
  await boot(page, `?playtest${opts.query ?? ''}`);
  return page.evaluate(
    ([units, per, coil, intake, cells, coilAt]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.toFoundry();
      type F = 'up' | 'right' | 'left';
      const place: [string, number, number, F][] = [];
      const fills: { tx: number; ty: number; item: string; from: [number, number] }[] = [];
      for (const [i, u] of cells.slice(0, units).entries()) {
        const machine = i % 2 === 0 ? 'smelter' : 'kiln';
        place.push(['crate', u.x, u.y, 'up'], ['conduit', u.x, u.y + 1, 'up'], [machine, u.x, u.y + 2, 'up'], ['hopper', u.x, u.y + 3, 'up'], ['hopper', u.x - 1, u.y + 2, 'right']);
        fills.push({ tx: u.x, ty: u.y + 3, item: machine === 'smelter' ? 'ley-iron' : 'ley-dust', from: [u.x + 0.5, u.y + 4.4] });
        fills.push({ tx: u.x - 1, ty: u.y + 2, item: 'cinderite', from: [u.x - 0.5, u.y + 3.4] });
      }
      if (coil) {
        const u = coilAt;
        place.push(['crate', u.x, u.y, 'up'], ['tempering-coil', u.x, u.y + 1, 'up'], ['smelter', u.x, u.y + 2, 'up'], ['hopper', u.x, u.y + 3, 'up'], ['hopper', u.x - 1, u.y + 2, 'right'], ['hopper', u.x + 1, u.y + 1, 'left']);
        fills.push({ tx: u.x, ty: u.y + 3, item: 'ley-iron', from: [u.x + 0.5, u.y + 4.4] });
        fills.push({ tx: u.x - 1, ty: u.y + 2, item: 'cinderite', from: [u.x - 0.5, u.y + 3.4] });
        fills.push({ tx: u.x + 1, ty: u.y + 1, item: 'stormglass', from: [u.x + 1.5, u.y + 2.4] });
      }
      if (intake) {
        place.push(['hopper', 12, 3, 'up'], ['conduit', 12, 2, 'up'], ['conduit', 12, 1, 'up']);
        fills.push({ tx: 12, ty: 3, item: 'arrow', from: [12.5, 4.4] });
      }
      // Out of the way while building: by the door. The hoppers, crates and conduits first, filled, then the machines
      // last, so every forge starts together with its whole supply.
      h.walkTo(21.5 * 32, 8.5 * 32);
      const isMachine = (id: string) => !['crate', 'conduit', 'hopper'].includes(id);
      for (const [pieceId, tx, ty, facing] of place.filter((p) => !isMachine(p[0]))) g.step(1, { place: { pieceId, tx, ty, facing } });
      let s = g.step(1);
      const at = (tx: number, ty: number) => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);
      
      // Enough cinderite (the kit's 99 runs short over many units): dropped at the feet, the magnet brings it in.
      const want: Record<string, number> = {};
      for (const f of fills) want[f.item] = (want[f.item] ?? 0) + per;
      for (const [item, n] of Object.entries(want)) {
        const have = s.inventory[item] ?? 0;
        for (let k = have; k < n; k++) g.drop(item, s.player.x, s.player.y);
      }
      s = g.step(30);
      for (const f of fills) {
        h.walkTo(f.from[0] * 32, f.from[1] * 32);
        for (let k = 0; k < per; k += 10) s = g.step(1, { deposit: { id: at(f.tx, f.ty)?.id ?? -1, itemId: f.item, amount: 'ten' } });
      }
      // Stand clear, in the room's middle, so the camera holds most of the floor; then the machines go down.
      h.walkTo(12.5 * 32, 6.6 * 32);
      for (const [pieceId, tx, ty, facing] of place.filter((p) => isMachine(p[0]))) g.step(1, { place: { pieceId, tx, ty, facing } });
      s = g.step(1);
      if (s.foundry.pieces.length !== place.length) throw new Error(`placed ${s.foundry.pieces.length} of ${place.length}`);
      const forges = cells.slice(0, units).map((u) => at(u.x, u.y + 2)?.id ?? -1);
      return { forges, coil: coil ? (at(coilAt.x, coilAt.y + 1)?.id ?? -1) : -1, coilSmelter: coil ? (at(coilAt.x, coilAt.y + 2)?.id ?? -1) : -1 };
    },
    [opts.units ?? 12, opts.per ?? 30, opts.coil ?? false, opts.intake ?? false, UNITS, COIL_UNIT] as const,
  );
}

/** Steps `ticks`, one drawn frame each `per` ticks, and returns what the foundry's mood showed each frame. */
export function runFrames(page: Page, frames: number, per = 2): Promise<FoundryMoodShown[]> {
  return page.evaluate(
    async ([n, k]) => {
      const g = window.__GAME__;
      if (!g) throw new Error('no game');
      const seen: FoundryMoodShown[] = [];
      for (let i = 0; i < n; i++) {
        g.step(k);
        await new Promise((r) => requestAnimationFrame(r));
        seen.push(g.ui().foundryMood);
      }
      return seen;
    },
    [frames, per] as const,
  );
}

/** Waits until every listed machine is working. */
export async function allWorking(page: Page, ids: readonly number[]): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((want) => {
          const g = window.__GAME__;
          if (!g) return false;
          const s = g.step(10);
          return want.every((id) => {
            const p = s.foundry.pieces.find((x) => x.id === id);
            return p?.kind === 'machine' && p.status === 'working';
          });
        }, ids),
      { timeout: 30_000 },
    )
    .toBe(true);
}
