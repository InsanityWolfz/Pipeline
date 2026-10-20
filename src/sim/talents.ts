import { FOUNDRY_ROOM, SANDBOX_ROOM } from '../data/rooms';
import { TALENT_POINT_COST, TALENT_START, TALENTS } from '../data/talents';
import type { SimState } from './state';
import { playerStats } from './stats';

// The talent tree (037): taking nodes and respec. A node can be taken with a point when it
// isn't taken yet and links to a taken node, anywhere, even mid-trip. Respec is free but
// only in the foundry: every node but the start comes back as points. What a node does is
// its content lines (039), which resolveStat reads (statResolve.ts).

/** True if the node can be taken now: a point to spend, not taken yet, and linked to a taken node. */
export function canTake(state: Pick<SimState, 'talents' | 'talentPoints'>, id: string): boolean {
  const def = TALENTS[id];
  if (!def || state.talentPoints < TALENT_POINT_COST || state.talents.includes(id)) return false;
  return def.links.some((l) => state.talents.includes(l));
}

/** Takes a node if it can be taken: a point spent, the node recorded, and a talent event. Taking never heals. */
export function takeTalent(state: SimState, id: string): void {
  if (!canTake(state, id)) return;
  state.talents.push(id);
  state.talentPoints -= TALENT_POINT_COST;
  state.events.talents.push({ id });
}

/** Where respec works: the foundry, and the sandbox's room (044: the sandbox can't reach the foundry). */
export const respecHere = (state: Pick<SimState, 'roomId' | 'sandbox'>): boolean => state.roomId === FOUNDRY_ROOM || (state.sandbox !== undefined && state.roomId === SANDBOX_ROOM);

/**
 * In the foundry only (or the sandbox, 044): clears every talent but the start and returns their points, free, with a respec event. Health
 * above the new max (Tough Hide taken back) comes down to it.
 */
export function respec(state: SimState): void {
  if (!respecHere(state)) return;
  const refunded = state.talents.filter((id) => id !== TALENT_START).length * TALENT_POINT_COST;
  state.talents = [TALENT_START];
  state.talentPoints += refunded;
  state.player.health = Math.min(state.player.health, playerStats(state).maxHealth);
  state.events.respecs.push({ refunded });
}
