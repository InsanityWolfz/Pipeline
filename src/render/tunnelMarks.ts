import { TUNNEL_PIECES } from '../data/pieces';
import { pieceAt, tilesBetween, type FoundryState, type Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { partnerFor, tunnelReach } from '../sim/tunnels';

// Where the floor shows the underground pair's tunnels (052, C.1), pure so tests can
// check it: "you place the first one and it shows like little lines on the top and
// bottom of the tiles you're going to be going under ... if you mouse over those
// tunnels, it shows you the lines that connect to another tunnel, just like Factorio"
// (Shaun). A `tunnel` mark is the tiles between a pair (hovered, or the ghost that
// would pair); a `reach` mark is the tiles an entrance reaches, while placing.

export interface TunnelMark {
  kind: 'tunnel' | 'reach';
  /** The tiles marked, nearest the entrance first. */
  tiles: Tile[];
  /** The way the tunnel runs, entrance to exit. */
  facing: Facing;
}

/** What the marks read: the build mode's selection and the ghost's tile and facing, and the tile under the cursor. */
export interface MarkInput {
  building: boolean;
  selected: string;
  /** The ghost's (and the hover's) tile, or null off the floor. */
  cursor: Tile | null;
  facing: Facing;
}

/** The tiles strictly between two tiles in a line. */
const inside = (a: Tile, b: Tile): Tile[] => tilesBetween(a, b).slice(0, -1);

export function tunnelMarks(foundry: FoundryState, m: MarkInput): TunnelMark[] {
  const marks: TunnelMark[] = [];
  const { cursor } = m;
  // Hovering a paired end shows its tunnel, in build mode or not.
  const hovered = cursor ? pieceAt(foundry, cursor.tx, cursor.ty) : undefined;
  if (hovered && (hovered.kind === 'tunnel-in' || hovered.kind === 'tunnel-out') && hovered.pair !== null) {
    const other = foundry.pieces.find((p) => p.id === hovered.pair);
    if (other) marks.push({ kind: 'tunnel', tiles: inside(hovered.kind === 'tunnel-in' ? hovered : other, hovered.kind === 'tunnel-in' ? other : hovered), facing: hovered.facing });
  }
  if (!m.building || !cursor) return marks;
  if (m.selected === TUNNEL_PIECES.in) {
    // The entrance's ghost: the tiles it reaches, and its tunnel to a free exit it would pair with.
    marks.push({ kind: 'reach', tiles: tunnelReach({ ...cursor, facing: m.facing }), facing: m.facing });
    const exit = partnerFor(foundry, { kind: 'tunnel-in', ...cursor, facing: m.facing });
    if (exit) marks.push({ kind: 'tunnel', tiles: inside(cursor, exit), facing: m.facing });
  } else if (m.selected === TUNNEL_PIECES.out) {
    // The exit selected: every free entrance's reach, and the ghost's tunnel to the entrance it would pair with.
    for (const p of foundry.pieces) if (p.kind === 'tunnel-in' && p.pair === null) marks.push({ kind: 'reach', tiles: tunnelReach(p), facing: p.facing });
    const entrance = partnerFor(foundry, { kind: 'tunnel-out', ...cursor, facing: m.facing });
    if (entrance) marks.push({ kind: 'tunnel', tiles: inside(entrance, cursor), facing: m.facing });
  }
  return marks;
}
