import { FRONTIER_GOAL, OBJECTIVES, type ObjectiveCheck, type ObjectiveDef } from '../data/objectives';
import { feedsIntake } from './intake';
import { volleyRounds } from './volley';
import type { SimState } from './state';
import { FOUNDRY_ROOM } from '../data/rooms';
import { isRestored } from './research';
import { regionOf } from './regions';

// The objectives (012, 028): one ordered chain. Each one completes the first tick
// its check holds and stays done, so they can finish in any order. The objective
// line shows the first unfinished one, or the frontier goal once all are done;
// finishing the prototype's goals marks the prototype complete.

/** Whether a check holds right now. `awayRunning` counts ticks in state.awayTicks; `machineMade` reads the tally in state.machineMade. */
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
    case 'intakeFed':
      return feedsIntake(state.foundry) && (check.item === undefined || state.events.refills.some((r) => r.itemId === check.item));
    case 'placed':
      return state.foundry.pieces.some((p) => p.pieceId === check.piece);
    case 'hopperHolds':
      return state.foundry.pieces.some((p) => p.kind === 'hopper' && p.item === check.item && p.count > 0);
    case 'machineMade':
      return (state.machineMade[check.item] ?? 0) > 0;
    case 'lineFull':
      return state.firstLineFull;
    case 'identified':
      return state.gear.length > 0;
    case 'claimed':
      return state.claims.includes(check.site);
    case 'restored':
      return isRestored(state, check.node);
    case 'volley':
      return volleyRounds(state).length >= check.min;
    case 'awayRunning':
      return state.awayTicks >= check.ticks;
    case 'portDelivered':
      return state.events.portDeliveries.length > 0;
    case 'mixedVolley':
      return new Set(volleyRounds(state).map((r) => r.ammoId)).size >= 2;
    case 'claimedCount':
      return state.claims.length >= check.min;
    case 'inRegion':
      return regionOf(state.roomId, state.player) === check.region;
    case 'bossDefeated':
      return state.bossDefeats.includes(check.boss);
  }
}

/** The heading-out goal: its clock only runs once every goal before it is done (028), so goals can follow it. */
const AWAY = OBJECTIVES.findIndex((o) => o.check.kind === 'awayRunning');

/** Notes harvests and what machines made, counts time away with a line running, and completes whatever now holds. */
export function stepObjectives(state: SimState): void {
  for (const h of state.events.harvests) if (!state.gathered.includes(h.itemId)) state.gathered.push(h.itemId);
  for (const m of state.events.made) state.machineMade[m.itemId] = (state.machineMade[m.itemId] ?? 0) + m.count;
  // Heading out comes once everything before it is done, so its clock only runs then.
  const rest = AWAY >= 0 && state.objectives.slice(0, AWAY).every(Boolean);
  const running = feedsIntake(state.foundry);
  state.awayTicks = rest && running && state.roomId !== FOUNDRY_ROOM ? state.awayTicks + 1 : 0;
  for (const [i, def] of OBJECTIVES.entries()) {
    if (state.objectives[i] || !holds(state, def.check)) continue;
    state.objectives[i] = true;
    state.events.objectives.push({ index: i });
  }
  if (!state.prototypeComplete && OBJECTIVES.every((o, i) => o.milestone !== 'prototype' || state.objectives[i])) state.prototypeComplete = true;
}

/** The first unfinished objective's index, or null once all are done. */
export function currentObjective(state: Pick<SimState, 'objectives'>): number | null {
  const i = state.objectives.findIndex((done) => !done);
  return i < 0 ? null : i;
}

/** The first unfinished objective's data, or null once all are done. */
export function currentObjectiveDef(state: Pick<SimState, 'objectives'>): ObjectiveDef | null {
  const i = currentObjective(state);
  return i === null ? null : (OBJECTIVES[i] ?? null);
}

/** What the objective line shows (028): the first unfinished goal and its index, or the frontier goal (index null) once all are done. It is never blank. */
export function objectiveLine(state: Pick<SimState, 'objectives'>): { index: number | null; text: string } {
  const i = currentObjective(state);
  const def = i === null ? undefined : OBJECTIVES[i];
  return i !== null && def ? { index: i, text: def.text } : { index: null, text: FRONTIER_GOAL.text };
}
