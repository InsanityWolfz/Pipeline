import { TILE_SIZE } from '../data/config';
import { FIXTURES, type FixtureDef } from '../data/claims';
import type { Rect } from './collision';
import { facingVector } from './direction';
import type { Tile } from './pieces';

// The foundry's fixed furniture (009): the stash and bench from the start, the
// waystone once the shrine is claimed, and a supply port per raw once a claimed
// site supplies it (028). Never placed or picked up, so kept apart from the placed
// pieces. Claiming and using them is in claims.ts.

export interface FixtureState {
  /** The FIXTURES id. */
  id: string;
  /** Supply port: the raw it's trying to push out, or null. */
  item: string | null;
  /** Supply port: ticks since its last push. */
  timer: number;
}

export function fixtureDef(id: string): FixtureDef {
  const def = FIXTURES.find((f) => f.id === id);
  if (!def) throw new Error(`Unknown fixture '${id}'`);
  return def;
}

/** The fixtures there from the start (those no claim adds, and no ports). */
export function startingFixtures(): FixtureState[] {
  return FIXTURES.filter((f) => !f.claim && !f.raw).map((f) => ({ id: f.id, item: null, timer: 0 }));
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

/** Where a supply port hands its raw: the tile it faces. */
export function portFront(f: Pick<FixtureState, 'id'>): Tile {
  const d = fixtureDef(f.id);
  const [dx, dy] = facingVector(d.facing);
  return { tx: d.tx + dx, ty: d.ty + dy };
}

/** The solid things standing on a room's tiles that aren't fixtures or nodes: pylons, reliquaries (032) and the tube's stone. */
export function standingRects(room: { pylons?: readonly Tile[]; caches?: readonly Tile[]; tubeStone?: Tile }): Rect[] {
  return [...(room.pylons ?? []), ...(room.caches ?? []), ...(room.tubeStone ? [room.tubeStone] : [])].map(tileRect);
}
