import type { ShardbackDef } from '../data/hollowsEnemies';
import { engage, inAggroBox, inArc, leash, mayStart, startWindup, stepAttack, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { damagePlayer } from './health';
import { turnToward } from './shield';
import type { SimState } from './state';

// The Shardback (035): a squat construct behind a crystal-studded shield plate, the
// Bulwark's little cousin, sharing its shield rule (034): straight shots and punches into
// its front are blocked. It walks at the player turning its shield (faster than the
// Bulwark, slowly enough to run round), and up close winds up a short bash along its
// shield, still turning; through the recovery it stops turning, the window to get behind it.

/** Advances a Shardback's mode and returns this tick's own move, px. */
export function shardThink(state: SimState, e: EnemyState, def: ShardbackDef): [number, number] {
  const p = state.player;
  const idle = engage(state, e, inAggroBox(e, p));
  if (idle) {
    if (e.mode === 'return') turnToward(e, e.homeX, e.homeY);
    return idle;
  }
  // It keeps turning through the wind-up; the bash and the recovery hold their angle.
  if (e.mode === 'windup') turnToward(e, p.x, p.y);
  const attack = stepAttack(e, def, () => bash(state, e, def));
  if (attack) return attack;
  const home = leash(e, def);
  if (home) {
    turnToward(e, e.homeX, e.homeY);
    return home;
  }
  turnToward(e, p.x, p.y);
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (Math.hypot(dx, dy) > def.bash.triggerRange) return toward(dx, dy, def);
  if (e.cooldown === 0 && mayStart(state, e)) startWindup(e, def, dx, dy);
  return [0, 0];
}

/** Hits the player if their feet are within reach and inside the arc along its shield's facing, pushing them away. */
function bash(state: SimState, e: EnemyState, def: ShardbackDef): void {
  if (e.roomId !== state.roomId) return;
  const { bash: b } = def;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  if (!inArc(dx, dy, Math.cos(e.angle), Math.sin(e.angle), b.reach, b.arcDegrees)) return;
  const dist = Math.hypot(dx, dy);
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [Math.cos(e.angle), Math.sin(e.angle)];
  damagePlayer(state, b.damage, kx, ky, b.knockback, b.knockTicks);
}
