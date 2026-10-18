import { CONDUIT_TICKS, CRATE_CAP, HOPPER_TICKS, INPUT_CAP, OUTPUT_CAP } from '../data/foundry';
import { machineDef } from '../data/pieces';
import { recipeDef, type RecipeDef } from '../data/recipes';
import { count } from './inventory';
import {
  footprint,
  frontSide,
  frontTile,
  sameTile,
  type FoundryState,
  type HopperState,
  type MachineState,
  type PieceState,
  type Tile,
} from './pieces';

// Items moving through the foundry, one tick at a time. Every piece hands items
// out of its front. First everything advances (items cross conduits, crafts
// finish and start, hoppers count down), then items move in piece order. An
// item that arrives this tick starts from zero, so nothing moves two hops in one tick.

const recipeOf = (m: MachineState): RecipeDef => recipeDef(machineDef(m.pieceId).recipeId);

/** True if the machine has every input of its recipe buffered. */
function hasInputs(m: MachineState, recipe: RecipeDef): boolean {
  return Object.entries(recipe.inputs).every(([itemId, n]) => count(m.buffer, itemId) >= n);
}

/** A craft only starts when its whole output will fit. */
const outputFits = (m: MachineState, recipe: RecipeDef): boolean => m.output + recipe.output.count <= OUTPUT_CAP;

function advanceMachine(m: MachineState): void {
  const recipe = recipeOf(m);
  if (m.crafting) {
    m.progress += 1;
    if (m.progress >= machineDef(m.pieceId).craftTicks) {
      m.crafting = false;
      m.progress = 0;
      m.output += recipe.output.count;
    }
  }
  if (m.crafting || !hasInputs(m, recipe) || !outputFits(m, recipe)) return;
  for (const [itemId, n] of Object.entries(recipe.inputs)) m.buffer[itemId] = count(m.buffer, itemId) - n;
  m.crafting = true;
  m.progress = 0;
}

function advance(p: PieceState): void {
  if (p.kind === 'conduit' && p.item && p.progress < CONDUIT_TICKS) p.progress += 1;
  if (p.kind === 'hopper' && p.count > 0 && p.timer < HOPPER_TICKS) p.timer += 1;
  if (p.kind === 'machine') advanceMachine(p);
}

/**
 * Hands one item to the piece covering `to`, coming from the tile `from`. Pieces
 * never take items from their front side. Returns whether it was taken.
 */
function offer(grid: ReadonlyMap<string, PieceState>, to: Tile, from: Tile, item: string): boolean {
  const target = grid.get(key(to));
  if (!target || frontSide(target).some((t) => sameTile(t, from))) return false;
  if (target.kind === 'conduit') {
    if (target.item) return false;
    target.item = item;
    target.progress = 0;
    return true;
  }
  if (target.kind === 'machine') {
    const need = recipeOf(target).inputs[item];
    if (need === undefined || count(target.buffer, item) >= INPUT_CAP) return false;
    target.buffer[item] = count(target.buffer, item) + 1;
    return true;
  }
  if (target.kind === 'crate') {
    const total = Object.values(target.contents).reduce((a, b) => a + b, 0);
    if (total >= CRATE_CAP) return false;
    target.contents[item] = count(target.contents, item) + 1;
    return true;
  }
  return false;
}

function transfer(grid: ReadonlyMap<string, PieceState>, p: PieceState): void {
  const to = frontTile(p);
  if (p.kind === 'conduit') {
    if (p.item && p.progress >= CONDUIT_TICKS && offer(grid, to, p, p.item)) {
      p.item = null;
      p.progress = 0;
    }
  } else if (p.kind === 'hopper') {
    if (p.item && p.timer >= HOPPER_TICKS) offerFromHopper(grid, to, p, p.item);
  } else if (p.kind === 'machine') {
    if (p.output > 0 && offer(grid, to, p, recipeOf(p).output.itemId)) p.output -= 1;
  }
}

/** Hoppers feed conduits and machines, never crates. */
function offerFromHopper(grid: ReadonlyMap<string, PieceState>, to: Tile, h: HopperState, item: string): void {
  const target = grid.get(key(to));
  if (target?.kind !== 'conduit' && target?.kind !== 'machine') return;
  if (!offer(grid, to, h, item)) return;
  h.count -= 1;
  h.timer = 0;
  if (h.count === 0) h.item = null;
}

function setStatus(m: MachineState): void {
  const recipe = recipeOf(m);
  const missing = Object.entries(recipe.inputs)
    .filter(([itemId, n]) => count(m.buffer, itemId) < n)
    .map(([itemId]) => itemId);
  const buffered = Object.values(m.buffer).some((n) => n > 0);
  m.status = m.crafting ? 'working' : !outputFits(m, recipe) ? 'blocked' : buffered ? 'starved' : 'idle';
  m.missing = m.status === 'starved' ? missing : [];
}

const key = (t: Tile): string => `${t.tx},${t.ty}`;

/** Runs every piece one tick. The foundry ticks wherever the player is. */
export function stepFoundry(foundry: FoundryState): void {
  const grid = new Map<string, PieceState>();
  for (const p of foundry.pieces) for (const t of footprint(p.pieceId, p.tx, p.ty, p.facing)) grid.set(key(t), p);
  for (const p of foundry.pieces) advance(p);
  for (const p of foundry.pieces) transfer(grid, p);
  for (const p of foundry.pieces) if (p.kind === 'machine') setStatus(p);
}
