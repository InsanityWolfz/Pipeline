import { TICK_RATE } from '../data/config';
import { FIRE } from '../data/tags';
import { damageEnemy, targetable, type EnemyState, type HitStyle } from './enemies';
import type { SimState } from './state';
import { statOf, statusEmission, type Statted } from './statResolve';

// Fire (060): a fire hit sets an enemy burning for FIRE.burnTicks (the player's stats' duration), dealing
// FIRE.burnShare of that hit a second. A new hit restarts the timer at the stronger burn, so burns never stack. The
// burn beats once a second of burning, and deals what's left of a second as it ends, so a burn deals its damage a
// second times its seconds. A beat is a hit of its own kind: it never ignites, knocks or flashes, and an immune enemy
// (a Burrower underground) takes none. A burning enemy that dies passes its burn, at its damage a second and for the
// full time, to every living enemy in its room within the spread radius; spreading chains as they die in turn.

/** A burn's beat: Fire damage with no knock or flash, marked so it never ignites and render shows it small. */
const BEAT: HitStyle = { knock: 0, flash: false, damageType: 'fire', burn: true };

/** A burn's length with the player's stats (060's talent: +50% duration, through resolveStat). */
export const burnTicksOf = (state: Statted): number => Math.round(statOf(state, 'duration', statusEmission('fire'), FIRE.burnTicks));

/** How far a burn spreads with the player's stats, px (060's talent: a tile further, through resolveStat). */
export const spreadRadiusOf = (state: Statted): number => statOf(state, 'spread-radius', statusEmission('fire'), FIRE.spreadRadius);

/** Sets an enemy burning at `dps` a second (a hit's share, or a dying enemy's burn): a first burn, or a refresh at the stronger. */
export function igniteEnemy(state: SimState, e: EnemyState, dps: number): void {
  if (e.burnTicks <= 0) {
    e.burnNext = TICK_RATE;
    e.burnDps = dps;
    state.events.ignites.push({ id: e.id, x: e.x, y: e.y });
  } else e.burnDps = Math.max(e.burnDps, dps);
  e.burnTicks = burnTicksOf(state);
}

/** One tick of an enemy's burn: a beat each second of burning, and the rest of a second as it ends. */
function tickBurn(state: SimState, e: EnemyState): void {
  e.burnTicks -= 1;
  e.burnNext -= 1;
  const ended = e.burnTicks <= 0;
  const beat = e.burnNext <= 0 ? TICK_RATE : ended ? TICK_RATE - e.burnNext : 0;
  if (beat > 0 && targetable(e)) damageEnemy(state, e, (e.burnDps * beat) / TICK_RATE, 0, 0, BEAT);
  if (e.burnNext <= 0) e.burnNext = TICK_RATE;
  if (!ended) return;
  e.burnTicks = 0;
  e.burnNext = 0;
  // One its last beat killed still dies burning, so its burn spreads.
  if (e.health > 0) e.burnDps = 0;
}

/** Every living enemy's burn, a tick, in every room: its own pass, after everything that hits this tick. */
export function stepBurns(state: SimState): void {
  for (const e of state.enemies) if (e.burnTicks > 0 && e.health > 0) tickBurn(state, e);
}

/** A burning enemy that died passes its burn to every living, hittable enemy in its room within the spread radius. */
export function spreadBurn(state: SimState, dead: EnemyState): void {
  if (dead.burnDps <= 0) return;
  const radius = spreadRadiusOf(state);
  const to: number[] = [];
  for (const e of state.enemies) {
    if (e === dead || e.roomId !== dead.roomId || e.health <= 0 || !targetable(e)) continue;
    if (Math.hypot(e.x - dead.x, e.y - dead.y) > radius) continue;
    igniteEnemy(state, e, dead.burnDps);
    to.push(e.id);
  }
  if (to.length > 0) state.events.spreads.push({ from: dead.id, to, x: dead.x, y: dead.y });
}
