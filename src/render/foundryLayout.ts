import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { BUILD_BAR_LAYOUT, PICKER_LAYOUT } from '../data/hudLayout';
import { LOGISTICS_ICONS } from '../data/foundryAssets';
import { itemDef, ITEMS } from '../data/items';
import { pieceDef } from '../data/pieces';
import { recipeDef } from '../data/recipes';
import { facingVector } from '../sim/direction';
import { footprint, type Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';

// Where the build bar's cells and the hopper picker's rows sit on screen. No
// Phaser, so e2e tests can find them to click.

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const inRect = (r: ScreenRect, x: number, y: number): boolean =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** One cell per piece in `pieces`, centred along the bottom of the screen. */
export function buildBarCells(pieces: readonly string[]): (ScreenRect & { pieceId: string })[] {
  const L = BUILD_BAR_LAYOUT;
  const width = pieces.length * L.cellStep - (L.cellStep - L.cellWidth);
  const left = Math.round((VIEW_WIDTH - width) / 2);
  const y = VIEW_HEIGHT - L.bottom - L.cellHeight;
  return pieces.map((pieceId, i) => ({ pieceId, x: left + i * L.cellStep, y, w: L.cellWidth, h: L.cellHeight }));
}

/** A hopper menu row: take everything in the hopper out, or put all of a held item in. */
export interface PickerEntry {
  action: 'take' | 'put';
  itemId: string;
}

/**
 * The hopper menu's rows. A filled hopper offers to take its contents out, and to
 * put in more of the same if any is held. An empty hopper offers every held item.
 */
export function pickerEntries(
  hopper: { item: string | null; count: number },
  inventory: Readonly<Record<string, number>>,
): PickerEntry[] {
  if (hopper.item && hopper.count > 0) {
    const take: PickerEntry = { action: 'take', itemId: hopper.item };
    return (inventory[hopper.item] ?? 0) > 0 ? [take, { action: 'put', itemId: hopper.item }] : [take];
  }
  return heldItems(inventory).map((itemId) => ({ action: 'put', itemId }));
}

/** One row per entry, a centred column. */
export function pickerRows(entries: readonly PickerEntry[]): (ScreenRect & PickerEntry)[] {
  const L = PICKER_LAYOUT;
  const step = L.rowHeight + L.rowGap;
  const top = Math.round((VIEW_HEIGHT - entries.length * step) / 2);
  const x = Math.round((VIEW_WIDTH - L.rowWidth) / 2);
  return entries.map((e, i) => ({ ...e, x, y: top + i * step, w: L.rowWidth, h: L.rowHeight }));
}

/** The items the player holds, in ITEMS order: what the hopper picker lists. */
export function heldItems(inventory: Readonly<Record<string, number>>): string[] {
  return Object.keys(ITEMS).filter((id) => (inventory[id] ?? 0) > 0);
}

/** A piece's icon: what a machine makes, or a logistics piece's own icon. */
export function pieceIcon(pieceId: string): string {
  const def = pieceDef(pieceId);
  if (def.kind === 'machine') return itemDef(recipeDef(def.recipeId).output.itemId).icon;
  const icon = LOGISTICS_ICONS[pieceId];
  if (!icon) throw new Error(`No icon for piece '${pieceId}'`);
  return icon;
}

const OPPOSITE: Readonly<Record<Facing, Facing>> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const SIDES: readonly Facing[] = ['up', 'right', 'down', 'left'];

/** A facing arrow: on tile (tx, ty), at its `edge`, pointing `points`. */
export interface ArrowSpot extends Tile {
  kind: 'in' | 'out';
  edge: Facing;
  points: Facing;
}

/**
 * Where a piece's build-mode arrows go. Its front edge gets one output arrow
 * pointing out (machines, hoppers and stagers). Every outer edge that takes items gets an
 * input arrow pointing in: machines and stagers on all but their front side, crates and tube
 * sockets on every side. Conduits show their flow instead, so they get none.
 */
export function arrowSpots(p: { pieceId: string; tx: number; ty: number; facing: Facing }): ArrowSpot[] {
  const { kind } = pieceDef(p.pieceId);
  if (kind === 'conduit') return [];
  const spots: ArrowSpot[] = [];
  const hasOutput = kind !== 'crate' && kind !== 'socket';
  if (hasOutput) spots.push({ kind: 'out', tx: p.tx, ty: p.ty, edge: p.facing, points: p.facing });
  if (kind === 'hopper') return spots;
  const tiles = footprint(p.pieceId, p.tx, p.ty, p.facing);
  const covered = (tx: number, ty: number): boolean => tiles.some((t) => t.tx === tx && t.ty === ty);
  for (const t of tiles) {
    for (const edge of SIDES) {
      const [dx, dy] = facingVector(edge);
      if (covered(t.tx + dx, t.ty + dy) || (hasOutput && edge === p.facing)) continue;
      spots.push({ kind: 'in', tx: t.tx, ty: t.ty, edge, points: OPPOSITE[edge] });
    }
  }
  return spots;
}
