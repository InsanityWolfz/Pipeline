import { CONDUIT_TICKS, CRATE_CAP, ENTRANCE_CAPS, HOPPER_FLOW_CAP, HOPPER_TICKS, INPUT_CAP, INTAKE, OUTPUT_CAP } from '../data/foundry';
import type { RecipeDef } from '../data/recipes';
import { opposite } from './direction';
import { count } from './inventory';
import type { SimEvents } from './events';
import { fillEntrance, type EntranceState } from './link';
import { machineRecipe, offerToStage, stageOf } from './stages';
import { craftTicksAt } from './research';
import { afterSplit, mergerTakes, splitterOrder } from './splitMerge';
import {
  footprint,
  frontSide,
  mergerInputs,
  frontTile,
  pieceAt,
  sideTile,
  sameTile,
  sorterExit,
  type FoundryState,
  type HopperState,
  type MachineState,
  type PieceState,
  type Tile,
} from './pieces';

// Items moving through the foundry, one tick at a time. Hoppers take items from
// lines too (028), up to HOPPER_FLOW_CAP. Every piece hands items
// out of its front, except a sorter's chosen item, which leaves by its side.
// First everything advances (items cross conduits, crafts finish and start,
// hoppers count down), then items move in piece order. An item that arrives
// this tick starts from zero, so nothing moves two hops in one tick.
// The foundry intake (019) passes what each mouth tile takes straight into its
// entrance's reservoir (024): each from the tile directly south of it, once attuned.

/** Where a tick's flow records what happened: rounds into the intake, and machines' finished crafts (027). */
type FlowEvents = Pick<SimEvents, 'refills' | 'made'>;

/** What restoring has changed (033): every entrance's cap, and the multiplier on every machine's craft time. */
export interface FlowTuning {
  cap: number;
  speed: number;
}

/** Before anything is restored. */
export const BASE_TUNING: FlowTuning = { cap: ENTRANCE_CAPS[0] ?? 0, speed: 1 };

/** What a tick's flow needs beyond the grid: the entrances the intake fills (once `attuned`) up to `cap`, and where refills are recorded. */
interface FlowContext {
  grid: ReadonlyMap<string, PieceState>;
  entrances: EntranceState[];
  refills: SimEvents['refills'];
  attuned: boolean;
  cap: number;
}

/** The intake's entrance at `t`, by index, if it is one. */
const entranceAt = (t: Tile): number => INTAKE.entrances.findIndex((m) => m.tx === t.tx && m.ty === t.ty);

/** True if the machine has every input of its recipe buffered. */
function hasInputs(m: MachineState, recipe: RecipeDef): boolean {
  return Object.entries(recipe.inputs).every(([itemId, n]) => count(m.buffer, itemId) >= n);
}

/** A craft only starts when its whole output will fit. (A stage's output is always its recipe's kind: it takes a new round kind only once clear.) */
const outputFits = (m: MachineState, recipe: RecipeDef): boolean => m.output + recipe.output.count <= OUTPUT_CAP;

function advanceMachine(m: MachineState, made: SimEvents['made'], speed: number): void {
  const recipe = machineRecipe(m);
  if (m.crafting) {
    m.progress += 1;
    if (m.progress >= craftTicksAt(m.pieceId, speed)) {
      m.crafting = false;
      m.progress = 0;
      m.output += recipe.output.count;
      made.push({ id: m.id, pieceId: m.pieceId, itemId: recipe.output.itemId, count: recipe.output.count });
    }
  }
  if (m.crafting || !hasInputs(m, recipe) || !outputFits(m, recipe)) return;
  for (const [itemId, n] of Object.entries(recipe.inputs)) m.buffer[itemId] = count(m.buffer, itemId) - n;
  m.crafting = true;
  m.progress = 0;
}

function advance(p: PieceState, made: SimEvents['made'], speed: number): void {
  // Conduits, sorters, splitters and mergers carry one item across a tile.
  if ((p.kind === 'conduit' || p.kind === 'sorter' || p.kind === 'splitter' || p.kind === 'merger') && p.item && p.progress < CONDUIT_TICKS) p.progress += 1;
  if (p.kind === 'hopper' && p.count > 0 && p.timer < HOPPER_TICKS) p.timer += 1;
  if (p.kind === 'machine') advanceMachine(p, made, speed);
}

/**
 * Hands one item to the piece covering `to`, coming from the tile `from`. Pieces
 * other than crates never take items from their front side. Returns whether it was taken.
 */
