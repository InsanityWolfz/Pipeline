import { OBJECTIVES, type ObjectiveCheck, type ObjectiveDef } from '../data/objectives';
import { TALENT_START } from '../data/talents';
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
    case 'fieldCleared':
      return state.fieldCleared;
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
      // 067: the Pylon Warden has no altar, so only `killedBosses` (037) records it.
      return state.bossDefeats.includes(check.boss) || state.killedBosses.includes(check.boss);
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
  for (const [i, def] of OBJECTIVES.entries()) {
    if (state.objectives[i] || !holds(state, def.check) || (def.inOrder && !before(state, i))) continue;
    state.objectives[i] = true;
    state.events.objectives.push({ index: i });
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
