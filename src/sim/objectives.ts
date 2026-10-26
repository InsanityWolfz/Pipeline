import { OBJECTIVES, type ObjectiveCheck, type ObjectiveDef } from '../data/objectives';
import { TALENT_START } from '../data/talents';
import { machineRecipe, machineRecipes, stageOf } from './stages';
import { count } from './inventory';
import type { FoundryState } from './pieces';
import { volleyRounds } from './volley';
import type { SimState } from './state';
import { FOUNDRY_ROOM } from '../data/rooms';
import { isRestored } from './research';
import { regionOf } from './regions';
import { noteSubSteps } from './subSteps';

// The objectives (012, 028): one ordered chain. Each one completes the first tick
// its check holds and stays done, so they can finish in any order (058: an `inOrder`
// goal only once every goal before it is done). The objective line shows the first
// unfinished one, the talent cut-in (058) while it's due, and nothing once the chain's
// last goal is done (058: the tutorial ends there); finishing the prototype's goals
// marks the prototype complete.

/**
 * The lines have run dry (046): no hopper holds anything, and no machine is crafting or holds a whole craft's inputs.
 * Parts left over in a buffer, finished items waiting to go out and items on carriers don't count, so leftovers stuck
 * in a line (one wood more than the stones and fibers it needs) never keep it from counting as dry.
 */
export function foundryDry(foundry: FoundryState): boolean {
  return foundry.pieces.every((p) => {
    if (p.kind === 'hopper') return p.count === 0;
    if (p.kind !== 'machine') return true;
    // 062: none of its recipes (a tier variant's too) has a whole set.
    const recipes = stageOf(p.pieceId) ? [machineRecipe(p)] : machineRecipes(p.pieceId);
    return !p.crafting && !recipes.some((r) => Object.entries(r.inputs).every(([id, n]) => count(p.buffer, id) >= n));
  });
}

/** Whether a check holds right now. `machineMade` reads the tally in state.machineMade. */
function holds(state: SimState, check: ObjectiveCheck): boolean {
  switch (check.kind) {
    case 'hasTube':
      return state.hasTube;
    case 'gathered':
      return check.items.every((id) => state.gathered.includes(id));
    case 'crafted':
      return check.items.every((id) => state.crafted.includes(id));
    case 'craftedAny':
      return check.items.some((id) => state.crafted.includes(id));
    case 'gate':
      return state.gates[check.gate];
    case 'inRoom':
      return state.roomId === check.room;
    case 'outside':
      return state.roomId !== FOUNDRY_ROOM;
    case 'refilled':
      // With no hopper left to refill (a save from before 046 has no example line), it counts as done.
      return state.lineRanDry && (!state.foundry.pieces.some((p) => p.kind === 'hopper') || check.items.every((id) => state.refilled.includes(id)));
    case 'entranceFed':
      return state.link.entrances.some((e) => e.node === check.node && e.ammoId !== null && e.count > 0 && (check.ammo === undefined || e.ammoId === check.ammo));
    case 'machineMade':
      return (state.machineMade[check.item] ?? 0) > 0;
    case 'lineFull':
      return state.firstLineFull;
    case 'identified':
      return state.gear.length > 0;
    case 'equipped':
      return Object.values(state.equipped).some((id) => id !== null);
    case 'travelled':
      return state.travelled;
    case 'talentSpent':
      return state.talents.some((t) => t !== TALENT_START);
    case 'claimed':
      return state.claims.includes(check.site);
    case 'restored':
      return isRestored(state, check.node);
    case 'volley':
      return volleyRounds(state).length >= check.min;
    case 'inRegion':
      return regionOf(state.roomId, state.player) === check.region;
    case 'bossDefeated':
      return state.bossDefeats.includes(check.boss);
    case 'fired':
      // 062: this tick's shots (the tube steps before the goals do).
      return state.events.shots.some((shot) => check.items.includes(shot.ammoId));
  }
}

/** The chain's goals in order, without the cut-in (058). */
const CHAIN = OBJECTIVES.flatMap((o, i) => (o.cutIn ? [] : [i]));
/** The chain's last goal: once it's done the tutorial is over (058). */
const LAST = CHAIN[CHAIN.length - 1] ?? -1;

/** Every chain goal before `i` is done. */
const before = (state: SimState, i: number): boolean => CHAIN.every((j) => j >= i || state.objectives[j]);

/** Notes harvests and what machines made, and completes whatever now holds. */
export function stepObjectives(state: SimState): void {
  for (const h of state.events.harvests) if (!state.gathered.includes(h.itemId)) state.gathered.push(h.itemId);
  for (const m of state.events.made) {
    if ((state.machineMade[m.itemId] ?? 0) === 0) state.events.firstMade.push({ id: m.id, itemId: m.itemId });
    state.machineMade[m.itemId] = (state.machineMade[m.itemId] ?? 0) + m.count;
  }
  // 046: the lines' first running dry, then what the player puts back in hoppers by hand.
  if (!state.lineRanDry && state.link.attuned && foundryDry(state.foundry)) state.lineRanDry = true;
  else if (state.lineRanDry) for (const d of state.events.deposits) if (!state.refilled.includes(d.itemId)) state.refilled.push(d.itemId);
  for (const [i, def] of OBJECTIVES.entries()) {
    if (state.objectives[i] || !holds(state, def.check) || (def.inOrder && !before(state, i))) continue;
    state.objectives[i] = true;
    state.events.objectives.push({ index: i });
    // 058: a goal that shows only if the lines ran dry by now is skipped, unseen, if they haven't (its trigger goal is
    // `inOrder`, so this is decided when that goal is the current one).
    if (!state.lineRanDry) for (const [k, other] of OBJECTIVES.entries()) if (other.skipUnlessDryAfter === def.check.kind) state.objectives[k] = true;
  }
  noteSubSteps(state, currentObjective(state));
  if (!state.prototypeComplete && OBJECTIVES.every((o, i) => o.milestone !== 'prototype' || state.objectives[i])) state.prototypeComplete = true;
}

/** The talent cut-in (058): due once a point has come in and none is spent, and never during a guided build (058.4). */
function cutInDue(state: SimState, chainGoal: number | null): number | null {
  if (chainGoal === null || OBJECTIVES[chainGoal]?.guided) return null;
  const i = OBJECTIVES.findIndex((o, k) => o.cutIn && !state.objectives[k]);
  return i >= 0 && state.talentPoints > 0 ? i : null;
}

/** The current goal's index: the talent cut-in while it's due, else the chain's first unfinished goal; null once the chain's last goal is done (058). */
export function currentObjective(state: SimState): number | null {
  if (state.objectives[LAST]) return null;
  const chain = CHAIN.find((i) => !state.objectives[i]) ?? null;
  return cutInDue(state, chain) ?? chain;
}

/** The first unfinished objective's data, or null once all are done. */
export function currentObjectiveDef(state: SimState): ObjectiveDef | null {
  const i = currentObjective(state);
  return i === null ? null : (OBJECTIVES[i] ?? null);
}

/** What the objective line shows: the current goal and its index, or nothing (index null, no text) once the tutorial is over (058). */
export function objectiveLine(state: SimState): { index: number | null; text: string } {
  const i = currentObjective(state);
  const def = i === null ? undefined : OBJECTIVES[i];
  return i !== null && def ? { index: i, text: def.text } : { index: null, text: '' };
}