function offer(ctx: FlowContext, to: Tile, from: Tile, item: string): boolean {
  const entrance = entranceAt(to);
  if (entrance >= 0) {
    // A mouth tile takes only from the floor tile directly south of it, and nothing before the tube attunes.
    const e = ctx.entrances[entrance];
    if (!e || !ctx.attuned || from.tx !== to.tx || from.ty !== to.ty + 1) return false;
    if (!fillEntrance(e, item, ctx.cap)) return false;
    ctx.refills.push({ entrance, itemId: item });
    return true;
  }
  const target = ctx.grid.get(key(to));
  if (!target) return false;
  // Crates have no output, so they take items from every side.
  if (target.kind !== 'crate' && frontSide(target).some((t) => sameTile(t, from))) return false;
  // A conduit takes items only from the side it's shaped to take them from (013); a sorter only from its back (015).
  if (target.kind === 'conduit' && !sameTile(from, sideTile(target, target.inFrom))) return false;
  if ((target.kind === 'sorter' || target.kind === 'splitter') && !sameTile(from, sideTile(target, opposite(target.facing)))) return false;
  if (target.kind === 'merger') {
    const input = mergerTakes(target, from, (t) => ctx.grid.get(key(t)));
    if (input < 0) return false;
    target.item = item;
    target.progress = 0;
    target.turn = (input + 1) % mergerInputs(target.facing).length;
    return true;
  }
  if (target.kind === 'conduit' || target.kind === 'sorter' || target.kind === 'splitter') {
    if (target.item) return false;
    target.item = item;
    target.progress = 0;
    return true;
  }
  if (target.kind === 'machine') {
    const st = stageOf(target.pieceId);
    if (st) return offerToStage(target, st, item);
    const need = machineRecipe(target).inputs[item];
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
  // A hopper (028) takes from a line while it's empty or holds that item, up to the line cap.
  if (target.item !== null && target.item !== item) return false;
  if (target.count >= HOPPER_FLOW_CAP) return false;
  // An empty hopper waits a whole push before handing the item on, so nothing moves two hops in a tick.
  if (target.count === 0) target.timer = 0;
  target.item = item;
  target.count += 1;
  return true;
}

function transfer(ctx: FlowContext, p: PieceState): void {
  const to = frontTile(p);
  if (p.kind === 'conduit') {
    if (p.item && p.progress >= CONDUIT_TICKS && offer(ctx, to, p, p.item)) {
      p.item = null;
      p.progress = 0;
    }
  } else if (p.kind === 'sorter') {
    // A refused item waits, so a blocked exit stalls the sorter and the line behind it.
    if (p.item && p.progress >= CONDUIT_TICKS && offer(ctx, sorterExit(p, p.item), p, p.item)) {
      p.item = null;
      p.progress = 0;
    }
  } else if (p.kind === 'splitter') {
    // Out the output whose turn it is, else the other; with both refusing it waits holding the item.
    if (!p.item || p.progress < CONDUIT_TICKS) return;
    const item = p.item;
    const used = splitterOrder(p).find((out) => offer(ctx, sideTile(p, out), p, item));
    if (used === undefined) return;
    p.item = null;
    p.progress = 0;
    afterSplit(p, used);
  } else if (p.kind === 'merger') {
    if (p.item && p.progress >= CONDUIT_TICKS && offer(ctx, to, p, p.item)) {
      p.item = null;
      p.progress = 0;
    }
  } else if (p.kind === 'hopper') {
    if (p.item && p.timer >= HOPPER_TICKS) offerFromHopper(ctx, to, p, p.item);
  } else if (p.kind === 'machine') {
    if (p.output > 0 && offer(ctx, to, p, p.made)) p.output -= 1;
  }
}

/** Hoppers feed conduits, sorters, splitters, mergers and machines, never crates, hoppers or the intake. */
function offerFromHopper(ctx: FlowContext, to: Tile, h: HopperState, item: string): void {
  const kind = ctx.grid.get(key(to))?.kind;
  if (kind === undefined || kind === 'crate' || kind === 'hopper') return;
  if (!offer(ctx, to, h, item)) return;
  h.count -= 1;
  h.timer = 0;
  if (h.count === 0) h.item = null;
}

function setStatus(m: MachineState): void {
  const recipe = machineRecipe(m);
  const missing = Object.entries(recipe.inputs)
    .filter(([itemId, n]) => count(m.buffer, itemId) < n)
    .map(([itemId]) => itemId);
  const buffered = Object.values(m.buffer).some((n) => n > 0);
  m.status = m.crafting ? 'working' : !outputFits(m, recipe) ? 'blocked' : buffered ? 'starved' : 'idle';
  m.missing = m.status === 'starved' ? missing : [];
}

const key = (t: Tile): string => `${t.tx},${t.ty}`;

/** Hands one item to the foundry piece on `to` from outside the grid (a supply port). Returns whether it was taken. */
export function offerFromOutside(foundry: FoundryState, to: Tile, from: Tile, item: string): boolean {
  const target = pieceAt(foundry, to.tx, to.ty);
  if (!target) return false;
  const grid = new Map<string, PieceState>([[key(to), target]]);
  return offer({ grid, entrances: [], refills: [], attuned: false, cap: BASE_TUNING.cap }, to, from, item);
}

/**
 * Runs every piece one tick. The foundry ticks wherever the player is. Once the
 * tube is `attuned`, the intake fills its open `entrances` up to the tuning's cap, and each round it takes is pushed
 * to `events.refills`; each craft a machine finishes (in its craft time × the tuning's speed, 033) is pushed to `events.made`.
 */
export function stepFoundry(foundry: FoundryState, entrances: EntranceState[], events: FlowEvents, attuned: boolean, tuning: FlowTuning = BASE_TUNING): void {
  const grid = new Map<string, PieceState>();
  for (const p of foundry.pieces) for (const t of footprint(p.pieceId, p.tx, p.ty, p.facing)) grid.set(key(t), p);
  const ctx: FlowContext = { grid, entrances, refills: events.refills, attuned, cap: tuning.cap };
  for (const p of foundry.pieces) advance(p, events.made, tuning.speed);
  for (const p of foundry.pieces) transfer(ctx, p);
  for (const p of foundry.pieces) if (p.kind === 'machine') setStatus(p);
}
