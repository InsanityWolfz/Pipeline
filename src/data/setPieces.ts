import type { DecorRegion } from './decor';
import { SET_PIECE_FRAMES } from './worldArtAssets';

// 077: the big set pieces, three per region, to steer by. They are not 032's landmarks: no banner, XP, minimap icon or
// landmark area; hovering one shows its name. None blocks anything new: each stands only on tiles that already stop
// feet and straight shots (a grove's trees, cliff runs, kiln rows, cairns), and the tiles under its footprint draw no
// standing sprite of their own. Places were found on the fixed map (seed 20261018); tests/data/setPieces.test.ts holds
// them to the placement rules. Px are world px from the piece's anchor, the bottom centre of its footprint (y up is
// negative); bearings are degrees clockwise from north, distances tiles from the foundry's door.

export type SetPieceId = keyof typeof SET_PIECE_FRAMES;

/** A glow halo (014's additive glow) over part of a piece: where, its colour and radius, and whether it breathes. */
export interface SetPieceHalo {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly radius: number;
  readonly breathe: boolean;
}

export interface SetPieceDef {
  readonly id: SetPieceId;
  readonly name: string;
  readonly region: DecorRegion;
  /** Its footprint: top-left tile, width and height in tiles. */
  readonly footprint: { readonly tx: number; readonly ty: number; readonly w: number; readonly h: number };
  /** The kind of solid tile it stands on (and replaces the look of). */
  readonly standsOn: 'tree' | 'cliff' | 'kiln' | 'cairn';
  /** Its look's size, px: drawn `w` wide centred on the anchor and `h` tall above it (a shadow may spill 4 px below). */
  readonly look: { readonly w: number; readonly h: number };
  /** Its base: the opaque pixels in its footprint's bottom row, px from the anchor (left, right, top). */
  readonly base: { readonly x0: number; readonly x1: number; readonly y0: number };
  /** A loop over the base (chains, smoke, wires): ms a frame. Held on the first frame on Low. */
  readonly loopMs?: number;
  /** A swaying part (the Colossus's ivy): where its root is, px from the anchor; it sways like a tree. */
  readonly swayAt?: readonly [number, number];
  readonly halos?: readonly SetPieceHalo[];
  /** Where its light sits (px from the anchor), for a piece in SET_PIECE_LIGHTS (src/data/lights.ts). */
  readonly lightAt?: readonly [number, number];
  /** Where weather lightning strikes it (the Storm Tower's crown), px from the anchor. */
  readonly strikeAt?: readonly [number, number];
}

