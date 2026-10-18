import { TILE_SIZE } from '../data/config';
import { FIXTURES, type FixtureDef } from '../data/claims';
import type { Rect } from './collision';
import { facingVector } from './direction';
import type { Tile } from './pieces';

// The foundry's fixed furniture (009): the stash from the start, the supply port
// and waystone once the shrine is claimed. Never placed or picked up, so kept
// apart from the placed pieces. Claiming and using them is in claims.ts.

export interface FixtureState {
  /** The FIXTURES id. */
  id: string;
  /** Supply port: the raw it's trying to push out, or null. */
  item: string | null;
  /** Supply port: ticks since its last push. */
  timer: number;
  /** Supply port: index into PORT_CYCLE of the next raw. */
  next: number;
}

export function fixtureDef(id: string): FixtureDef {
  const def = FIXTURES.find((f) => f.id === id);
  if (!def) throw new Error(`Unknown fixture '${id}'`);
  return def;
}

/** The fixtures there from the start (those no claim adds). */
export function startingFixtures(): FixtureState[] {
  return FIXTURES.filter((f) => !f.claim).map((f) => ({ id: f.id, item: null, timer: 0, next: 0 }));
}


/** The box a tile covers, px: a pylon's or a fixture's (both solid). */
export const tileRect = (t: Tile): Rect => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });

/** Every fixture's box: they're all solid. */
export function fixtureRects(fixtures: readonly FixtureState[]): Rect[] {
  return fixtures.map((f) => tileRect(fixtureDef(f.id)));
}

/** The fixture covering a foundry tile, if any. */
export function fixtureAt(fixtures: readonly FixtureState[], tx: number, ty: number): FixtureState | undefined {
  return fixtures.find((f) => {
    const d = fixtureDef(f.id);
    return d.tx === tx && d.ty === ty;
  });
}

/** Where the supply port hands its raw: the tile it faces. */
export function portFront(f: FixtureState): Tile {
  const d = fixtureDef(f.id);
  const [dx, dy] = facingVector(d.facing);
  return { tx: d.tx + dx, ty: d.ty + dy };
}
