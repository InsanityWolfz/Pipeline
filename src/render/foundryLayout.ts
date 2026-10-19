import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { buildBarLabelTop, groupedBottomRow } from './bottomHud';
import { INTAKE } from '../data/foundry';
import { BUILD_BAR_LAYOUT, MENU_COLUMN_GAP, MENU_MAX_ROWS, PICKER_LAYOUT } from '../data/hudLayout';
import type { AnimDef } from '../data/assets';
import { CONDUIT_ANIMS, CONDUIT_CORNERS, LOGISTICS_ICONS, SORTER_ANIMS, type CornerKey } from '../data/foundryAssets';
import { itemDef, ITEMS } from '../data/items';
import { BUILD_BAR, PIECE_CATEGORIES, pieceDef, type PieceCategory } from '../data/pieces';
import { recipeDef } from '../data/recipes';
import { facingVector, opposite } from '../sim/direction';
import { footprint, sortSideOf, type Tile } from '../sim/pieces';
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

/** The pieces the bar shows (the unlocked ones), by group in bar order (026); a group with none shown is left out. */
function barGroups(shown: readonly string[]): { category: PieceCategory; label: string; pieces: string[] }[] {
  return PIECE_CATEGORIES.map((c) => ({
    category: c.id,
    label: c.label,
    pieces: BUILD_BAR.filter((id) => shown.includes(id) && pieceDef(id).category === c.id),
  })).filter((g) => g.pieces.length > 0);
}

function groupedCells(shown: readonly string[]): (ScreenRect & { pieceId: string })[][] {
  const L = BUILD_BAR_LAYOUT;
  const groups = barGroups(shown);
  const rows = groupedBottomRow(
    groups.map((g) => g.pieces.length),
    { w: L.cellWidth, h: L.cellHeight, step: L.cellStep },
    L.groupGap,
    L.bottom,
  );
  return groups.map((g, gi) =>
    g.pieces.flatMap((pieceId, i) => {
      const box = rows[gi]?.[i];
      return box ? [{ pieceId, ...box }] : [];
    }),
  );
}

/**
 * One cell per piece in `shown` (the unlocked pieces: locked ones are hidden), in bar
 * order and in their groups (026), centred along the bottom of the screen.
 */
export function buildBarCells(shown: readonly string[]): (ScreenRect & { pieceId: string })[] {
  return groupedCells(shown).flat();
}

/** Each shown group's label row (026): over its cells, `label.gap` px above them. */
export function buildBarGroups(shown: readonly string[]): (ScreenRect & { category: PieceCategory; label: string })[] {
  const L = BUILD_BAR_LAYOUT;
  const cells = groupedCells(shown);
  return barGroups(shown).flatMap((g, i) => {
    const mine = cells[i] ?? [];
    const first = mine[0];
    const last = mine[mine.length - 1];
    if (!first || !last) return [];
    return [{ category: g.category, label: g.label, x: first.x, y: buildBarLabelTop(), w: last.x + last.w - first.x, h: L.label.h }];
  });
}

/** The thin dividers between build bar groups (026): centred in each gap, from the label row's top to `divider.inset` px above the cells' bottom. */
export function buildBarDividers(shown: readonly string[]): { x: number; y: number; h: number }[] {
  const L = BUILD_BAR_LAYOUT;
  const groups = buildBarGroups(shown);
  const top = buildBarLabelTop();
  const bottom = VIEW_HEIGHT - L.bottom - L.divider.inset;
  return groups.slice(1).flatMap((right, i) => {
    const left = groups[i];
    return left ? [{ x: (left.x + left.w + right.x) / 2, y: top, h: bottom - top }] : [];
  });
}

