import { CONDUIT_TICKS, CRATE_CAP, HOPPER_TICKS, INPUT_CAP, OUTPUT_CAP, STAGER_TICKS } from '../data/foundry';
import { REFILL_PULSE_TICKS } from '../data/tube';
import { machineDef } from '../data/pieces';
import { recipeDef, type RecipeDef } from '../data/recipes';
import { count } from './inventory';
import type { SimEvents } from './events';
import { fillReservoir, type ReservoirState } from './link';
import {
  footprint,
  frontSide,
  frontTile,
  pieceAt,
  sideTile,
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
// A tube socket passes what it takes straight into the tube's reservoir.

/** What a tick's flow needs beyond the grid: the reservoir sockets fill, and where refills are recorded. */
interface FlowContext {
  grid: ReadonlyMap<string, PieceState>;
  reservoir: ReservoirState;
  refills: SimEvents['refills'];
}

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
  if (p.kind === 'stager' && p.item && p.progress < STAGER_TICKS) p.progress += 1;
  if (p.kind === 'hopper' && p.count > 0 && p.timer < HOPPER_TICKS) p.timer += 1;
  if (p.kind === 'machine') advanceMachine(p);
  if (p.kind === 'socket' && p.pulse > 0) p.pulse -= 1;
}

/**
 * Hands one item to the piece covering `to`, coming from the tile `from`. Pieces
 * other than crates never take items from their front side. Returns whether it was taken.
 */
function offer(ctx: FlowContext, to: Tile, from: Tile, item: string): boolean {
  const target = ctx.grid.get(key(to));
  if (!target) return false;
  // Crates and sockets have no output, so they take items from every side.
  const intakeAll = target.kind === 'crate' || target.kind === 'socket';
  if (!intakeAll && frontSide(target).some((t) => sameTile(t, from))) return false;
  if (target.kind === 'socket') {
    if (!fillReservoir(ctx.reservoir, item)) return false;
    target.pulse = REFILL_PULSE_TICKS;
    ctx.refills.push({ id: target.id, itemId: item });
    return true;
  }
  // A conduit takes items only from the side it's shaped to take them from (013).
  if (target.kind === 'conduit' && !sameTile(from, sideTile(target, target.inFrom))) return false;
  if (target.kind === 'conduit' || target.kind === 'stager') {
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

function transfer(ctx: FlowContext, p: PieceState): void {
  const to = frontTile(p);
  if (p.kind === 'conduit') {
    if (p.item && p.progress >= CONDUIT_TICKS && offer(ctx, to, p, p.item)) {
      p.item = null;
      p.progress = 0;
    }
  } else if (p.kind === 'stager') {
    if (p.item && p.progress >= STAGER_TICKS && offer(ctx, to, p, p.item)) {
      p.item = null;
      p.progress = 0;
    }
  } else if (p.kind === 'hopper') {
    if (p.item && p.timer >= HOPPER_TICKS) offerFromHopper(ctx, to, p, p.item);
  } else if (p.kind === 'machine') {
    if (p.output > 0 && offer(ctx, to, p, recipeOf(p).output.itemId)) p.output -= 1;
  }
}

/** Hoppers feed conduits, stagers and machines, never crates or sockets. */
function offerFromHopper(ctx: FlowContext, to: Tile, h: HopperState, item: string): void {
  const kind = ctx.grid.get(key(to))?.kind;
  if (kind !== 'conduit' && kind !== 'stager' && kind !== 'machine') return;
  if (!offer(ctx, to, h, item)) return;
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

/** Hands one item to the foundry piece on `to` from outside the grid (the supply port). Returns whether it was taken. */
export function offerFromOutside(
  foundry: FoundryState,
  reservoir: ReservoirState,
  refills: SimEvents['refills'],
  to: Tile,
  from: Tile,
  item: string,
): boolean {
  const target = pieceAt(foundry, to.tx, to.ty);
  if (!target) return false;
  const grid = new Map<string, PieceState>([[key(to), target]]);
  return offer({ grid, reservoir, refills }, to, from, item);
}

/**
 * Runs every piece one tick. The foundry ticks wherever the player is. Sockets
 * fill `reservoir`, and each round they take is pushed to `refills`.
 */
export function stepFoundry(
  foundry: FoundryState,
  reservoir: ReservoirState,
  refills: SimEvents['refills'],
): void {
  const grid = new Map<string, PieceState>();
  for (const p of foundry.pieces) for (const t of footprint(p.pieceId, p.tx, p.ty, p.facing)) grid.set(key(t), p);
  const ctx: FlowContext = { grid, reservoir, refills };
  for (const p of foundry.pieces) advance(p);
  for (const p of foundry.pieces) transfer(ctx, p);
  for (const p of foundry.pieces) if (p.kind === 'machine') setStatus(p);
}
