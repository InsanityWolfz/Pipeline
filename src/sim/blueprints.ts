import { BLUEPRINT_NAMING, BLUEPRINT_SLOTS, BLUEPRINT_TABLE } from '../data/blueprints';
import { itemDef } from '../data/items';
import { machineDef, pieceDef } from '../data/pieces';
import { recipeDef } from '../data/recipes';
import { FOUNDRY_ROOM } from '../data/rooms';
import { roundTags } from '../data/tags';
import { piecesInBox, type AreaBox } from './area';
import type { Facing } from './player';
import { isRestored } from './research';
import { stageOf } from './stages';
import type { SimState } from './state';

// Blueprints (063): a dragged area saved for good, once the Blueprint table is restored. A blueprint holds each piece
// wholly inside the box (its id, its tile from the box's top-left, its facing and the settings the player chose: a
// conduit's turn, a splitter's side, a stage machine's round, an underground pair's link), never what they hold. It is
// named after the most finished thing its pieces make, with that item's icon. 8 slots, kept through a KO and saved.

/** One piece of a blueprint: its tile from the box's top-left, its facing, and its settings. */
export interface BlueprintPiece {
  pieceId: string;
  dx: number;
  dy: number;
  facing: Facing;
  /** A conduit's intake side (013). */
  inFrom?: Facing;
  /** A splitter's side on its left (033). */
  mirrored?: boolean;
  /** A stage machine's round (029). */
  made?: string;
  /** An underground end's partner (052), as an index into the blueprint's pieces. */
  link?: number;
}

export interface Blueprint {
  name: string;
  /** The item it's named after (its icon), or null for Logistics. */
  itemId: string | null;
  /** The box's size in tiles. */
  w: number;
  h: number;
  pieces: BlueprintPiece[];
}

/** Saving and placing blueprints are unlocked: the Blueprint table is restored. */
export const blueprintsUnlocked = (state: Pick<SimState, 'research'>): boolean => isRestored(state, BLUEPRINT_TABLE);

/** A box's pieces as a blueprint's (no name yet). */
export function captureBlueprint(foundry: SimState['foundry'], box: AreaBox): Omit<Blueprint, 'name' | 'itemId'> {
  const inside = piecesInBox(foundry, box);
  const pieces = inside.map((p): BlueprintPiece => {
    const out: BlueprintPiece = { pieceId: p.pieceId, dx: p.tx - box.tx0, dy: p.ty - box.ty0, facing: p.facing };
    if (p.kind === 'conduit') out.inFrom = p.inFrom;
    if (p.kind === 'splitter' && p.mirrored) out.mirrored = true;
    if (p.kind === 'machine' && stageOf(p.pieceId)) out.made = p.made;
    if (p.kind === 'tunnel-in' || p.kind === 'tunnel-out') {
      const link = inside.findIndex((q) => q.id === p.pair);
      if (link >= 0) out.link = link;
    }
    return out;
  });
  return { w: box.tx1 - box.tx0 + 1, h: box.ty1 - box.ty0 + 1, pieces };
}

/** What a machine piece makes: a stage's round, else its recipe's output. */
const productOf = (p: BlueprintPiece): string => p.made ?? recipeDef(machineDef(p.pieceId).recipeId).output.itemId;

/**
 * The item a blueprint is named after: the round of its stage machine with the most tags (the latest on a tie); else
 * the round its assembler, packer or mine packer makes; else its first machine's product; else null (Logistics).
 */
export function namedProduct(pieces: readonly BlueprintPiece[]): string | null {
  const machines = pieces.filter((p) => pieceDef(p.pieceId).kind === 'machine');
  const stages = machines.filter((p) => stageOf(p.pieceId) !== null);
  if (stages.length > 0) {
    const best = stages.reduce((a, b) => (roundTags(productOf(b)).length >= roundTags(productOf(a)).length ? b : a));
    return productOf(best);
  }
  const finisher = machines.find((p) => BLUEPRINT_NAMING.finishers.includes(p.pieceId));
  const first = finisher ?? machines[0];
  return first ? productOf(first) : null;
}

/** A blueprint's name for its item (its plural, or Logistics), numbered from 2 when `used` already holds it. */
export function blueprintName(itemId: string | null, used: readonly string[]): string {
  const N = BLUEPRINT_NAMING;
  const name = itemId === null ? N.logistics : (N.plurals[itemId] ?? plural(itemDef(itemId).name));
  if (!used.includes(name)) return name;
  let n = N.firstNumber;
  while (used.includes(N.numbered(name, n))) n += 1;
  return N.numbered(name, n);
}

const plural = (name: string): string => (name.endsWith('s') ? name : `${name}s`);

/**
 * Saves the box's pieces as a blueprint: into `slot` (overwriting it), or the next free slot. Returns the slot, or null
 * (recording why) with no table, an empty box, or every slot full and none named.
 */
export function saveBlueprint(state: SimState, box: AreaBox, slot?: number): number | null {
  const fail = (reason: 'full' | 'empty' | 'locked'): null => {
    state.events.blueprintSaveFails.push({ reason });
    return null;
  };
  if (state.roomId !== FOUNDRY_ROOM) return null;
  if (!blueprintsUnlocked(state)) return fail('locked');
  const shape = captureBlueprint(state.foundry, box);
  if (shape.pieces.length === 0) return fail('empty');
  const into = slot !== undefined && slot >= 0 && slot < state.blueprints.length ? slot : state.blueprints.length;
  if (into >= BLUEPRINT_SLOTS) return fail('full');
  const itemId = namedProduct(shape.pieces);
  const name = blueprintName(itemId, state.blueprints.filter((_, i) => i !== into).map((b) => b.name));
  state.blueprints[into] = { name, itemId, ...shape };
  state.events.blueprintSaves.push({ slot: into, name });
  return into;
}

/** Deletes the blueprint in a slot; the ones after it move up. */
export function deleteBlueprint(state: SimState, slot: number): void {
  const bp = state.blueprints[slot];
  if (!bp) return;
  state.blueprints.splice(slot, 1);
  state.events.blueprintDeletes.push({ slot, name: bp.name });
}

/** For getState() (063): whether blueprints are unlocked, and each slot's blueprint whole. */
export function blueprintSummary(state: Pick<SimState, 'research' | 'blueprints'>): { unlocked: boolean; list: Blueprint[] } {
  return { unlocked: blueprintsUnlocked(state), list: structuredClone(state.blueprints) };
}
