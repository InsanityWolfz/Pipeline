import { TICK_RATE } from '../data/config';
import { INTAKE_RATE } from '../data/foundry';
import { fireRate } from './emissions';
import type { SimState } from './state';

// 069: the intake's numbers for its hover. Each entrance's supply rate in is measured: the rounds it took in one-second
// buckets (`link.inflow`), the last INTAKE_RATE.windowSeconds whole seconds over that many seconds, so it changes once a
// second and shows a real bottleneck. Its fire rate is its round's own shots a second with the player's talents and
// gear (the Build tab's), no held ramp (069.1: the tube is quiet in the foundry, where the hover shows).

/** One entrance's numbers: rounds a second in, and shots a second its round fires (null while it's empty or capped). */
export interface EntranceRate {
  inPerSecond: number;
  firesPerSecond: number | null;
}

/** Buckets kept per entrance: the window's whole seconds, and the second running now (as createLink makes them). */
const INFLOW_BUCKETS = INTAKE_RATE.windowSeconds + 1;

const bucketOf = (tick: number): number => Math.floor(tick / TICK_RATE) % INFLOW_BUCKETS;

/** After the foundry's flow each tick: a new second clears its bucket, then the tick's refills are counted. */
export function stepIntakeRates(state: Pick<SimState, 'tick' | 'link' | 'events'>): void {
  const b = bucketOf(state.tick);
  const fresh = state.tick % TICK_RATE === 0;
  state.link.entrances.forEach((_e, i) => {
    const row = state.link.inflow[i] ?? (state.link.inflow[i] = Array.from({ length: INFLOW_BUCKETS }, () => 0));
    if (fresh) row[b] = 0;
  });
  for (const r of state.events.refills) {
    const row = state.link.inflow[r.entrance];
    if (row) row[b] = (row[b] ?? 0) + 1;
  }
}

/** Each entrance's rates now, in INTAKE.entrances order. */
export function entranceRates(state: Pick<SimState, 'tick' | 'link' | 'talents' | 'gear' | 'equipped'>): EntranceRate[] {
  const now = bucketOf(state.tick);
  const still = { talents: state.talents, gear: state.gear, equipped: state.equipped };
  return state.link.entrances.map((e, i) => {
    const row = state.link.inflow[i] ?? [];
    const taken = row.reduce((n, k, j) => (j === now ? n : n + k), 0);
    return { inPerSecond: taken / INTAKE_RATE.windowSeconds, firesPerSecond: e.open && e.ammoId !== null ? fireRate(still, e.ammoId) : null };
  });
}
