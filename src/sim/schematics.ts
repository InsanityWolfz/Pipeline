import { ANY_SCHEMATIC, SCHEMATIC_CHANCE, SCHEMATIC_REGIONS } from '../data/drops';
import { regionOf } from './regions';
import { ITEMS } from '../data/items';
import { nodeOfSchematic } from '../data/research';
import { count } from './inventory';
import { nodeState } from './research';
import { nextFloat, nextInt, type RngState } from './rng';
import type { SimState } from './state';

// Schematics (033): rare drops that reveal a lost part of the foundry. One drops as
// an unknown, picked evenly from those still lost (not revealed, carried, lying on
// the ground or in the stash) whose regions allow where it lands, so there are no
// duplicates. It reveals its node once banked: carried into the foundry, or sent home
// from a pylon. A KO before then loses it (011), and its node stays hidden.

const SCHEMATICS: readonly string[] = Object.values(ITEMS)
  .filter((it) => it.kind === 'schematic')
  .map((it) => it.id);

/** A schematic's node is revealed (or restored), so it shows by its real name rather than as an unknown. */
export function schematicKnown(state: Pick<SimState, 'research'>, itemId: string): boolean {
  const node = nodeOfSchematic(itemId);
  return node !== undefined && nodeState(state, node.id) !== 'hidden';
}

/** The schematics that could drop in a room now: not revealed, carried, on the ground or in the stash, and allowed in its region. */
export function eligibleSchematics(state: Pick<SimState, 'research' | 'inventory' | 'groundItems' | 'stash'>, roomId: string, at?: { x: number; y: number }): string[] {
  // 034: in the overworld, the region is where it lands (Stonefall Hollows is Region 2).
  const region = regionOf(roomId, at);
  return SCHEMATICS.filter(
    (id) =>
      !schematicKnown(state, id) &&
      count(state.inventory, id) === 0 &&
      count(state.stash, id) === 0 &&
      !state.groundItems.some((g) => g.itemId === id) &&
      (SCHEMATIC_REGIONS[id] ?? []).includes(region),
  );
}

/** An enemy's separate schematic roll on death: the token for one schematic at its source's chance, else nothing. */
export function rollSchematic(rng: RngState, champion: boolean): string[] {
  return nextFloat(rng) < (champion ? SCHEMATIC_CHANCE.champion : SCHEMATIC_CHANCE.enemy) ? [ANY_SCHEMATIC] : [];
}

/** One schematic to drop at a point in a room, picked evenly from those eligible, or null when none is. */
export function pickSchematic(state: SimState, roomId: string, at?: { x: number; y: number }): string | null {
  const eligible = eligibleSchematics(state, roomId, at);
  if (eligible.length === 0) return null;
  return eligible[nextInt(state.rng, 0, eligible.length - 1)] ?? null;
}

/** On banking: each schematic carried, or just sent home to the stash, whose node is still hidden reveals it, recorded. */
export function revealBanked(state: SimState): void {
  for (const id of SCHEMATICS) {
    const node = nodeOfSchematic(id);
    const held = count(state.inventory, id) + count(state.stash, id);
    if (!node || held === 0 || nodeState(state, node.id) !== 'hidden') continue;
    state.research[node.id] = 'revealed';
    state.events.schematicReveals.push({ itemId: id, node: node.id });
  }
}
