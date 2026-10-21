import { TILE_SIZE, VIEW_WIDTH } from '../data/config';
import { INTAKE } from '../data/foundry';
import { FOUNDRY_MAP } from '../data/foundryMap';
import { FOUNDRY_ROOM } from '../data/rooms';
import { facingVector, opposite } from '../sim/direction';
import type { Facing } from '../sim/player';
import { fixtureDef } from '../sim/fixtures';
import { roomById, type SimState } from '../sim/state';

// The foundry's minimap (051, B.6) as plain data, view px, so tests can check it: the room's box in the top-right
// corner, a line through each carrier, a dot per placed piece, and the icons. Items moving aren't shown.

type Point = { x: number; y: number };

export interface FoundryMapItems {
  /** The map's box, view px. */
  box: { x: number; y: number; w: number; h: number };
  /** Carriers (conduits, splitters, mergers, sorters): each a line from the side it takes from to the side it hands to. */
  lines: { x1: number; y1: number; x2: number; y2: number }[];
  /** Placed pieces that aren't carriers: machines, hoppers and crates. */
  dots: ({ kind: keyof typeof FOUNDRY_MAP.dots } & Point)[];
  /** The intake (the tube), the bench, the stash, the door, each open entrance, each supply port (with its raw), and the player. */
  icons: ({ kind: 'tube' | 'bench' | 'stash' | 'door' | 'entrance' | 'port' | 'player'; itemId?: string } & Point)[];
}

/** Where the map sits: the foundry's tiles at FOUNDRY_MAP.scale, its top-right `margin` from the screen's corner. */
export function foundryMapBox(): FoundryMapItems['box'] {
  const room = roomById(FOUNDRY_ROOM);
  const w = (room.rows[0]?.length ?? 0) * FOUNDRY_MAP.scale;
  const h = room.rows.length * FOUNDRY_MAP.scale;
  return { x: VIEW_WIDTH - FOUNDRY_MAP.margin - w, y: FOUNDRY_MAP.margin, w, h };
}

/** Everything the foundry map shows for `sim`. */
export function foundryMapItems(sim: SimState): FoundryMapItems {
  const box = foundryMapBox();
  const s = FOUNDRY_MAP.scale;
  const tile = (t: { tx: number; ty: number }): Point => ({ x: box.x + (t.tx + 0.5) * s, y: box.y + (t.ty + 0.5) * s });
  const edge = (c: Point, f: Facing): Point => {
    const [dx, dy] = facingVector(f);
    return { x: c.x + (dx * s) / 2, y: c.y + (dy * s) / 2 };
  };
  const lines: FoundryMapItems['lines'] = [];
  const dots: FoundryMapItems['dots'] = [];
  for (const p of sim.foundry.pieces) {
    const c = tile(p);
    if (p.kind === 'machine' || p.kind === 'hopper' || p.kind === 'crate') {
      dots.push({ kind: p.kind, ...c });
      continue;
    }
    // A conduit takes from its in side (013: its back, or a side for a corner); the others from their back.
    const from = edge(c, p.kind === 'conduit' ? p.inFrom : opposite(p.facing));
    const to = edge(c, p.facing);
    lines.push({ x1: from.x, y1: from.y, x2: c.x, y2: c.y }, { x1: c.x, y1: c.y, x2: to.x, y2: to.y });
  }
  const mid = INTAKE.entrances[Math.floor(INTAKE.entrances.length / 2)];
  const icons: FoundryMapItems['icons'] = [
    ...(mid ? [{ kind: 'tube' as const, ...tile(mid) }] : []),
    ...INTAKE.entrances.flatMap((m, i) => (sim.link.entrances[i]?.open ? [{ kind: 'entrance' as const, ...tile({ tx: m.tx, ty: m.ty + 1 }) }] : [])),
    ...(roomById(FOUNDRY_ROOM).doorways ?? []).map((d) => ({ kind: 'door' as const, ...tile(d) })),
    ...sim.fixtures.flatMap((f): FoundryMapItems['icons'] => {
      const d = fixtureDef(f.id);
      if (d.kind === 'bench' || d.kind === 'stash') return [{ kind: d.kind, ...tile(d) }];
      return d.kind === 'port' && d.raw ? [{ kind: 'port' as const, itemId: d.raw, ...tile(d) }] : [];
    }),
    ...(sim.roomId === FOUNDRY_ROOM ? [{ kind: 'player' as const, x: box.x + (sim.player.x / TILE_SIZE) * s, y: box.y + (sim.player.y / TILE_SIZE) * s }] : []),
  ];
  return { box, lines, dots, icons };
}
