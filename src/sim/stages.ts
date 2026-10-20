import { machineDef, pieceDef } from '../data/pieces';
import { recipeDef, type RecipeDef } from '../data/recipes';
import { SHRINE_SITE } from '../data/rooms';
import { stageDef, stageRecipeFor, stageRow, STAGE_ROWS, STAGES, type StageDef, type StageRow } from '../data/stages';
import { withoutTag, withTag } from '../data/tags';
import { INPUT_CAP } from '../data/foundry';
import { fixtureInReach, isClaimed } from './claims';
import { make } from './crafting';
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


/** The recipe a machine runs: its own, or for a stage the one on the round it's working on. */
export function machineRecipe(m: Pick<MachineState, 'pieceId' | 'made'>): RecipeDef {
  const st = stageOf(m.pieceId);
  if (!st) return recipeDef(machineDef(m.pieceId).recipeId);
  const r = stageRecipeFor(st, withoutTag(m.made, st.tag));
  if (!r) throw new Error(`Stage '${st.id}' can't make '${m.made}'`);
  return r;
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

/** The bench shows its Stages rows, and stages can be hand-applied, once the shrine is claimed. */
export const stagesKnown = (state: Pick<SimState, 'claims'>): boolean => isClaimed(state, SHRINE_SITE);

/**
 * Hand-applies a stage at the bench (029): with the shrine claimed, the bench in reach and the inputs held (stageHeld), takes them
 * (carried first, then from the intake's entrances) and gives the tagged rounds, so the tagged item counts as hand-made and the stage unlocks. Any number of times.
 * The crafting menu's `craft` refuses stage ids, so this is the only way to apply one by hand. `rowId` names a bench
 * row (039.12: `frost-rune-bomb`), or a stage for its home row; a row the player can't see yet refuses.
 */
export function applyStage(state: SimState, rowId: string): boolean {
  const row = stageRow(rowId);
  const known = row !== undefined && stageRowsKnown(state).includes(row);
  if (!row || !known || !stagesKnown(state) || !fixtureInReach(state, 'bench') || !stageAffordable(state, row.id)) {
    state.events.craftFails.push({ recipeId: rowId });
    return false;
  }
  for (const [itemId, need] of Object.entries(row.recipe.inputs)) pullFromEntrances(state, itemId, need - count(state.inventory, itemId));
  make(state, row.recipe);
  return true;
}

/** What a bench row may draw on: the stores held counts read. */
export type StageStores = Pick<SimState, 'inventory'> & { link: Pick<SimState['link'], 'entrances'> };

/**
 * How many of an item count as held for a bench row (029, raised after the build): carried, plus the rounds in the
 * intake's entrances. The Stages panel's counts and dimming read this.
 */
export function stageHeld(state: StageStores, itemId: string): number {
  const ammoId = ammoOfItem(itemId);
  const inEntrances = ammoId === null ? 0 : state.link.entrances.reduce((n, e) => n + (e.ammoId === ammoId ? e.count : 0), 0);
  return count(state.inventory, itemId) + inEntrances;
}

/** Moves up to `n` of an item from the intake's entrances, in intake order, into the inventory (carried rounds are spent first). */
function pullFromEntrances(state: SimState, itemId: string, n: number): void {
  const ammoId = ammoOfItem(itemId);
  if (ammoId === null) return;
  let left = n;
  for (const e of state.link.entrances) {
    while (left > 0 && e.ammoId === ammoId && takeFromEntrance(e)) {
      state.inventory[itemId] = count(state.inventory, itemId) + 1;
      left -= 1;
    }
  }
}

/** The bench rows the player can see (039.12): a family's row once its own ammo can be made (landmines after ley-iron is found, 038.3). */
export function stageRowsKnown(state: Pick<SimState, 'found'> & { link: Pick<SimState['link'], 'attuned'> }): StageRow[] {
  return STAGE_ROWS.filter((r) => knownRecipe(state, r.base));
}

/** Whether a bench row's inputs are held, carried or in the intake's entrances (029: the row is dimmed otherwise). */
export function stageAffordable(state: StageStores, rowId: string): boolean {
  const row = stageRow(rowId);
  return row !== undefined && Object.entries(row.recipe.inputs).every(([itemId, n]) => stageHeld(state, itemId) >= n);
}

/** Stage ids the player can build (any of their tagged rounds has been hand-made: 039, hand-applied once to any round), in stage order. */
export function stagesUnlocked(state: Pick<SimState, 'crafted'>): string[] {
  return Object.values(STAGES)
    .filter((st) => STAGE_ROWS.some((r) => r.stage === st.id && state.crafted.includes(r.recipe.output.itemId)))
    .map((st) => st.id);
}