export const SET_PIECES: readonly SetPieceDef[] = [
  // Region 1.
  {
    id: 'fallen-colossus',
    name: 'Fallen Colossus',
    region: 'meadow',
    footprint: { tx: 153, ty: 107, w: 3, h: 2 },
    standsOn: 'tree',
    look: { w: 120, h: 80 },
    base: { x0: -46, x1: 46, y0: -30 },
    swayAt: [6, -46],
    halos: [{ x: -34, y: -30, color: 'cyan', radius: 12, breathe: true }],
  },
  {
    id: 'ley-tower',
    name: 'Ley Tower',
    region: 'meadow',
    footprint: { tx: 186, ty: 161, w: 2, h: 2 },
    standsOn: 'tree',
    look: { w: 70, h: 190 },
    base: { x0: -30, x1: 30, y0: -30 },
    halos: [{ x: 2, y: -168, color: 'cyan', radius: 30, breathe: true }],
    lightAt: [0, -48],
  },
  {
    id: 'watcher',
    name: 'The Watcher',
    region: 'meadow',
    footprint: { tx: 132, ty: 187, w: 2, h: 2 },
    standsOn: 'tree',
    look: { w: 64, h: 170 },
    base: { x0: -28, x1: 28, y0: -30 },
  },
  // Stonefall Hollows.
  {
    id: 'unfinished-giant',
    name: 'The Unfinished Giant',
    region: 'hollows',
    footprint: { tx: 174, ty: 72, w: 5, h: 2 },
    standsOn: 'cliff',
    look: { w: 200, h: 130 },
    base: { x0: -80, x1: 80, y0: -32 },
    loopMs: 220,
    halos: [{ x: -58, y: -62, color: 'vein', radius: 10, breathe: true }],
  },
  {
    id: 'aqueduct-head',
    name: 'Aqueduct Head',
    region: 'hollows',
    footprint: { tx: 154, ty: 226, w: 3, h: 2 },
    standsOn: 'cliff',
    look: { w: 110, h: 170 },
    base: { x0: -48, x1: 48, y0: -32 },
  },
  {
    id: 'great-crane',
    name: 'Great Crane',
    region: 'hollows',
    footprint: { tx: 109, ty: 185, w: 4, h: 2 },
    standsOn: 'cliff',
    look: { w: 120, h: 180 },
    base: { x0: -60, x1: 60, y0: -32 },
    loopMs: 260,
  },
  // The Emberworks.
  {
    id: 'great-furnace',
    name: 'Great Furnace',
    region: 'ember',
    footprint: { tx: 118, ty: 38, w: 4, h: 2 },
    standsOn: 'cliff',
    look: { w: 150, h: 220 },
    base: { x0: -62, x1: 62, y0: -32 },
    loopMs: 200,
    lightAt: [0, -22],
  },
  {
    id: 'great-crucible',
    name: 'Great Crucible',
    region: 'ember',
    footprint: { tx: 55, ty: 179, w: 3, h: 2 },
    standsOn: 'kiln',
    look: { w: 120, h: 110 },
    base: { x0: -48, x1: 48, y0: -30 },
    lightAt: [10, -30],
  },
  {
    id: 'toppled-stack',
    name: 'Toppled Stack',
    region: 'ember',
    footprint: { tx: 105, ty: 239, w: 3, h: 2 },
    standsOn: 'kiln',
    look: { w: 130, h: 70 },
    base: { x0: -50, x1: 50, y0: -30 },
  },
  // The Stormcrown.
  {
    id: 'storm-tower',
    name: 'Storm Tower',
    region: 'storm',
    footprint: { tx: 66, ty: 45, w: 2, h: 2 },
    standsOn: 'cairn',
    look: { w: 70, h: 220 },
    base: { x0: -30, x1: 30, y0: -30 },
    strikeAt: [0, -212],
  },
  {
    id: 'stormcaller',
    name: 'The Stormcaller',
    region: 'storm',
    footprint: { tx: 155, ty: 258, w: 3, h: 2 },
    standsOn: 'cliff',
    look: { w: 130, h: 200 },
    base: { x0: -48, x1: 48, y0: -32 },
    halos: [
      { x: -40, y: -150, color: 'cyan', radius: 12, breathe: true },
      { x: 40, y: -150, color: 'cyan', radius: 12, breathe: true },
      { x: 0, y: -96, color: 'storm-glow', radius: 16, breathe: true },
    ],
  },
  {
    id: 'wind-harp',
    name: 'Wind Harp',
    region: 'storm',
    footprint: { tx: 40, ty: 229, w: 3, h: 2 },
    standsOn: 'cairn',
    look: { w: 110, h: 150 },
    base: { x0: -48, x1: 48, y0: -30 },
    loopMs: 120,
  },
];

/** A set piece by id; throws for an unknown one. */
export function setPieceDef(id: string): SetPieceDef {
  const def = SET_PIECES.find((p) => p.id === id);
  if (!def) throw new Error(`Unknown set piece '${id}'`);
  return def;
}

/** A set piece's anchor in world px: the bottom centre of its footprint. */
export const setPieceAnchor = (p: SetPieceDef, tile: number): { x: number; y: number } => ({ x: (p.footprint.tx + p.footprint.w / 2) * tile, y: (p.footprint.ty + p.footprint.h) * tile });
