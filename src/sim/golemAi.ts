import type { GolemDef } from '../data/emberworksEnemies';
import { engage, inAggroBox, leash, mayStart, startWindup, stepAttack, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { damagePlayer } from './health';
import type { SimState } from './state';

// The slag golem (061): a hunched lump of cooling slag with a glowing core. Aggroed, it walks slowly at the player;
// with their feet within its trigger and its cooldown ready, it winds up a red circle in front of it, locked where it
// faces as the wind-up starts (`spotX`, `spotY`), then slams it and recovers. Its split into whelps as it dies is in
// emberDeaths.ts; a whelp is the Husk's kind (enemyAi.ts).

/** Advances a golem's mode and returns this tick's own move, px. */
export function golemThink(state: SimState, e: EnemyState, def: GolemDef): [number, number] {
  const { slam } = def;
  const idle = engage(state, e, inAggroBox(e, state.player));
  if (idle) return idle;
  const attack = stepAttack(e, def, () => landSlam(state, e, def));
  if (attack) return attack;
  const home = leash(e, def);
  if (home) return home;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  if (e.roomId !== state.roomId || Math.hypot(dx, dy) > slam.triggerRange) return toward(dx, dy, def);
  if (e.cooldown === 0 && mayStart(state, e)) {
    startWindup(e, def, dx, dy);
    e.spotX = e.x + e.swipeDirX * slam.ahead;
    e.spotY = e.y + e.swipeDirY * slam.ahead;
  }
  return [0, 0];
}

/** The slam lands on the locked circle: damage and knockback out from its centre on feet inside. */
function landSlam(state: SimState, e: EnemyState, def: GolemDef): void {
  const { slam } = def;
  state.events.golemSlams.push({ id: e.id, x: e.spotX, y: e.spotY, radius: slam.radius });
  if (e.roomId !== state.roomId) return;
  const dx = state.player.x - e.spotX;
  const dy = state.player.y - e.spotY;
  const dist = Math.hypot(dx, dy);
  if (dist > slam.radius) return;
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, slam.damage, kx, ky, slam.knockback, slam.knockTicks);
}

/** The slam's circle while it winds up (061: getState's), else null. */
export const slamShown = (e: Pick<EnemyState, 'mode' | 'spotX' | 'spotY'>, def: GolemDef): { x: number; y: number; radius: number } | null =>
  e.mode === 'windup' ? { x: e.spotX, y: e.spotY, radius: def.slam.radius } : null;
