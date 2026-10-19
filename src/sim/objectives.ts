import { OBJECTIVES, type ObjectiveCheck } from '../data/objectives';
import { feedsIntake } from './intake';
import { volleyRounds } from './volley';
import type { SimState } from './state';
import { FOUNDRY_ROOM } from '../data/rooms';

// The tutorial's objectives (012). Each one completes the first tick its check
// holds and stays done, so they can finish in any order. The objective line shows
// the first unfinished one; finishing the last marks the prototype complete.

/** Whether a check holds right now. `awayRunning` counts ticks in state.awayTicks. */
function holds(state: SimState, check: ObjectiveCheck): boolean {
  switch (check.kind) {
    case 'hasTube':
      return state.hasTube;
    case 'gathered':
      return check.items.every((id) => state.gathered.includes(id));
    case 'crafted':
      return check.items.every((id) => state.crafted.includes(id));
    case 'gate':
      return state.gates[check.gate];
    case 'inRoom':
      return state.roomId === check.room;
    case 'intakeFed':
      return feedsIntake(state.foundry);
    case 'lineFull':
      return state.firstLineFull;
    case 'identified':
      return state.armor.length > 0;
    case 'claimed':
      return state.claims.includes(check.site);
    case 'sidesOpen':
      return state.link.entrances.every((e) => e.open);
    case 'volley':
      return volleyRounds(state).length >= check.min;
    case 'awayRunning':
      return state.awayTicks >= check.ticks;
  }
}

/** Notes harvests, counts time away with a line running, and completes whatever now holds. */
export function stepObjectives(state: SimState): void {
  for (const h of state.events.harvests) if (!state.gathered.includes(h.itemId)) state.gathered.push(h.itemId);
  // The last goal is heading out once everything else is done, so its clock only runs then.
  const rest = state.objectives.slice(0, -1).every(Boolean);
  const running = feedsIntake(state.foundry);
  state.awayTicks = rest && running && state.roomId !== FOUNDRY_ROOM ? state.awayTicks + 1 : 0;
  for (const [i, def] of OBJECTIVES.entries()) {
    if (state.objectives[i] || !holds(state, def.check)) continue;
    state.objectives[i] = true;
    state.events.objectives.push({ index: i });
  }
  if (!state.prototypeComplete && state.objectives.every(Boolean)) state.prototypeComplete = true;
}

/** The first unfinished objective's index, or null once all are done. */
export function currentObjective(state: Pick<SimState, 'objectives'>): number | null {
  const i = state.objectives.findIndex((done) => !done);
  return i < 0 ? null : i;
}
