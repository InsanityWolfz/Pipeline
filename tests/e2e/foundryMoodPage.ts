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
}

export const foundryMood = (page: Page): Promise<FoundryMoodShown> =>
  page.evaluate(() => {
    const m = window.__GAME__?.ui().foundryMood;
    if (!m) throw new Error('no game');
    return m;
  });

type Facing = 'up' | 'right' | 'left';
/** A piece to place, and a hopper to fill: its tile, its item, and the point (tiles) to stand at to reach it. */
type Place = [pieceId: string, tx: number, ty: number, facing: Facing];
interface Fill {
  tx: number;
  ty: number;
  item: string;
  from: [number, number];
}

/** The columns layout: `units` forge units (Smelters and kilns in turn), the coil's unit, the arrow line to the intake. */
function columns(units: number, coil: boolean, intake: boolean): { place: Place[]; fills: Fill[]; machines: (readonly [number, number])[]; coilAt: readonly [number, number] | null } {
  const place: Place[] = [];
  const fills: Fill[] = [];
  const machines: (readonly [number, number])[] = [];
  for (const [i, u] of UNITS.slice(0, units).entries()) {
    const machine = i % 2 === 0 ? 'smelter' : 'kiln';
    place.push(['crate', u.x, u.y, 'up'], ['conduit', u.x, u.y + 1, 'up'], [machine, u.x, u.y + 2, 'up'], ['hopper', u.x, u.y + 3, 'up'], ['hopper', u.x - 1, u.y + 2, 'right']);
    fills.push({ tx: u.x, ty: u.y + 3, item: machine === 'smelter' ? 'ley-iron' : 'ley-dust', from: [u.x + 0.5, u.y + 4.4] });
    fills.push({ tx: u.x - 1, ty: u.y + 2, item: 'cinderite', from: [u.x - 0.5, u.y + 3.4] });
    machines.push([u.x, u.y + 2]);
  }
  const u = COIL_UNIT;
  if (coil) {
    place.push(['crate', u.x, u.y, 'up'], ['tempering-coil', u.x, u.y + 1, 'up'], ['smelter', u.x, u.y + 2, 'up'], ['hopper', u.x, u.y + 3, 'up'], ['hopper', u.x - 1, u.y + 2, 'right'], ['hopper', u.x + 1, u.y + 1, 'left']);
    fills.push({ tx: u.x, ty: u.y + 3, item: 'ley-iron', from: [u.x + 0.5, u.y + 4.4] });
    fills.push({ tx: u.x - 1, ty: u.y + 2, item: 'cinderite', from: [u.x - 0.5, u.y + 3.4] });
    fills.push({ tx: u.x + 1, ty: u.y + 1, item: 'stormglass', from: [u.x + 1.5, u.y + 2.4] });
  }
  if (intake) {
    place.push(['hopper', 12, 3, 'up'], ['conduit', 12, 2, 'up'], ['conduit', 12, 1, 'up']);
    fills.push({ tx: 12, ty: 3, item: 'arrow', from: [12.5, 4.4] });
  }
  return { place, fills, machines, coilAt: coil ? [u.x, u.y + 1] : null };
}

/** The showcase: a Smelter (row 5), a kiln (row 8) and the coil fed by a Smelter (row 11), facing east into crates, their tops clear; and the arrow line into the intake. */
export const SHOWCASE = { smelter: [6, 5], kiln: [6, 8], coil: [7, 11] } as const;
function showcase(): { place: Place[]; fills: Fill[]; machines: (readonly [number, number])[]; coilAt: readonly [number, number] | null } {
  const place: Place[] = [];
  const fills: Fill[] = [];
  for (const [machine, [x, y], first] of [['smelter', SHOWCASE.smelter, 'ley-iron'], ['kiln', SHOWCASE.kiln, 'ley-dust']] as const) {
    place.push([machine, x, y, 'right'], ['conduit', x + 1, y, 'right'], ['crate', x + 2, y, 'up'], ['hopper', x, y + 1, 'up'], ['hopper', x - 1, y, 'right']);
    fills.push({ tx: x, ty: y + 1, item: first, from: [x + 0.5, y + 2.4] }, { tx: x - 1, ty: y, item: 'cinderite', from: [x - 1.5, y + 0.5] });
  }
  const [cx, cy] = SHOWCASE.coil;
  place.push(['smelter', cx - 1, cy, 'right'], ['tempering-coil', cx, cy, 'right'], ['crate', cx + 1, cy, 'up'], ['hopper', cx - 1, cy + 1, 'up'], ['hopper', cx - 2, cy, 'right'], ['hopper', cx, cy + 1, 'up']);
  fills.push({ tx: cx - 1, ty: cy + 1, item: 'ley-iron', from: [cx - 0.5, cy + 2.4] }, { tx: cx - 2, ty: cy, item: 'cinderite', from: [cx - 2.5, cy + 1.4] }, { tx: cx, ty: cy + 1, item: 'stormglass', from: [cx + 0.5, cy + 2.4] });
  // The arrow line into the intake's open mouth, so the intake fills (and ley pulses run).
  place.push(['hopper', 12, 3, 'up'], ['conduit', 12, 2, 'up'], ['conduit', 12, 1, 'up']);
  fills.push({ tx: 12, ty: 3, item: 'arrow', from: [12.5, 4.4] });
  return { place, fills, machines: [SHOWCASE.smelter, SHOWCASE.kiln], coilAt: [cx, cy] };
}

/**
 * Boots ?playtest (plus `query`), walks into the foundry and builds a layout: `columns` (the busy foundry: `units` forge
 * units, 12 at most, the coil's unit if `coil`, the arrow line into the intake if `intake`) or `showcase`. The hoppers,
 * crates and conduits go down first and each hopper is filled with `per` of its input by hand (E, ten at a time; the
 * extra raws dropped at the player's feet first), then the machines, so every forge starts with its whole supply.
 * Returns the machines' ids. Nothing runs past the build: the caller steps.
 */
export async function forgeLine(page: Page, opts: { units?: number; per?: number; coil?: boolean; intake?: boolean; query?: string; layout?: 'columns' | 'showcase' } = {}): Promise<LineIds> {
  await boot(page, `?playtest${opts.query ?? ''}`);
  const plan = opts.layout === 'showcase' ? showcase() : columns(opts.units ?? 12, opts.coil ?? false, opts.intake ?? false);
  return page.evaluate(
    ([place, fills, machines, coilAt, per]) => {
      const g = window.__GAME__;
      const h = window.__helpers;
      if (!g || !h) throw new Error('no game');
      h.toFoundry();
      // Out of the way while building: by the door.
      h.walkTo(21.5 * 32, 8.5 * 32);
      const isMachine = (id: string) => !['crate', 'conduit', 'hopper'].includes(id);
      for (const [pieceId, tx, ty, facing] of place.filter((p) => !isMachine(p[0]))) g.step(1, { place: { pieceId, tx, ty, facing } });
      let s = g.step(1);
      const at = (tx: number, ty: number) => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);
      const want: Record<string, number> = {};
      for (const f of fills) want[f.item] = (want[f.item] ?? 0) + per;
      for (const [item, n] of Object.entries(want)) for (let k = s.inventory[item] ?? 0; k < n; k++) g.drop(item, s.player.x, s.player.y);
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
      return { forges: machines.map(([x, y]) => at(x, y)?.id ?? -1), coil: coilAt ? (at(coilAt[0], coilAt[1])?.id ?? -1) : -1 };
    },
    [plan.place, plan.fills, plan.machines, plan.coilAt, opts.per ?? 30] as const,
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
