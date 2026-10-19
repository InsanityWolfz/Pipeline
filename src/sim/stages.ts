import { machineDef, pieceDef } from '../data/pieces';
import { recipeDef, type RecipeDef } from '../data/recipes';
import { SHRINE_SITE } from '../data/rooms';
import { stageBase, stageDef, stageRecipeFor, STAGES, type StageDef } from '../data/stages';
import { roundBase, withoutTag, withTag } from '../data/tags';
import { INPUT_CAP } from '../data/foundry';
import { fixtureInReach, isClaimed } from './claims';
import { craft } from './crafting';
import { count } from './inventory';
import type { MachineState } from './pieces';
import type { SimState } from './state';

// Stage machines (029): rules for a machine whose piece is a stage, and hand-applying a
// stage at the bench. A stage takes a round of its base that has no tag in its slot,
// and its material, from any side but its front; it works on one round kind at a time,
// held in `made` as the tagged round it makes, until its rounds, craft and output are clear.

/** The stage a machine piece is, or null for an ordinary machine. */
export function stageOf(pieceId: string): StageDef | null {
  const def = pieceDef(pieceId);
  return def.kind === 'machine' && def.stage !== undefined ? stageDef(def.stage) : null;
}

/** Whether a stage can work on this round: its base ammo, with no tag in the stage's slot. */
export function stageTakes(st: StageDef, round: string): boolean {
  return roundBase(round) === stageBase(st) && withTag(round, st.tag) !== null;
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
    if (!stageTakes(st, item)) return false;
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
 * Hand-applies a stage at the bench (029): with the shrine claimed and the bench in reach, takes its inputs and gives
 * the tagged rounds as a hand craft, so the tagged item counts as hand-made and the stage unlocks. Any number of times.
 */
export function applyStage(state: SimState, stageId: string): boolean {
  if (!STAGES[stageId] || !stagesKnown(state) || !fixtureInReach(state, 'bench')) return false;
  return craft(state, stageId);
}

/** Stage ids the player can build (their tagged round has been hand-made), in stage order. */
export function stagesUnlocked(state: Pick<SimState, 'crafted'>): string[] {
  return Object.values(STAGES)
    .filter((st) => state.crafted.includes(recipeDef(st.id).output.itemId))
    .map((st) => st.id);
}
