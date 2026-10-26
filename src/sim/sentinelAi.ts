import type { SentinelDef } from '../data/stormcrownEnemies';
import { engage, hold, inAggroBox, keepDistance, leash, startWindup, stepAttack } from './aiCommon';
import type { EnemyState } from './enemies';
import { clearShot } from './sightLine';
import { roomById, type SimState } from './state';
import { callStrike } from './strikes';

// The storm sentinel (065): a squat turret with a rod and a lens. It keeps its distance from the player (061's
// keep-distance), and every cooldown, with a clear line to them in range, it calls a red strike circle down on their
// feet (064's strikes), holding still as the circle waits; the strike lands as its call ends. It never has more than
// one of its circles waiting. It's slow and fragile: killed first.

/** Advances a sentinel's mode and returns this tick's own move, px. */
export function sentinelThink(state: SimState, e: EnemyState, def: SentinelDef): [number, number] {
  const { strike } = def;
  const p = state.player;
  const idle = engage(state, e, inAggroBox(e, p));
  if (idle) return idle;
  if (e.mode === 'windup' && e.modeTicks < strike.windupTicks) return hold(e);
  const attack = stepAttack(e, def, () => undefined);
  if (attack) return attack;
  const home = leash(e, def);
  if (home) return home;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (canCall(state, e, def)) {
    startWindup(e, def, dx, dy);
    callStrike(state, e, p.x, p.y, strike.radius, strike.damage, strike.windupTicks, strike);
    state.events.sentinelCalls.push({ id: e.id, x: p.x, y: p.y, r: strike.radius });
    return [0, 0];
  }
  return keepDistance(def, def.keep, dx, dy);
}

/** Its cooldown ready, the player in its room within range along a clear line, and none of its circles still waiting. */
function canCall(state: SimState, e: EnemyState, def: SentinelDef): boolean {
  const p = state.player;
  if (e.cooldown > 0 || e.roomId !== state.roomId || Math.hypot(p.x - e.x, p.y - e.y) > def.strike.range) return false;
  if (state.strikes.some((s) => s.ownerId === e.id)) return false;
  return clearShot(roomById(e.roomId), e.x, e.y, p.x, p.y);
}
