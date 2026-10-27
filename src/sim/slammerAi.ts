import type { SlammerDef } from '../data/enemies';
import { engage, leash, mayStart, startWindup, stepAttack, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { damagePlayer } from './health';
import type { SimState } from './state';

// The Pylon Warden (009): aggros in range and chases; close in, it winds up a
// ground slam (the circle is the telegraph), slams everything inside its radius,
// then stands still recovering, which is the window to punish it.

/** Advances a Warden's mode and returns this tick's own move, px. */
export function slamThink(state: SimState, e: EnemyState, def: SlammerDef): [number, number] {
  const { slam } = def;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const idle = engage(state, e, Math.hypot(dx, dy) <= slam.aggroRange);
  if (idle) return idle;
  const attack = stepAttack(e, def, () => landSlam(state, e, def));
  if (attack) return attack;
  const home = leash(e, def);
  if (home) return home;
  if (Math.hypot(dx, dy) > slam.triggerRange) return toward(dx, dy, def);
  if (e.cooldown === 0 && mayStart(state, e)) startWindup(e, def, dx, dy);
  return [0, 0];
}

/** Hits the player if their feet are inside the slam's circle around the Warden's feet. */
function landSlam(state: SimState, e: EnemyState, def: SlammerDef): void {
  if (e.roomId !== state.roomId) return;
  const { slam } = def;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist > slam.radius) return;
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, slam.damage, kx, ky, slam.knockback, slam.knockTicks);
}
