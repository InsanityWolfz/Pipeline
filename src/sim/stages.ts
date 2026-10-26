import { machineDef, machineRecipeIds, pieceDef } from '../data/pieces';
import { recipeDef, type RecipeDef } from '../data/recipes';
import { SHRINE_SITE } from '../data/rooms';
import { stageDef, stageRecipeFor, stageRow, STAGE_ROWS, STAGES, type StageDef, type StageRow } from '../data/stages';
import { withoutTag, withTag } from '../data/tags';
import { INPUT_CAP } from '../data/foundry';
import { make } from './make';
import { count } from './inventory';
import { ammoOfItem, takeFromEntrance } from './link';
import type { MachineState } from './pieces';
import type { SimState } from './state';
import { knownRecipe } from './tutorial';

// Stage machines (029): rules for a machine whose piece is a stage, and hand-applying a
// stage at the bench. A stage takes a round of its base that has no tag in its slot,
// and its material, from any side but its front; it works on one round kind at a time,
// held in `made` as the tagged round it makes, until its rounds, craft and output are clear.

/** The stage a machine piece is, or null for an ordinary machine. */
export function stageOf(pieceId: string): StageDef | null {
  const def = pieceDef(pieceId);
  return def.kind === 'machine' && def.stage !== undefined ? stageDef(def.stage) : null;
}


/** Every recipe an ordinary machine runs (062: its own, then its tier variants), in turn order. */
export const machineRecipes = (pieceId: string): RecipeDef[] => machineRecipeIds(machineDef(pieceId)).map(recipeDef);

/**
 * The recipe a machine runs now (or last ran): for an ordinary machine the one of its recipes (062: its own or a tier
 * variant) that makes what it's making, for a stage the one on the round it's working on.
 */
export function machineRecipe(m: Pick<MachineState, 'pieceId' | 'made'>): RecipeDef {
  const st = stageOf(m.pieceId);
  if (!st) {
    const all = machineRecipes(m.pieceId);
    return all.find((r) => r.output.itemId === m.made) ?? recipeDef(machineDef(m.pieceId).recipeId);
  }
  const r = stageRecipeFor(st, withoutTag(m.made, st.tag));
  if (!r) throw new Error(`Stage '${st.id}' can't make '${m.made}'`);
  return r;
}

/**
 * Sets a just-placed stage machine's round: a stamped blueprint's saved round (063) and the pipette's copy (069). Only a
 * tagged round this stage makes; any other round, or a machine that isn't a stage, is left as it is.
 */
export function setStageRound(m: MachineState, round: string): void {
  const st = stageOf(m.pieceId);
  if (st && round.length > 0 && stageRecipeFor(st, withoutTag(round, st.tag))?.output.itemId === round) m.made = round;
}

/** True if a stage holds no rounds, isn't crafting and has nothing waiting to go out: it may take another round kind. */
function clear(m: MachineState, st: StageDef): boolean {
  return count(m.buffer, withoutTag(m.made, st.tag)) === 0 && !m.crafting && m.output === 0;
}

/** Hands one item to a stage machine (from a side that isn't its front). Returns whether it was taken. */
export function offerToStage(m: MachineState, st: StageDef, item: string): boolean {
  if (item !== st.material) {
    // A round of its base ammo with no tag in the stage's slot: withTag refuses anything else.
    const made = withTag(item, st.tag);
    if (made === null) return false;
    if (made !== m.made) {
      if (!clear(m, st)) return false;
      m.made = made;
    }
  }
  if (count(m.buffer, item) >= INPUT_CAP) return false;
  m.buffer[item] = count(m.buffer, item) + 1;
  return true;
}

/** Tagged rounds can be crafted (029, 047: in the crafting menu, anywhere) once the shrine is claimed. */
export const stagesKnown = (state: { claims: readonly string[] }): boolean => state.claims.includes(SHRINE_SITE);

/** The parts of the sim a tagged round's held count reads: the inventory (carried rounds) and the intake's entrances (their reservoirs). */
export type TaggedStores = Pick<SimState, 'inventory'> & { link: Pick<SimState['link'], 'entrances'> };

/**
 * How many of an item count as held for a tagged round's recipe (029 option A): carried, plus the rounds in the
 * intake's entrances. The crafting menu's counts and dimming read this.
 */
export function taggedHeld(state: TaggedStores, itemId: string): number {
  const ammoId = ammoOfItem(itemId);
  const inEntrances = ammoId === null ? 0 : state.link.entrances.reduce((n, e) => n + (e.ammoId === ammoId ? e.count : 0), 0);
  return count(state.inventory, itemId) + inEntrances;
}

/** Moves up to `n` of an item from the intake's entrances, in intake order, into the inventory (carried rounds are spent first). */
function pullFromEntrances(state: SimState, itemId: string, n: number): void {
  const ammoId = ammoOfItem(itemId);
  if (ammoId === null) return;
  // Clamped: an input already carried in full has a shortfall of 0 or less, and takes nothing.
  let left = Math.max(0, n);
  for (const e of state.link.entrances) {
    while (left > 0 && e.ammoId === ammoId && takeFromEntrance(e)) {
      state.inventory[itemId] = count(state.inventory, itemId) + 1;
      left -= 1;
    }
  }
}

/**
 * A tagged round's recipe shows once the shrine is claimed and its family's own ammo can be made (landmines after
 * ley-iron is found, 038.3), and its stage's own reveal has been carried (060: the fire rune's rows after cinderite).
 */
export function taggedKnown(state: { found: readonly string[]; claims: readonly string[] }, row: StageRow): boolean {
  const reveal = stageDef(row.stage).shownAfter;
  return stagesKnown(state) && knownRecipe(state, row.base) && (reveal === undefined || state.found.includes(reveal));
}

/** Whether a tagged round's inputs are held, carried or in the intake's entrances (029 option A). */
export function taggedAffordable(state: TaggedStores, rowId: string): boolean {
  const row = stageRow(rowId);
  return row !== undefined && Object.entries(row.recipe.inputs).every(([itemId, n]) => taggedHeld(state, itemId) >= n);
}

/**
 * Crafts a tagged round (047; 029's hand-apply, now in the crafting menu): takes its inputs, carried first and then
 * from the intake's entrances, and gives the tagged rounds, so the round counts as hand-made and its stage machine
 * unlocks. The caller (crafting.ts) has checked it's known and affordable.
 */
export function craftTagged(state: SimState, rowId: string): void {
  const row = stageRow(rowId);
  if (!row) throw new Error(`Unknown tagged round recipe '${rowId}'`);
  for (const [itemId, need] of Object.entries(row.recipe.inputs)) pullFromEntrances(state, itemId, need - count(state.inventory, itemId));
  make(state, row.recipe);
}

/** Stage ids the player can build (any of their tagged rounds has been hand-made: 039, hand-applied once to any round), in stage order. */
export function stagesUnlocked(state: Pick<SimState, 'crafted'>): string[] {
  return Object.values(STAGES)
    .filter((st) => STAGE_ROWS.some((r) => r.stage === st.id && state.crafted.includes(r.recipe.output.itemId)))
    .map((st) => st.id);
}
