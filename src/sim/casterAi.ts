import type { CasterDef } from '../data/enemies';
import { engage, inAggroBox, leash, startWindup, stepAttack, toward } from './aiCommon';
import type { EnemyState } from './enemies';
import { castOrb } from './orbs';
import type { SimState } from './state';

// The Wisp (009): aggros on screen (045; in range before), floats to its preferred distance (backing off
// when the player crowds it), charges with its aim locked, then casts a slow orb.

/** Advances a Wisp's mode and returns this tick's own move, px. */
export function castThink(state: SimState, e: EnemyState, def: CasterDef): [number, number] {
  const { cast } = def;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const dist = Math.hypot(dx, dy);
  // 045: on screen, like every other enemy (017).
  const idle = engage(state, e, inAggroBox(e, state.player));
  if (idle) return idle;
  const attack = stepAttack(e, def, () => castOrb(state, e));
  if (attack) return attack;
  const home = leash(e, def);
  if (home) return home;
  if (dist < cast.backOff) return toward(-dx, -dy, def);
  if (dist > cast.aggroRange) return toward(dx, dy, def);
  if (e.cooldown === 0) {
    startWindup(e, def, dx, dy);
    return [0, 0];
  }
  // Drift toward the preferred distance while the cooldown runs.
  const off = dist - cast.keepAway;
  if (Math.abs(off) < cast.settle) return [0, 0];
  // A whole step toward or away, but never past the preferred distance (the player is past `backOff`, so dist > 0).
  const [sx, sy] = toward(dx, dy, def);
  const scale = Math.min(1, Math.abs(off) / Math.hypot(sx, sy)) * Math.sign(off);
  return [sx * scale, sy * scale];
}
