import { FOUNDRY_ROOM } from '../data/rooms';
import { TALENT_START, TALENTS, talentDef } from '../data/talents';
import type { SimState } from './state';
import { playerStats } from './stats';

// The talent tree (037): taking nodes and respec. A node can be taken with a point when it
// isn't taken yet and links to a taken node, anywhere, even mid-trip. Respec is free but
// only in the foundry: every node but the start comes back as points. Effects are summed
// in talentEffects.ts for playerStats, the one place stats are computed (036).

/** True if the node can be taken now: a point to spend, not taken yet, and linked to a taken node. */
export function canTake(state: Pick<SimState, 'talents' | 'talentPoints'>, id: string): boolean {
  const def = TALENTS[id];
  if (!def || state.talentPoints <= 0 || state.talents.includes(id)) return false;
  return def.links.some((l) => state.talents.includes(l));
}

/** Takes a node if it can be taken: a point spent, the node recorded, and a talent event. Taking never heals. */
export function takeTalent(state: SimState, id: string): void {
  if (!canTake(state, id)) return;
  state.talents.push(talentDef(id).id);
  state.talentPoints -= 1;
  state.events.talents.push({ id });
}

/**
 * In the foundry only: clears every talent but the start and returns their points, free, with a respec event. Health
 * above the new max (Tough Hide taken back) comes down to it.
 */
export function respec(state: SimState): void {
  if (state.roomId !== FOUNDRY_ROOM) return;
  const refunded = state.talents.filter((id) => id !== TALENT_START).length;
  state.talents = [TALENT_START];
  state.talentPoints += refunded;
  state.player.health = Math.min(state.player.health, playerStats(state).maxHealth);
  state.events.respecs.push({ refunded });
}