/** The whole build bar with its labels, so a click anywhere on it is the bar's, not a place in the world. */
export function buildBarBox(shown: readonly string[]): ScreenRect {
  const groups = buildBarGroups(shown);
  const first = groups[0];
  const last = groups[groups.length - 1];
  if (!first || !last) return { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT, w: 0, h: 0 };
  const y = buildBarLabelTop();
  return { x: first.x, y, w: last.x + last.w - first.x, h: VIEW_HEIGHT - BUILD_BAR_LAYOUT.bottom - y };
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

/**
 * A menu of `n` rows styled like the hopper picker (009's pylon and stash menus):
 * a centred column, wrapping into side-by-side columns once it would pass
 * MENU_MAX_ROWS, so a long stash stays on screen.
 */
export function menuRows(n: number): ScreenRect[] {
  const L = PICKER_LAYOUT;
  const perColumn = Math.min(n, MENU_MAX_ROWS);
  const columns = Math.max(1, Math.ceil(n / MENU_MAX_ROWS));
  const step = L.rowHeight + L.rowGap;
  const top = Math.round((VIEW_HEIGHT - perColumn * step) / 2);
  const width = columns * L.rowWidth + (columns - 1) * MENU_COLUMN_GAP;
  const left = Math.round((VIEW_WIDTH - width) / 2);
  return Array.from({ length: n }, (_, i) => ({
    x: left + Math.floor(i / perColumn) * (L.rowWidth + MENU_COLUMN_GAP),
    y: top + (i % perColumn) * step,
    w: L.rowWidth,
    h: L.rowHeight,
  }));
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

const SIDES: readonly Facing[] = ['up', 'right', 'down', 'left'];

/** A facing arrow: on tile (tx, ty), at its `edge`, pointing `points`. */
export interface ArrowSpot extends Tile {
  /** `sort` is a sorter's side exit (015), drawn as an output arrow in gold. */
  kind: 'in' | 'out' | 'sort';
  edge: Facing;
  points: Facing;
}

/**
 * Where a piece's build-mode arrows go. Its front edge gets one output arrow
 * pointing out (machines and hoppers). Every outer edge that takes items gets an
 * input arrow pointing in: machines on all but their front side, crates on every
 * side. Conduits show their flow instead, so they get none. The intake's arrows are IntakeView's.
 */
export function arrowSpots(p: { pieceId: string; tx: number; ty: number; facing: Facing; inFrom?: Facing; mirrored?: boolean }): ArrowSpot[] {
  const { kind } = pieceDef(p.pieceId);
  // A sorter takes from its back and hands out of its front and, for its item, its sort side.
  if (kind === 'sorter') {
    const back = opposite(p.facing);
    const side = sortSideOf(p.facing, p.mirrored ?? false);
    return [
      { kind: 'in', tx: p.tx, ty: p.ty, edge: back, points: p.facing },
      { kind: 'out', tx: p.tx, ty: p.ty, edge: p.facing, points: p.facing },
      { kind: 'sort', tx: p.tx, ty: p.ty, edge: side, points: side },
    ];
  }
  // A splitter (033) takes from its back and hands out of its front and its side in turn.
  if (kind === 'splitter') {
    const side = sortSideOf(p.facing, p.mirrored ?? false);
    return [
      { kind: 'in', tx: p.tx, ty: p.ty, edge: opposite(p.facing), points: p.facing },
      { kind: 'out', tx: p.tx, ty: p.ty, edge: p.facing, points: p.facing },
      { kind: 'out', tx: p.tx, ty: p.ty, edge: side, points: side },
    ];
  }
  // A conduit shows its flow; since 013 it also marks the one side it takes items from.
  if (kind === 'conduit') {
    const edge = p.inFrom ?? opposite(p.facing);
    return [{ kind: 'in', tx: p.tx, ty: p.ty, edge, points: opposite(edge) }];
  }
  const spots: ArrowSpot[] = [];
  const hasOutput = kind !== 'crate';
  if (hasOutput) spots.push({ kind: 'out', tx: p.tx, ty: p.ty, edge: p.facing, points: p.facing });
  if (kind === 'hopper') return spots;
  const tiles = footprint(p.pieceId, p.tx, p.ty, p.facing);
  const covered = (tx: number, ty: number): boolean => tiles.some((t) => t.tx === tx && t.ty === ty);
  for (const t of tiles) {
    for (const edge of SIDES) {
      const [dx, dy] = facingVector(edge);
      if (covered(t.tx + dx, t.ty + dy) || (hasOutput && edge === p.facing)) continue;
      spots.push({ kind: 'in', tx: t.tx, ty: t.ty, edge, points: opposite(edge) });
    }
  }
  return spots;
}

/** A conduit's animation (013): a straight run by its facing (flipped for left), or the corner for its in and out sides. */
export function conduitLook(facing: Facing, inFrom: Facing): { anim: AnimDef; flip: boolean } {
  if (inFrom === opposite(facing)) {
    const view = facing === 'up' || facing === 'down' ? facing : 'side';
    return { anim: CONDUIT_ANIMS[view], flip: facing === 'left' };
  }
  const key = `${inFrom}-${facing}`;
  if (!isCorner(key)) throw new Error(`No conduit corner from ${inFrom} to ${facing}`);
  return { anim: CONDUIT_CORNERS[key], flip: false };
}

const isCorner = (key: string): key is CornerKey => key in CONDUIT_CORNERS;

/**
 * A sorter's animation and flips (015). The side sprite flows right and sorts
 * down, so facing left turns it round; the down and up sprites flip across their
 * flow to sort the other way.
 */
export function sorterLook(facing: Facing, mirrored: boolean): { anim: AnimDef; flipX: boolean; flipY: boolean } {
  if (facing === 'right') return { anim: SORTER_ANIMS.side, flipX: false, flipY: mirrored };
  if (facing === 'left') return { anim: SORTER_ANIMS.side, flipX: true, flipY: !mirrored };
  return { anim: SORTER_ANIMS[facing], flipX: mirrored, flipY: false };
}

/** Breaks `text` into lines of at most `width` glyphs, at spaces. */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The foundry intake's anchor (019): the middle of its mouth's bottom edge, where the north wall meets the floor, px. */
export function intakeAnchor(): { x: number; y: number } {
  const middle = INTAKE.entrances[1];
  if (!middle) throw new Error('The intake needs three entrances');
  return { x: (middle.tx + 0.5) * TILE_SIZE, y: (middle.ty + 1) * TILE_SIZE };
}
